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

// Source - https://stackoverflow.com/a/8809472
function generateUUID() { // Public Domain/MIT
    let d = new Date().getTime();//Timestamp
    let d2 = 0;
    if (typeof performance !== 'undefined') {
        d2 = (performance && performance.now && (performance.now() * 1000)) || 0;//Time in microseconds since page-load or 0 if unsupported
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        let r = Math.random() * 16;//random number between 0 and 16
        if (d > 0) {//Use timestamp until depleted
            r = (d + r) % 16 | 0;
            d = Math.floor(d / 16);
        } else {//Use microseconds since page-load if supported
            r = (d2 + r) % 16 | 0;
            d2 = Math.floor(d2 / 16);
        }
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
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
};

function init(newOptions) {
    options = { ...options, ...newOptions };
}

function getUserId() {
    const userIdCookieName = options.cookiePrefix + "-uid";
    let userId = getCookie(userIdCookieName);
    if (!userId) {
        userId = generateUUID();
        setUserId(userId);
    }
    return userId;
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

function getGroupAssignment(experimentId) {
    const experimentCookieName = options.cookiePrefix + "-eid-" + experimentId;
    let userId = getUserId();
    let groupAssignment = getCookie(experimentCookieName);
    if (groupAssignment) {
        return Promise.resolve(groupAssignment);
    }
    const url = `${options.baseUrl}/project/${options.project}/experiment/${experimentId}/group/assignment`;
    const body = JSON.stringify({
        user: userId
    });
    const headers = getRequestHeaders();
    return new Promise((resolve, reject) => {
        const req = new XMLHttpRequest();
        req.open('POST', url, true);
        req.timeout = options.requestTimeoutMs;
        Object.keys(headers).map((h) => req.setRequestHeader(h, headers[h]));
        req.onload = () => {
            if (req.status >= 200 && req.status < 300) {
                let jsonResponse = JSON.parse(req.responseText);
                setCookie(experimentCookieName, jsonResponse.group, options.groupAssignmentCookieDurationHours);
                resolve(jsonResponse.group);
            } else {
                reject();
            }
        };
        req.ontimeout = () => {
            reject();
        };
        req.onerror = () => {
            reject();
        };
        req.onabort = () => {
            reject();
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
                reject();
            }
        };
        req.ontimeout = () => {
            reject();
        };
        req.onerror = () => {
            reject();
        };
        req.onabort = () => {
            reject();
        };
        req.send(body);
    });
}

export { event, getGroupAssignment, getUserId, init, setUserId };
