class Gitlab {
    constructor() {
        this.apiUrl = null;
        this.groupId = null;
        this.token = null;
        this.monitoredProjects = null;
        this.typeLabel = null;
        this.priorityLabel = null;
        this.milestones = null;
        this.excludeTypeLabels = [];
        this.excludePriorityLabels = [];
    }

    _request(method, endpoint, callback, body, options) {
        const opts = options || {};
        const normalizedGitlabUrl = this.apiUrl.endsWith("/") ? this.apiUrl.slice(0, -1) : this.apiUrl;
        const normalizedGroup = this.groupId && !opts.groupless ? "/groups/" + this.groupId : "";
        const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : "/" + endpoint;
        const url = normalizedGitlabUrl + normalizedGroup + normalizedEndpoint;

        const xhr = new XMLHttpRequest();
        xhr.open(method, url, true);
        xhr.setRequestHeader("Private-Token", this.token);
        if (body) {
            xhr.setRequestHeader("Content-Type", "application/json");
            xhr.send(JSON.stringify(body));
        } else {
            xhr.send();
        }

        xhr.onreadystatechange = () => {
            if (xhr.readyState === XMLHttpRequest.DONE) {
                if (xhr.status >= 200 && xhr.status < 400) {
                    if (callback) {
                        callback(JSON.parse(xhr.responseText), xhr);
                    }
                } else {
                    console.error("Something went wrong.");
                }
            }
        };
    }

    _requestWithPagination(method, endpoint, callback, body, options, previousBody) {
        const prevBody = previousBody || [];
        this._request(method, endpoint, (jsonResponse, xhr) => {
            const newBody = [
                ...prevBody,
                ...jsonResponse
            ];
            const nextPage = xhr.getResponseHeader("X-Next-Page");
            if (nextPage) {
                const _endpoint = endpoint.includes("?") ? `${endpoint}&page=${nextPage}` : `${endpoint}?page=${nextPage}`;
                this._requestWithPagination(method, _endpoint, callback, body, options, newBody);
            } else if (callback) {
                callback(newBody, xhr);
            }
        }, body, options);
    }

    fetchLabels(callback) {
        this._requestWithPagination('GET', "labels?per_page=50000", callback);
    }

    fetchMilestones(callback) {
        this._requestWithPagination('GET', "milestones?state=active&per_page=50000", callback);
    }

    fetchIssues(ticketId, callback) {
        this._requestWithPagination('GET', `issues?labels=Zendesk:${ticketId}`, callback);
    }

    searchIssueByID(projectId, ticketId, callback) {
        if (!projectId) {
            this._requestWithPagination('GET', `issues?iids[]=${ticketId}`, callback);
        } else {
            this._requestWithPagination('GET', `projects/${projectId}/issues?iids[]=${ticketId}`, callback, null, { groupless: true });
        }
    }

    searchIssues(search, callback) {
        this._requestWithPagination('GET', `issues?per_page=50000&search=${search}`, callback);
    }

    newIssue(projectId, params, callback) {
        this._request('POST', `projects/${projectId}/issues`, callback, params, { groupless: true });
    }

    editIssue(iid, projectId, changes, callback) {
        this._request('PUT', `projects/${projectId}/issues/${iid}`, callback, changes, { groupless: true });
    }

    fetchProjects(callback) {
        this._requestWithPagination('GET', "projects?include_subgroups=true&per_page=100", callback);
    }
}


module.exports = new Gitlab();