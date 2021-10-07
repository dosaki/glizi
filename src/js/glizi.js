const gitlab = require('./gitlab');
const textFormatter = require('./text-formatter');

class Glizi {
    constructor() {
        this.modules = null;
        this.issueTypes = null;
        this.sprints = [];
        this.client = null;

        this.eventHandlers = {
            search: (searchText, element) => {
                element.innerHTML = "Searching..."
                if (this.isSearchingByID(searchText)) {
                    const projectIssuePair = this.splitProjectIssuePair(searchText);
                    gitlab.searchIssueByID(projectIssuePair.projectId, projectIssuePair.id, (issues) => {
                        this.displayIssues(element, issues);
                    });
                } else {
                    gitlab.searchIssues(searchText, (issues) => {
                        this.displayIssues(element, issues);
                    });
                }
            }
        }
        this.issueSearchCache = {};
    }

    filterProjects(rawProjects, included, excluded) {
        const excludedIds = excluded ? excluded.split(",") : [];
        const includedProjectsSplit = included ? included.split(",") : [];
        const includedProjects = {};
        for (let i = 0; i < includedProjectsSplit.length; i++) {
            const splitProject = includedProjectsSplit[i].split(":");
            includedProjects[String(splitProject[0])] = splitProject[1];
        }
        const includedIds = Object.keys(includedProjects);

        return rawProjects.filter(proj => includedIds.includes(String(proj.id)) && !excludedIds.includes(String(proj.id)))
            .reduce((monitoredProjects, project) => {
                monitoredProjects[String(project.id)] = project;
                monitoredProjects[String(project.id)]._prettyName = includedProjects[String(project.id)] || project.name;
                return monitoredProjects;
            }, {});
    }


    init(client, callback) {
        this.client = client;
        client.metadata().then((metadata) => {
            client.context().then((context) => {
                this.client._context = context;
                gitlab.apiUrl = metadata.settings.gitlabApiUrl;
                gitlab.token = metadata.settings.gitlabToken;
                gitlab.groupId = metadata.settings.gitlabGroupId || null;
                gitlab.typeLabel = metadata.settings.gitlabTypeLabel || "Type::";
                gitlab.priorityLabel = metadata.settings.gitlabPriorityLabel || "Priority::";
                gitlab.excludeTypeLabels = metadata.settings.gitlabExcludeTypeLabels ? metadata.settings.gitlabExcludeTypeLabels.split(",") : [];
                gitlab.excludePriorityLabels = metadata.settings.gitlabExcludePriorityLabels ? metadata.settings.gitlabExcludePriorityLabels.split(",") : [];
                gitlab.priorityOrder = metadata.settings.gitlabPriorityOrder ? metadata.settings.gitlabPriorityOrder.split(",") : [];
                gitlab.fetchProjects((rawProjects) => {
                    gitlab.monitoredProjects = this.filterProjects(rawProjects, metadata.settings.gitlabIncludeProjects, metadata.settings.gitlabExcludeProjects);
                    this.modules = Object.values(gitlab.monitoredProjects).map(proj => proj._prettyName);
                    gitlab.fetchLabels((data) => {
                        gitlab.labels = data.map(label => label.name);
                        this.issueTypes = gitlab.labels
                            .filter(label => label.startsWith(gitlab.typeLabel))
                            .map(prop => prop.replace(gitlab.typeLabel, ""))
                            .filter(label => !gitlab.excludeTypeLabels.includes(label));
                        this.issuePriorities = gitlab.labels
                            .filter(label => label.startsWith(gitlab.priorityLabel))
                            .map(prop => prop.replace(gitlab.priorityLabel, ""))
                            .filter(label => !gitlab.excludePriorityLabels.includes(label))
                            .sort((a, b) => {
                                let aPos = gitlab.priorityOrder.indexOf(a);
                                aPos = aPos === -1 ? Number.POSITIVE_INFINITY : aPos;
                                let bPos = gitlab.priorityOrder.indexOf(b);
                                bPos = bPos === -1 ? Number.POSITIVE_INFINITY : bPos;
                                if (aPos < bPos) {
                                    return -1;
                                }
                                if (aPos > bPos) {
                                    return 1;
                                }
                                return 0;
                            });
                        gitlab.fetchMilestones((data) => {
                            gitlab.milestones = data;
                            this.sprints = ["", ...data.map(milestone => `${milestone.title} (${milestone.id})`)];
                            callback(context, metadata);
                        });
                    });
                });
            });
        });
    }

    asTicketParams(ticket) {
        return this.jsonToParams({
            "id": ticket.id,
            "subject": ticket.subject
        });
    }

    convertParams() {
        const paramsObj = {};
        const params = decodeURIComponent(window.location.search)
            .replace('?', '')
            .split('&');
        for (let i = 0; i < params.length; i++) {
            const splitParam = params[i].split('=');
            paramsObj[splitParam[0]] = splitParam[1];
        }

        return paramsObj;
    }

    jsonToParams(json) {
        return Object.keys(json).map(key => `${key}=${encodeURIComponent(json[key])}`).join("&");
    }

    isMonitoredProject(projectId) {
        return Object.keys(gitlab.monitoredProjects).includes(String(projectId));
    }

    editableField(field, value, extraClasses) {
        const div = document.createElement('div');
        const additionalClasses = extraClasses || [];
        div.className = ["field-value", "editable", ...additionalClasses].join(" ");

        const valueElem = document.createElement('input');
        valueElem.className = "value";
        valueElem.setAttribute("glizi-value", field.toLowerCase());
        valueElem.setAttribute("placeholder", field);
        valueElem.value = value;

        div.append(valueElem);

        return div;
    }

    editableDropdownField(field, values, extraClasses, chosenValue) {
        const div = document.createElement('div');
        const additionalClasses = extraClasses || [];
        div.className = ["field-value", "editable", ...additionalClasses].join(" ");

        const valueElem = document.createElement('select');
        valueElem.className = "value";
        valueElem.setAttribute("glizi-value", field.toLowerCase());

        const defaultOptionElem = document.createElement('option');
        defaultOptionElem.value = "";
        defaultOptionElem.innerHTML = `${field}...`;
        valueElem.append(defaultOptionElem);

        for (let i = 0; i < values.length; i++) {
            const optionElem = document.createElement('option');
            optionElem.value = values[i];
            optionElem.innerHTML = values[i];
            valueElem.append(optionElem);
        }
        valueElem.value = chosenValue || "";

        div.append(valueElem);

        return div;
    }

    toggleCollapsibleValueElement(valueElem, shortValueElem) {
        if (valueElem.className.includes("hidden")) {
            valueElem.className = valueElem.className.replace("hidden", "");
            shortValueElem.innerHTML = " ";
        } else {
            valueElem.className = valueElem.className + "hidden";
            shortValueElem.innerHTML = "View";
        }
    }

    newButton(text, classNames, fn) {
        const btn = document.createElement('button');
        btn.className = classNames;
        btn.innerHTML = text;
        btn.setAttribute("collapsed-value", "");
        btn.addEventListener("click", (e) => {
            fn(e, btn);
        });
        return btn;
    }

    newValueElement(field, value, extraClasses, options) {
        const opts = options || {};
        const collapsable = opts.collapsable || false;
        const showField = opts.showField || false;
        const div = document.createElement('div');
        const additionalClasses = extraClasses || [];
        div.className = ["field-value", ...additionalClasses].join(" ");
        if (collapsable) {
            div.setAttribute("collapsed", "true");
        }

        if (showField) {
            const fieldElem = document.createElement('span');
            fieldElem.className = "field";
            fieldElem.innerHTML = `${field}:`;
        }

        const valueElem = document.createElement('span');
        valueElem.className = collapsable ? "value hidden" : "value";
        valueElem.innerHTML = value;
        valueElem.setAttribute('field', field);
        if (collapsable) {
            valueElem.setAttribute("uncollapsed-value", "");
        }

        if (collapsable) {
            const shortValueElem = this.newButton("View", "primary value", (e, elem) => {
                this.toggleCollapsibleValueElement(valueElem, elem);
            });
            fieldElem.addEventListener("click", () => {
                this.toggleCollapsibleValueElement(valueElem, shortValueElem);
            });
        }

        if (showField) {
            div.append(fieldElem);
        }

        if (collapsable) {
            div.append(shortValueElem);
        }
        div.append(valueElem);

        return div;
    }

    link(text, url, className) {
        const link = document.createElement('a');
        link.className = className || "issue-link";
        link.innerHTML = text;
        link.href = url;
        link.setAttribute('target', '_blank');
        return link;
    }

    issueHeader(issue, zendeskId) {
        const div = document.createElement('div');
        div.className = "issue-header";
        div.append(this.link(this.issueCode(issue), issue["web_url"], 'issue-header-link'));


        const spacer = document.createElement("div");
        spacer.className = "flex-spacer";
        div.append(spacer);

        if (zendeskId) {
            const unlinkButton = this.newButton(`<svg xmlns:cc="http://creativecommons.org/ns#" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:svg="http://www.w3.org/2000/svg" xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="20" height="20" viewBox="0 0 20 20">
            <g>
            <path d="M 4.7116534,0 C 3.8888351,0 3.0624791,0.31121019 2.4410335,0.93264055 L 0.93216867,2.4414679 c -1.24289156,1.2428606 -1.24289156,3.2933839 0,4.5362445 L 5.4636432,11.513957 c 0.5627102,0.562696 1.2927714,0.850736 2.0362333,0.903342 V 10.278574 C 7.3121147,10.233925 7.1301632,10.153018 6.9773906,10.000247 L 2.4410335,5.4640026 c -0.4317264,-0.4317158 -0.4317264,-1.0771117 0,-1.5088273 L 3.9547783,2.4414679 c 0.4317267,-0.4317158 1.0771383,-0.4317158 1.5088649,0 L 10,6.9777124 c 0.152782,0.152778 0.233687,0.3347158 0.278334,0.522473 h 2.138779 C 12.36451,6.756742 12.076458,6.026699 11.513748,5.4640026 L 6.9773906,0.93264055 C 6.3559446,0.31121019 5.5344716,0 4.7116534,0 Z m 7.7884706,7.583195 v 2.1387253 c 0.18776,0.044652 0.369713,0.125554 0.522488,0.2783267 l 4.536358,4.536245 c 0.431726,0.431716 0.431726,1.077112 0,1.508827 l -1.513748,1.513707 c -0.431726,0.431716 -1.077138,0.431716 -1.508864,0 L 10,13.022782 C 9.8472277,12.870013 9.7663163,12.688066 9.7216665,12.500309 H 7.5828881 c 0.052602,0.743443 0.3406544,1.473486 0.9033646,2.036183 l 4.5363593,4.531362 c 1.242892,1.242861 3.293466,1.242861 4.536358,0 l 1.508862,-1.508828 c 1.242891,-1.24286 1.242891,-3.293383 0,-4.536244 L 14.536358,8.4865373 C 13.973647,7.923841 13.243586,7.6358012 12.500124,7.583195 Z" />
            <path d="M 14,6 18,2"/>
            <path d="M 12,5 V 0"/>
            <path d="m 15,8 h 5"/>
            <path d="M 6,14 2,18"/>
            <path d="m 8,15 v 5"/>
            <path d="M 5,12 H 0"/>
            </g>
        </svg>`, "primary", () => {
                this.unlinkIssues(zendeskId, this.issueCode(issue));
            });
            div.append(unlinkButton);
        }

        const editButton = this.newButton("&#9998;", "primary", () => {
            client.invoke('instances.create', {
                location: 'modal',
                url: `assets/issue-details.html?parentId=${client._context.instanceGuid}`
            }).then(() => {
                client.on('child-initialized', (childClientGuid) => {
                    const childClient = client.instance(childClientGuid);
                    childClient.trigger('got-issue-info', issue);
                });
            });
        });
        div.append(editButton);

        return div;
    }

    issueCode(issue) {
        return `${gitlab.monitoredProjects[String(issue["project_id"])]["_prettyName"]}#${issue.iid}`
    }

    labelsAsProperties(labels) {
        const properties = {
            "Type": "Not set",
            "Priority": "Not Set",
            "Roadmap Item": false,
            "Status": "Open",
            "Linked": [],
        }
        labels.forEach((label) => {
            const key = label;
            const value = true;
            if (label.includes("::")) {
                const key = label.split("::")[0];
                const value = label.split("::")[1];
            } else if (label.includes(":")) {
                const key = label.split(":")[0];
                const value = label.split(":")[1];
            }
            if (key === "Zendesk") {
                key = "Linked"
                value = `<a class="zendesk-link" target="_blank" href="https://panintelligencesupport.zendesk.com/agent/tickets/${value}">#${value}</a>`
            }
            if (Object.keys(properties).includes(key)) {
                if (Array.isArray(properties[key])) {
                    properties[key].push(value);
                } else {
                    properties[key] = value;
                }
            }
        }, {});
        return properties;
    }

    issueAsElement(issue, zendeskId) {
        const issueProperties = this.labelsAsProperties(issue["labels"]);
        const div = document.createElement('div');
        div.className = "issue";
        div.setAttribute("issue_code", this.issueCode(issue));
        div.append(this.issueHeader(issue, zendeskId));
        div.append(this.newValueElement("Title", issue.title, ["small", ""], { showField: false }));
        div.append(this.newValueElement("Assignees", issue.assignees.map(a => `<div class='assignee'>${a.name}</div>`).join(''), ["small"]));
        div.append(this.newValueElement("Sprint", `${issue.milestone.title} (${issue.milestone.id})`, ["small"]));
        Object.keys(issueProperties).forEach((prop) => {
            const value = Array.isArray(issueProperties[prop]) ? issueProperties[prop].join(" ") : issueProperties[prop];
            div.append(this.newValueElement(prop, value, ["small"]));
        });
        return div;
    }

    issueAsSearchOption(issue) {
        const div = document.createElement('div');
        div.className = "issue-small";

        const checkbox = document.createElement('input');
        checkbox.className = "result";
        checkbox.setAttribute('search-result', '');
        checkbox.type = "checkbox";
        div.append(checkbox);

        div.append(this.link(this.issueCode(issue), issue["web_url"]));

        const valueElem = document.createElement('span');
        valueElem.className = "value";
        valueElem.innerHTML = issue["title"];
        div.append(valueElem);

        return div;
    }

    gatherIssueData() {
        return [...document.querySelectorAll('[glizi-value]')].reduce((acc, el) => {
            acc[el.getAttribute('glizi-value')] = el.value;
            return acc;
        }, {});
    }

    prepareForSending(params) {
        const issue = this.gatherIssueData();
        const project = Object.values(gitlab.monitoredProjects).find(proj => proj._prettyName === issue.project);
        const milestone = gitlab.milestones.find(milestone => `${milestone.title} (${milestone.id})` == issue.sprint);
        issue.projectId = project.id;
        if (milestone) {
            issue.milestoneId = milestone.id;
        }
        issue.paramString = this.jsonToParams(issue);
        issue.zendeskId = params.id;
        return issue;
    }

    makeZendeskMarkdownLink(zendeskId) {
        return `[Zendesk:${zendeskId}](${window.location.ancestorOrigins[0]}/agent/tickets/${zendeskId})`;
    }

    linkIssues(zendeskId, issueCodes, callback) {
        issueCodes.forEach((issueCode) => {
            const issue = this.issueSearchCache[issueCode];
            const dataToChange = {
                "add_labels": `Zendesk:${zendeskId}`
            };
            if (issue.description.includes("\n\n----\n\nLinked Zendesk tickets:")) {
                dataToChange.description = issue.description
                    .replace(
                        /\n\n----\n\nLinked Zendesk tickets:/,
                        `\n\n----\n\nLinked Zendesk tickets:\n* ${this.makeZendeskMarkdownLink(zendeskId)}`
                    );
            } else {
                dataToChange.description = `${issue.description}\n\n----\n\nLinked Zendesk tickets:\n* ${this.makeZendeskMarkdownLink(zendeskId)}`;
            }
            gitlab.editIssue(issue.iid, issue.project_id, dataToChange, (data) => {
                this.issueSearchCache[issueCode] = data;
                callback(data);
            });
        });
    }

    unlinkIssues(zendeskId, issueCode) {
        const projectIssuePair = this.splitProjectIssuePair(issueCode);
        gitlab.searchIssueByID(projectIssuePair.projectId, projectIssuePair.id, (issues) => {
            const issue = issues[0];
            if (issue) {
                const dataToChange = {
                    "remove_labels": `Zendesk:${zendeskId}`
                };
                dataToChange.description = issue.description.replace(`\n* ${this.makeZendeskMarkdownLink(zendeskId)}`, "");
                gitlab.editIssue(issue.iid, issue.project_id, dataToChange, (data) => {
                    issueSearchCache[issueCode] = data;
                    document.querySelector(`[issue_code="${issueCode}"]`).remove();
                });
            } else {
                console.error(`No issue found in gitlab for ${issueCode}.`)
            }
        });
    }

    newIssue(issueDetails, callback) {
        gitlab.newIssue(issueDetails.projectId, {
            "title": issueDetails.title,
            "milestone_id": issueDetails.milestoneId || 0,
            "description": issueDetails.description + `\n\n----\n\nLinked Zendesk tickets:\n* ${this.makeZendeskMarkdownLink(issueDetails.zendeskId)}`,
            "add_labels": `Priority::${issueDetails.priority},Type::${issueDetails.type},Zendesk:${issueDetails.zendeskId}`
        }, callback);
    }

    isSearchingByID(searchText) {
        return searchText.includes("#");
    }

    splitProjectIssuePair(searchText) {
        const splitSearch = searchText.split("#");
        if (splitSearch.length < 2) {
            return {};
        }
        const projectPrettyName = splitSearch[0];
        const project = Object.values(gitlab.monitoredProjects).find((p) => {
            return p._prettyName.toLowerCase() == projectPrettyName.toLowerCase();
        });
        const issueIID = splitSearch[1];

        return {
            projectId: project ? project.id : null,
            id: issueIID
        };
    }

    displayIssues(element, issues) {
        element.innerHTML = "";
        issues.forEach((issue) => {
            if (this.isMonitoredProject(issue["project_id"])) {
                this.issueSearchCache[this.issueCode(issue)] = issue;
                element.append(this.issueAsSearchOption(issue));
            }
        });
    }
}

module.exports = new Glizi();