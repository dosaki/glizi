class Gitlab {
    constructor() {
        apiUrl = null;
        groupId = null;
        token = null;
        monitoredProjects = null;
        typeLabel = null;
        priorityLabel = null;
        milestones = null;
        excludeTypeLabels = [];
        excludePriorityLabels = [];
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
                        callback(JSON.parse(xhr.responseText));
                    }
                } else {
                    console.error("Something went wrong.");
                }
            }
        };
    }

    fetchLabels(callback) {
        this._request('GET', "labels?per_page=50000", callback);
    }

    fetchMilestones(callback) {
        this._request('GET', "milestones?state=active&per_page=50000", callback);
    }

    fetchIssues(ticketId, callback) {
        this._request('GET', `issues?labels=Zendesk:${ticketId}`, callback);
    }

    searchIssueByID(projectId, ticketId, callback) {
        if (!projectId) {
            this._request('GET', `issues?iids[]=${ticketId}`, callback);
        } else {
            this._request('GET', `projects/${projectId}/issues?iids[]=${ticketId}`, callback, null, { groupless: true });
        }
    }

    searchIssues(search, callback) {
        this._request('GET', `issues?per_page=50000&search=${search}`, callback);
    }

    newIssue(projectId, params, callback) {
        this._request('POST', `projects/${projectId}/issues`, callback, params, { groupless: true });
    }

    editIssue(iid, projectId, changes, callback) {
        this._request('PUT', `projects/${projectId}/issues/${iid}`, callback, changes, { groupless: true });
    }

    fetchProjects(callback) {
        this._request('GET', "projects?include_subgroups=true&per_page=50000", callback);
    }
}


module.exports = new Gitlab();