'use strict';

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

function store(key, value) {
    if (typeof window === 'undefined' || !window.localStorage) {
        return;
    }
    window.localStorage.setItem(key, JSON.stringify(value));
}

function retrieve(key) {
    if (typeof window === 'undefined' || !window.localStorage) {
        return null;
    }
    return JSON.parse(window.localStorage.getItem(key));
}

function clear(key) {
    if (typeof window === 'undefined' || !window.localStorage) {
        return;
    }
    return window.localStorage.removeItem(key);
}

var VERSION = '0.0.1';
var options = {
    cookiePrefix: "hypo",
    baseUrl: "https://api.hypo.app",
    project: null,
    userIdCacheDurationHours: 24 * 365 * 2,
    groupAssignmentCacheDurationHours: 6,
    cookieDomain: null,
    requestTimeoutMs: 5000
};

function init(newOptions) {
    options = { ...options, ...newOptions };
}

function getUserId() {
    const userIdCookieName = options.cookiePrefix + "-uid";
    return getCookie(userIdCookieName);
}

function setUserId(userId) {
    const userIdCookieName = options.cookiePrefix + "-uid";
    setCookie(userIdCookieName, userId, options.userIdCacheDurationHours);
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
    let userId = getUserId();

    let groupAssignment = retrieve(experimentCookieName);
    if (groupAssignment) {
        if ((new Date()).getTime() < groupAssignment.expirationTime && userId === groupAssignment.user) {
            if (!forceRequest) {
                return Promise.resolve(groupAssignment);
            }
        } else {
            clear(experimentCookieName);
        }
    }

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
                    userId = jsonResponse.user;
                    setCookie(userIdCookieName, jsonResponse.user, options.userIdCacheDurationHours);
                } else {
                    jsonResponse['user'] = userId;
                }
                jsonResponse['reasonCode'] = jsonResponse['reason_code'];
                delete jsonResponse['reason_code'];
                jsonResponse['expirationTime'] = (new Date()).getTime() + (options.groupAssignmentCacheDurationHours*60*60*1000);
                store(experimentCookieName, jsonResponse);
                resolve(jsonResponse);
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

var main = {
    init,
    getUserId,
    setUserId,
    getGroupAssignment,
    event
};

module.exports = main;
