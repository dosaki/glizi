const gitlab = require('./gitlab');
const textFormatter = require('./text-formatter');

const glizi = {};
glizi.modules = null;
glizi.issueTypes = null;
glizi.sprints = [];

glizi.filterProjects = function (rawProjects, included, excluded) {
    var excludedIds = excluded ? excluded.split(",") : [];
    var includedProjectsSplit = included ? included.split(",") : [];
    var includedProjects = {};
    for (var i = 0; i < includedProjectsSplit.length; i++) {
        var splitProject = includedProjectsSplit[i].split(":");
        includedProjects[String(splitProject[0])] = splitProject[1];
    }
    var includedIds = Object.keys(includedProjects);

    return rawProjects.filter(proj => includedIds.includes(String(proj.id)) && !excludedIds.includes(String(proj.id)))
        .reduce((monitoredProjects, project) => {
            monitoredProjects[String(project.id)] = project;
            monitoredProjects[String(project.id)]._prettyName = includedProjects[String(project.id)] || project.name;
            return monitoredProjects;
        }, {});
}


glizi.init = function (client, callback) {
    glizi.client = client;
    client.metadata().then(function (metadata) {
        client.context().then((context) => {
            glizi.client._context = context;
            gitlab.apiUrl = metadata.settings.gitlabApiUrl;
            gitlab.token = metadata.settings.gitlabToken;
            gitlab.groupId = metadata.settings.gitlabGroupId || null;
            gitlab.typeLabel = metadata.settings.gitlabTypeLabel || "Type::";
            gitlab.priorityLabel = metadata.settings.gitlabPriorityLabel || "Priority::";
            gitlab.excludeTypeLabels = metadata.settings.gitlabExcludeTypeLabels ? metadata.settings.gitlabExcludeTypeLabels.split(",") : [];
            gitlab.excludePriorityLabels = metadata.settings.gitlabExcludePriorityLabels ? metadata.settings.gitlabExcludePriorityLabels.split(",") : [];
            gitlab.priorityOrder = metadata.settings.gitlabPriorityOrder ? metadata.settings.gitlabPriorityOrder.split(",") : [];
            gitlab.request.projects(function (rawProjects) {
                gitlab.monitoredProjects = glizi.filterProjects(rawProjects, metadata.settings.gitlabIncludeProjects, metadata.settings.gitlabExcludeProjects);
                glizi.modules = Object.values(gitlab.monitoredProjects).map(proj => proj._prettyName);
                gitlab.request.labels(function (data) {
                    gitlab.labels = data.map(label => label.name);
                    glizi.issueTypes = gitlab.labels
                        .filter(label => label.startsWith(gitlab.typeLabel))
                        .map(prop => prop.replace(gitlab.typeLabel, ""))
                        .filter(label => !gitlab.excludeTypeLabels.includes(label));
                    glizi.issuePriorities = gitlab.labels
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
                    gitlab.request.milestones(function (data) {
                        gitlab.milestones = data;
                        glizi.sprints = ["", ...data.map(milestone => `${milestone.title} (${milestone.id})`)];
                        callback(context, metadata);
                    });
                });
            });
        });
    });
}

glizi.asTicketParams = function (ticket) {
    return glizi.jsonToParams({
        "id": ticket.id,
        "subject": ticket.subject
    });
}

glizi.convertParams = function () {
    var paramsObj = {};
    var params = decodeURIComponent(window.location.search)
        .replace('?', '')
        .split('&');
    for (var i = 0; i < params.length; i++) {
        var splitParam = params[i].split('=');
        paramsObj[splitParam[0]] = splitParam[1];
    }

    return paramsObj;
}

glizi.jsonToParams = function (json) {
    return Object.keys(json).map(key => `${key}=${encodeURIComponent(json[key])}`).join("&");
}

glizi.isMonitoredProject = function (projectId) {
    return Object.keys(gitlab.monitoredProjects).includes(String(projectId));
}

glizi.newDropdownValueElement = function (field, values, extraClasses) {
    var div = document.createElement('div');
    var additionalClasses = extraClasses || [];
    div.className = ["field-value", ...additionalClasses].join(" ");

    var fieldElem = document.createElement('span');
    fieldElem.className = "field";
    fieldElem.innerHTML = field;

    var valueElem = document.createElement('select');
    valueElem.className = "value";
    valueElem.setAttribute("glizi-value", field.toLowerCase());
    for (var i = 0; i < values.length; i++) {
        var optionElem = document.createElement('option');
        optionElem.innerHTML = values[i];
        valueElem.append(optionElem);
    }

    div.append(fieldElem);
    div.append(valueElem);

    return div;
}

glizi.newInputValueElement = function (field, value, extraClasses) {
    var div = document.createElement('div');
    var additionalClasses = extraClasses || [];
    div.className = ["field-value", ...additionalClasses].join(" ");

    var fieldElem = document.createElement('span');
    fieldElem.className = "field";
    fieldElem.innerHTML = field;

    var valueElem = document.createElement('input');
    valueElem.className = "value";
    valueElem.setAttribute("glizi-value", field.toLowerCase());
    valueElem.value = value;

    div.append(fieldElem);
    div.append(valueElem);

    return div;
}

glizi.editableField = function(field, value, extraClasses) {
    var div = document.createElement('div');
    var additionalClasses = extraClasses || [];
    div.className = ["field-value", ...additionalClasses].join(" ");

    var valueElem = document.createElement('input');
    valueElem.className = "value";
    valueElem.setAttribute("glizi-value", field.toLowerCase());
    valueElem.setAttribute("placeholder", field);
    valueElem.value = value;
    
    div.append(valueElem);

    return div;
}

glizi.editableDropdownField = function(field, values, extraClasses, chosenValue) {
    var div = document.createElement('div');
    var additionalClasses = extraClasses || [];
    div.className = ["field-value", ...additionalClasses].join(" ");

    var valueElem = document.createElement('select');
    valueElem.className = "value";
    valueElem.setAttribute("glizi-value", field.toLowerCase());
    
    var optionElem = document.createElement('option');
    optionElem.innerHTML = values[i];
    valueElem.append(`${field}...`);

    for (var i = 0; i < values.length; i++) {
        var optionElem = document.createElement('option');
        optionElem.innerHTML = values[i];
        valueElem.append(optionElem);
    }
    valueElem.value = chosenValue;

    div.append(valueElem);

    return div;
}

glizi.toggleCollapsibleValueElement = function (valueElem, shortValueElem) {
    if (valueElem.className.includes("hidden")) {
        valueElem.className = valueElem.className.replace("hidden", "");
        shortValueElem.innerHTML = " ";
    } else {
        valueElem.className = valueElem.className + "hidden";
        shortValueElem.innerHTML = "View";
    }
}

glizi.newButton = function(text, classNames, fn) {
    var btn = document.createElement('button');
    btn.className = classNames;
    btn.innerHTML = text;
    btn.setAttribute("collapsed-value", "");
    btn.addEventListener("click", (e) => {
        fn(e, btn);
    });
    return btn;
}

glizi.newValueElement = function (field, value, extraClasses, collapsable) {
    var div = document.createElement('div');
    var additionalClasses = extraClasses || [];
    div.className = ["field-value", ...additionalClasses].join(" ");
    if (collapsable) {
        div.setAttribute("collapsed", "true");
    }

    var fieldElem = document.createElement('span');
    fieldElem.className = "field";
    fieldElem.innerHTML = field;


    var valueElem = document.createElement('span');
    valueElem.className = collapsable ? "value hidden" : "value";
    valueElem.innerHTML = value;
    if (collapsable) {
        valueElem.setAttribute("uncollapsed-value", "");
    }

    if (collapsable) {
        var shortValueElem = glizi.newButton("View", "primary value", (e, elem) => {
            glizi.toggleCollapsibleValueElement(valueElem, elem);
        });
        fieldElem.addEventListener("click", () => {
            glizi.toggleCollapsibleValueElement(valueElem, shortValueElem);
        });
    }

    div.append(fieldElem);

    if (collapsable) {
        div.append(shortValueElem);
    }
    div.append(valueElem);

    return div;
}

glizi.link = function (text, url, className) {
    var link = document.createElement('a');
    link.className = className || "issue-header-link";
    link.innerHTML = text;
    link.href = url;
    return link;
}

glizi.issueHeader = function (issue, zendeskId) {
    var div = document.createElement('div');
    div.className = "issue-header";
    div.append(glizi.link(glizi.issueCode(issue), issue["web_url"]));
    
    if (zendeskId) {
        var unlinkButton = glizi.link("unlink", "javascript:void(0)", "unlink-link");
        unlinkButton.addEventListener("click", () => {
            glizi.unlinkIssues(zendeskId, glizi.issueCode(issue));
        });
        div.append(unlinkButton);
    }
    var spacer = document.createElement("div");
    spacer.className = "flex-spacer";
    div.append(spacer);
    var editButton = glizi.newButton("✐", "primary", () => {
        client.invoke('instances.create', {
            location: 'modal',
            url: `assets/issue-details.html?parentId=${client._context.instanceGuid}`
        }).then((a,b,c,d) => {
            var editIssueClient = client.instance(client._context['instances.create'][0].instanceGuid);
            editIssueClient.trigger('got-issue-info', issue);
        });
    });
    div.append(editButton);

    return div;
}

glizi.issueCode = function (issue) {
    return `${gitlab.monitoredProjects[String(issue["project_id"])]["_prettyName"]}#${issue.iid}`
}

glizi.labelsAsProperties = function (labels) {
    var properties = {
        "Type": "Not set",
        "Priority": "Not Set",
        "Roadmap Item": false,
        "Status": "Open",
        "Linked": [],
    }
    labels.forEach((label) => {
        var key = label;
        var value = true;
        if (label.includes("::")) {
            var key = label.split("::")[0];
            var value = label.split("::")[1];
        } else if (label.includes(":")) {
            var key = label.split(":")[0];
            var value = label.split(":")[1];
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

glizi.issueAsElement = function (issue, zendeskId) {
    var issueProperties = glizi.labelsAsProperties(issue["labels"]);
    var div = document.createElement('div');
    div.className = "issue";
    div.setAttribute("issue_code", glizi.issueCode(issue));
    div.append(glizi.issueHeader(issue, zendeskId));
    div.append(glizi.newValueElement("Title:", issue.title, ["small"]));
    div.append(glizi.newValueElement("Description:", issue.description.replace(/\n/g, "<br/>"), ["small"], true));
    div.append(glizi.newValueElement("Assignees:", issue.assignees.map(a => `<div class='assignee'>${a.name}</div>`).join(''), ["small"]));
    div.append(glizi.newValueElement("Sprint:", `${issue.milestone.title} (${issue.milestone.id})`, ["small"]));
    Object.keys(issueProperties).forEach((prop) => {
        var value = Array.isArray(issueProperties[prop]) ? issueProperties[prop].join(" ") : issueProperties[prop];
        div.append(glizi.newValueElement(`${prop}:`, value, ["small"]));
    });
    return div;
}

glizi.issueAsSearchOption = function (issue) {
    var div = document.createElement('div');
    div.className = "issue-small";

    var checkbox = document.createElement('input');
    checkbox.className = "result";
    checkbox.setAttribute('search-result', '');
    checkbox.type = "checkbox";
    div.append(checkbox);

    div.append(glizi.link(glizi.issueCode(issue), issue["web_url"]));

    var valueElem = document.createElement('span');
    valueElem.className = "value";
    valueElem.innerHTML = issue["title"];
    div.append(valueElem);

    return div;
}

glizi.gatherIssueData = function () {
    return [...document.querySelectorAll('[glizi-value]')].reduce((acc, el) => {
        acc[el.getAttribute('glizi-value')] = el.value;
        return acc;
    }, {});
}

glizi.prepareForSending = function (params) {
    var issue = glizi.gatherIssueData();
    var project = Object.values(gitlab.monitoredProjects).find(proj => proj._prettyName === issue.project);
    var milestone = gitlab.milestones.find(milestone => `${milestone.title} (${milestone.id})` == issue.sprint);
    issue.projectId = project.id;
    if (milestone) {
        issue.milestoneId = milestone.id;
    }
    issue.paramString = glizi.jsonToParams(issue);
    issue.zendeskId = params.id;
    return issue;
}

glizi.makeZendeskMarkdownLink = function (zendeskId) {
    return `[Zendesk:${zendeskId}](${window.location.ancestorOrigins[0]}/agent/tickets/${zendeskId})`;
}

glizi.linkIssues = function (zendeskId, issueCodes, callback) {
    issueCodes.forEach((issueCode) => {
        var issue = glizi.issueSearchCache[issueCode];
        var dataToChange = {
            "add_labels": `Zendesk:${zendeskId}`
        };
        if (issue.description.includes("\n\n----\n\nLinked Zendesk tickets:")) {
            dataToChange.description = issue.description
                .replace(
                    /\n\n----\n\nLinked Zendesk tickets:/,
                    `\n\n----\n\nLinked Zendesk tickets:\n* ${glizi.makeZendeskMarkdownLink(zendeskId)}`
                );
        } else {
            dataToChange.description = `${issue.description}\n\n----\n\nLinked Zendesk tickets:\n* ${glizi.makeZendeskMarkdownLink(zendeskId)}`;
        }
        gitlab.request.issues.edit(issue.iid, issue.project_id, dataToChange, (data) => {
            glizi.issueSearchCache[issueCode] = data;
            callback(data);
        });
    });
}

glizi.unlinkIssues = function (zendeskId, issueCode) {
    var projectIssuePair = glizi.splitProjectIssuePair(issueCode);
    gitlab.request.issues.searchByID(projectIssuePair.projectId, projectIssuePair.id, (issues) => {
        var issue = issues[0];
        if (issue) {
            var dataToChange = {
                "remove_labels": `Zendesk:${zendeskId}`
            };
            dataToChange.description = issue.description.replace(`\n* ${glizi.makeZendeskMarkdownLink(zendeskId)}`,"");
            gitlab.request.issues.edit(issue.iid, issue.project_id, dataToChange, (data) => {
                glizi.issueSearchCache[issueCode] = data;
                document.querySelector(`[issue_code="${issueCode}"]`).remove();
            });
        } else {
            console.error(`No issue found in gitlab for ${issueCode}.`)
        }
    });
}

glizi.newIssue = function (issueDetails, callback) {
    gitlab.request.issues.new(issueDetails.projectId, {
        "title": issueDetails.title,
        "milestone_id": issueDetails.milestoneId || 0,
        "description": issueDetails.description + `\n\n----\n\nLinked Zendesk tickets:\n* ${glizi.makeZendeskMarkdownLink(issueDetails.zendeskId)}`,
        "add_labels": `Priority::${issueDetails.priority},Type::${issueDetails.type},Zendesk:${issueDetails.zendeskId}`
    }, callback);
}

glizi.isSearchingByID = function (searchText) {
    return searchText.includes("#");
}

glizi.splitProjectIssuePair = function (searchText) {
    var splitSearch = searchText.split("#");
    if (splitSearch.length < 2) {
        return {};
    }
    var projectPrettyName = splitSearch[0];
    var project = Object.values(gitlab.monitoredProjects).find((p) => {
        return p._prettyName.toLowerCase() == projectPrettyName.toLowerCase();
    });
    var issueIID = splitSearch[1];

    return {
        projectId: project ? project.id : null,
        id: issueIID
    };
}

glizi.displayIssues = function (element, issues) {
    element.innerHTML = "";
    issues.forEach((issue) => {
        if (glizi.isMonitoredProject(issue["project_id"])) {
            glizi.issueSearchCache[glizi.issueCode(issue)] = issue;
            element.append(glizi.issueAsSearchOption(issue));
        }
    });
}

glizi.eventHandlers = {};
glizi.issueSearchCache = {};
glizi.eventHandlers.search = function (searchText, element) {
    element.innerHTML = "Searching..."
    if (glizi.isSearchingByID(searchText)) {
        var projectIssuePair = glizi.splitProjectIssuePair(searchText);
        gitlab.request.issues.searchByID(projectIssuePair.projectId, projectIssuePair.id, (issues) => {
            glizi.displayIssues(element, issues);
        });
    } else {
        gitlab.request.issues.search(searchText, (issues) => {
            glizi.displayIssues(element, issues);
        });
    }
}

window.glizi = glizi;
window.gitlab = gitlab;
window.textFormatter = textFormatter;