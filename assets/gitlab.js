var gitlab = {};
gitlab.apiUrl = null;
gitlab.groupId = null;
gitlab.token = null;
gitlab.monitoredProjects = null;
gitlab.typeLabel = null;
gitlab.priorityLabel = null;
gitlab.milestones = null;
gitlab.excludeTypeLabels = [];
gitlab.excludePriorityLabels = [];

gitlab.request = function (method, endpoint, callback, body, options) {
    var opts = options || {};
    var normalizedGitlabUrl = gitlab.apiUrl.endsWith("/") ? gitlab.apiUrl.slice(0, -1) : gitlab.apiUrl;
    var normalizedGroup = gitlab.groupId && !opts.groupless ? "/groups/" + gitlab.groupId : "";
    var normalizedEndpoint = endpoint.startsWith("/") ? endpoint : "/" + endpoint;
    var url = normalizedGitlabUrl + normalizedGroup + normalizedEndpoint;

    var xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    xhr.setRequestHeader("Private-Token", gitlab.token);
    if (body) {
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.send(JSON.stringify(body));
    } else {
        xhr.send();
    }

    xhr.onreadystatechange = function () {
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

gitlab.request.labels = function (callback) {
    gitlab.request('GET', "labels?per_page=50000", callback);
}

gitlab.request.milestones = function (callback) {
    gitlab.request('GET', "milestones?state=active&per_page=50000", callback);
    // callback([
    //     { "title": "January 2021 Release", "id": 1 },
    //     { "title": "February 2021 Release", "id": 2 },
    //     { "title": "March 2021 Release", "id": 3 },
    //     { "title": "April 2021 Release", "id": 4 },
    // ]);
}

gitlab.request.issues = function (ticketId, callback) {
    gitlab.request('GET', `issues?labels=Zendesk:${ticketId}`, callback);
}

gitlab.request.issues.searchByID = function (projectId, ticketId, callback) {
    if(!projectId){
        gitlab.request('GET', `issues?iids[]=${ticketId}`, callback);
    } else {
        gitlab.request('GET', `projects/${projectId}/issues?iids[]=${ticketId}`, callback, null, {groupless: true});
    }
}

gitlab.request.issues.search = function (search, callback) {
    gitlab.request('GET', `issues?per_page=50000&search=${search}`, callback);
}

gitlab.request.issues.new = function (projectId, params, callback) {
    gitlab.request('POST', `projects/${projectId}/issues`, callback, params, {groupless:true});
}

gitlab.request.issues.edit = function (iid, projectId, changes, callback) {
    gitlab.request('PUT', `projects/${projectId}/issues/${iid}`, callback, changes, { groupless: true });
}

gitlab.request.projects = function (callback) {
    gitlab.request('GET', "projects?include_subgroups=true&per_page=50000", callback);
}