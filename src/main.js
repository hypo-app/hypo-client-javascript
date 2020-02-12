
function getCookie(name) {
    let v = document.cookie.match('(^|;) ?' + name + '=([^;]*)(;|$)');
    return v ? v[2] : null;
}

function setCookie(name, value, hours) {
    let d = new Date();
    d.setTime(d.getTime() + 60 * 60 * 1000 * hours);
    let newCookie = name + "=" + value + ";path=/;expires=" + d.toGMTString();
    if (options.cookieDomain) {
        newCookie += ";domain=" + options.cookieDomain;
    }
    document.cookie = newCookie;
}

var VERSION = '0.0.1';
var options = {
    cookiePrefix: "hypo",
    baseUrl: "https://api.hypo.app",
    project: null,
    userIdCookieDurationHours: 24 * 365 * 2,
    groupAssignmentCookieDurationHours: 6,
    cookieDomain: null,
    requestTimeoutMs: 5000
}

function init(newOptions) {
    options = { ...options, ...newOptions };
}

function getUserId() {
    const userIdCookieName = options.cookiePrefix + "-uid";
    return getCookie(userIdCookieName);
}

function setUserId(userId) {
    const userIdCookieName = options.cookiePrefix + "-uid";
    setCookie(userIdCookieName, userId, options.userIdCookieDurationHours);
}

function getRequestHeaders() {
    return {
        'Content-Type': 'application/json',
        'X-Hypo-Client': 'js-web',
        'X-Hypo-Client-Version': VERSION,
    };
}

function getGroupAssignment(experimentId, forceRequest=false) {
    const experimentCookieName = options.cookiePrefix + "-eid-" + experimentId;
    const userIdCookieName = options.cookiePrefix + "-uid";
    let groupAssignment = getCookie(experimentCookieName);
    if (groupAssignment && !forceRequest) {
        return Promise.resolve(groupAssignment);
    }
    const userId = getUserId();
    let body = '{}';
    if (userId) {
        body = JSON.stringify({
            user: userId
        });
    }
    const url = `${options.baseUrl}/project/${options.project}/experiment/${experimentId}/group/assignment`;
    const headers = getRequestHeaders();
    return new Promise((resolve, reject) => {
        const req = new XMLHttpRequest();
        req.open('POST', url, true);
        req.timeout = options.requestTimeoutMs;
        Object.keys(headers).map((h) => req.setRequestHeader(h, headers[h]));
        req.onload = () => {
            if (req.status >= 200 && req.status < 300) {
                let jsonResponse = JSON.parse(req.responseText);
                if (jsonResponse.user) {
                    setCookie(userIdCookieName, jsonResponse.user, options.userIdCookieDurationHours);
                }
                setCookie(experimentCookieName, jsonResponse.group, options.groupAssignmentCookieDurationHours);
                resolve(jsonResponse.group);
            } else {
                reject(new Error(req.statusText));
            }
        };
        req.ontimeout = () => {
            reject(new Error("request timeout"));
        };
        req.onerror = () => {
            reject(new Error("unable to connect to hypo servers"));
        };
        req.onabort = () => {
            reject(new Error("request aborted"));
        };
        req.send(body);
    });
}

function event(eventId, revenue) {
    let userId = getUserId();
    const data = {
        user: userId,
        event: eventId
    };
    if (typeof revenue !== 'undefined' && revenue !== null) {
        data.revenue = revenue;
    }
    const url = `${options.baseUrl}/project/${options.project}/event`;
    const body = JSON.stringify(data);
    const headers = getRequestHeaders();
    return new Promise((resolve, reject) => {
        const req = new XMLHttpRequest();
        req.open('POST', url, true);
        req.timeout = options.requestTimeoutMs;
        Object.keys(headers).map((h) => req.setRequestHeader(h, headers[h]));
        req.onload = () => {
            if (req.status >= 200 && req.status < 300) {
                resolve();
            } else {
                reject(new Error(req.statusText));
            }
        };
        req.ontimeout = () => {
            reject(new Error("request timeout"));
        };
        req.onerror = () => {
            reject(new Error("unable to connect to hypo servers"));
        };
        req.onabort = () => {
            reject(new Error("request aborted"));
        };
        req.send(body);
    });
}

export {
    init,
    getUserId,
    setUserId,
    getGroupAssignment,
    event
};