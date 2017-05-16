module.exports =
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// identity function for calling harmony imports with the correct context
/******/ 	__webpack_require__.i = function(value) { return value; };
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "/build/";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 13);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports) {

module.exports = require("boom");

/***/ }),
/* 1 */
/***/ (function(module, exports) {

module.exports = require("request");

/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


module.exports = function (options, ctx, req) {
    const authParams = {
        clientId: options.clientId(ctx, req),
        domain: options.domain(ctx, req),
        clientSecret: options.clientSecret(ctx, req),
        secretEncoding: options.secretEncoding(ctx, req)
    };
    const count = !!authParams.clientId + !!authParams.domain + !!authParams.clientSecret + !!authParams.secretEncoding;
    return count === 4 ? authParams : null;
};


/***/ }),
/* 3 */
/***/ (function(module, exports) {

function webpackEmptyContext(req) {
	throw new Error("Cannot find module '" + req + "'.");
}
webpackEmptyContext.keys = function() { return []; };
webpackEmptyContext.resolve = webpackEmptyContext;
module.exports = webpackEmptyContext;
webpackEmptyContext.id = 3;

/***/ }),
/* 4 */
/***/ (function(module, exports) {

module.exports = require("jsonwebtoken");

/***/ }),
/* 5 */
/***/ (function(module, exports) {

module.exports = {
	"title": "Auth0 Logs to Application Insights",
	"name": "auth0-logs-to-application-insights",
	"version": "1.5.0",
	"author": "auth0",
	"description": "This extension will take all of your Auth0 logs and export them to Application Insights",
	"type": "cron",
	"keywords": [
		"auth0",
		"extension"
	],
	"schedule": "0 */5 * * * *",
	"auth0": {
		"scopes": "read:logs"
	},
	"secrets": {
		"BATCH_SIZE": {
			"description": "The ammount of logs to be read on each execution. Maximum is 100.",
			"default": 100
		},
		"APPINSIGHTS_INSTRUMENTATIONKEY": {
			"description": "Application Insights instrumentationKey",
			"required": true
		}
	}
};

/***/ }),
/* 6 */
/***/ (function(module, exports, __webpack_require__) {

var apply = Function.prototype.apply;

// DOM APIs, for completeness

exports.setTimeout = function() {
  return new Timeout(apply.call(setTimeout, window, arguments), clearTimeout);
};
exports.setInterval = function() {
  return new Timeout(apply.call(setInterval, window, arguments), clearInterval);
};
exports.clearTimeout =
exports.clearInterval = function(timeout) {
  if (timeout) {
    timeout.close();
  }
};

function Timeout(id, clearFn) {
  this._id = id;
  this._clearFn = clearFn;
}
Timeout.prototype.unref = Timeout.prototype.ref = function() {};
Timeout.prototype.close = function() {
  this._clearFn.call(window, this._id);
};

// Does not start the time, just sets up the members needed.
exports.enroll = function(item, msecs) {
  clearTimeout(item._idleTimeoutId);
  item._idleTimeout = msecs;
};

exports.unenroll = function(item) {
  clearTimeout(item._idleTimeoutId);
  item._idleTimeout = -1;
};

exports._unrefActive = exports.active = function(item) {
  clearTimeout(item._idleTimeoutId);

  var msecs = item._idleTimeout;
  if (msecs >= 0) {
    item._idleTimeoutId = setTimeout(function onTimeout() {
      if (item._onTimeout)
        item._onTimeout();
    }, msecs);
  }
};

// setimmediate attaches itself to the global object
__webpack_require__(16);
exports.setImmediate = setImmediate;
exports.clearImmediate = clearImmediate;


/***/ }),
/* 7 */
/***/ (function(module, exports, __webpack_require__) {

exports.auth0 = __webpack_require__(18);
exports.fromConnect = exports.fromExpress = fromConnect;
exports.fromHapi = fromHapi;
exports.fromServer = exports.fromRestify = fromServer;

/*
var app = new (require('express'))();

app.get('/', function (req, res) {
   res.send('Hello, world'); 
});

module.exports = app;
*/
exports.express = function (options, cb) {
    options.nodejsCompiler(options.script, function (error, func) {
        if (error) return cb(error);
        try {
            func = fromConnect(func);
        }
        catch (e) {
            return cb(e);
        }
        return cb(null, func);
    });
};

// File rendering
exports.html = function (options, cb) {
    render(options, cb, (script)=>script);
};

exports.pug = function (options, cb) {
    var pug = __webpack_require__(24);
    render(options, cb, (script)=>pug.render(script));
};

exports.jade = exports.pug;

function render(options, cb, render) {
    cb(null, (ctx, req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        var html = render(options.script);
        res.end(html);    
    });   
} 

/*
async (dynamic context) => {
    return "Hello, world!";  
}
*/
exports.cs = function (options, cb) {
    cb(null, __webpack_require__(14).func(options.script));
};

const SANITIZE_RX = /[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g;

// API functions

function addAuth0(func) {
    func.auth0 = function (options) {
        return exports.auth0(func, options);
    }

    return func;
}

function fromConnect (connectFn) {
    return addAuth0(function (context, req, res) {
        var normalizeRouteRx = createRouteNormalizationRx(req.x_wt);

        req.originalUrl = req.url;
        req.url = req.url.replace(normalizeRouteRx, '/');
        req.webtaskContext = attachStorageHelpers(context);

        return connectFn(req, res);
    });
}

function fromHapi(server) {
    var webtaskContext;

    server.ext('onRequest', function (request, response) {
        var normalizeRouteRx = createRouteNormalizationRx(request.x_wt.jtn);

        request.setUrl(request.url.replace(normalizeRouteRx, '/'));
        request.webtaskContext = webtaskContext;
    });

    return addAuth0(function (context, req, res) {
        var dispatchFn = server._dispatch();

        webtaskContext = attachStorageHelpers(context);

        dispatchFn(req, res);
    });
}

function fromServer(httpServer) {
    return addAuth0(function (context, req, res) {
        var normalizeRouteRx = createRouteNormalizationRx(req.x_wt);

        req.originalUrl = req.url;
        req.url = req.url.replace(normalizeRouteRx, '/');
        req.webtaskContext = attachStorageHelpers(context);

        return httpServer.emit('request', req, res);
    });
}


// Helper functions

const USE_WILDCARD_DOMAIN = 3;
const USE_CUSTOM_DOMAIN = 2;
const USE_SHARED_DOMAIN = 1;

function createRouteNormalizationRx(claims) {
    var container = claims.container.replace(SANITIZE_RX, '\\$&');
    var name = claims.jtn
        ? claims.jtn.replace(SANITIZE_RX, '\\$&')
        : '';
    
    if (claims.url_format === USE_SHARED_DOMAIN) {
        return new RegExp(`^\/api/run/${container}/(?:${name}\/?)?`);
    }
    else if (claims.url_format === USE_CUSTOM_DOMAIN) {
        return new RegExp(`^\/${container}/(?:${name}\/?)?`);
    }
    else if (claims.url_format === USE_WILDCARD_DOMAIN) {
        return new RegExp(`^\/(?:${name}\/?)?`);
    }
    else {
        throw new Error('Unsupported webtask URL format.');
    }
}

function attachStorageHelpers(context) {
    context.read = context.secrets.EXT_STORAGE_URL
        ?   readFromPath
        :   readNotAvailable;
    context.write = context.secrets.EXT_STORAGE_URL
        ?   writeToPath
        :   writeNotAvailable;

    return context;


    function readNotAvailable(path, options, cb) {
        var Boom = __webpack_require__(0);

        if (typeof options === 'function') {
            cb = options;
            options = {};
        }

        cb(Boom.preconditionFailed('Storage is not available in this context'));
    }

    function readFromPath(path, options, cb) {
        var Boom = __webpack_require__(0);
        var Request = __webpack_require__(1);

        if (typeof options === 'function') {
            cb = options;
            options = {};
        }

        Request({
            uri: context.secrets.EXT_STORAGE_URL,
            method: 'GET',
            headers: options.headers || {},
            qs: { path: path },
            json: true,
        }, function (err, res, body) {
            if (err) return cb(Boom.wrap(err, 502));
            if (res.statusCode === 404 && Object.hasOwnProperty.call(options, 'defaultValue')) return cb(null, options.defaultValue);
            if (res.statusCode >= 400) return cb(Boom.create(res.statusCode, body && body.message));

            cb(null, body);
        });
    }

    function writeNotAvailable(path, data, options, cb) {
        var Boom = __webpack_require__(0);

        if (typeof options === 'function') {
            cb = options;
            options = {};
        }

        cb(Boom.preconditionFailed('Storage is not available in this context'));
    }

    function writeToPath(path, data, options, cb) {
        var Boom = __webpack_require__(0);
        var Request = __webpack_require__(1);

        if (typeof options === 'function') {
            cb = options;
            options = {};
        }

        Request({
            uri: context.secrets.EXT_STORAGE_URL,
            method: 'PUT',
            headers: options.headers || {},
            qs: { path: path },
            body: data,
        }, function (err, res, body) {
            if (err) return cb(Boom.wrap(err, 502));
            if (res.statusCode >= 400) return cb(Boom.create(res.statusCode, body && body.message));

            cb(null);
        });
    }
}


/***/ }),
/* 8 */
/***/ (function(module, exports) {

module.exports = require("applicationinsights");

/***/ }),
/* 9 */
/***/ (function(module, exports) {

module.exports = require("express");

/***/ }),
/* 10 */
/***/ (function(module, exports) {

module.exports = require("lru-memoizer");

/***/ }),
/* 11 */
/***/ (function(module, exports) {

module.exports = require("moment");

/***/ }),
/* 12 */
/***/ (function(module, exports) {

module.exports = require("useragent");

/***/ }),
/* 13 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(setImmediate) {
"use latest";

var useragent = __webpack_require__(12);
var moment = __webpack_require__(11);
var express = __webpack_require__(9);
var Webtask = __webpack_require__(7);
var app = express();
var Request = __webpack_require__(1);
var memoizer = __webpack_require__(10);
var metadata = __webpack_require__(5);

/*
 * Get the application insights client.
 */
var getClient = function getClient(key) {
    var appInsights = __webpack_require__(8);
    var client = appInsights.getClient(key);

    // Override the original getEnvelope method to allow setting a custom time.
    var originalGetEnvelope = client.getEnvelope;
    client.getEnvelope = function (data, tagOverrides) {
        var envelope = originalGetEnvelope.apply(client, [data, tagOverrides]);
        envelope.time = data.baseData.properties.date;
        envelope.os = data.baseData.properties.os;
        envelope.osVer = data.baseData.properties.os_version;
        envelope.tags['ai.device.id'] = data.baseData.properties.device;
        envelope.tags['ai.device.machineName'] = data.baseData.properties.client_name;
        envelope.tags['ai.device.type'] = 'mobile:' + data.baseData.properties.isMobile;
        envelope.tags['ai.device.os'] = data.baseData.properties.os;
        envelope.tags['ai.device.osVersion'] = data.baseData.properties.os_version;
        envelope.tags['ai.device.osArchitecture'] = '';
        envelope.tags['ai.device.osPlatform'] = data.baseData.properties.os;

        if (data.baseData.properties.ip) {
            envelope.tags['ai.location.ip'] = data.baseData.properties.ip;
        }

        if (data.baseData.properties.user_id || data.baseData.properties.user_name) {
            envelope.tags['ai.user.id'] = data.baseData.properties.user_id || data.baseData.properties.user_name;
            envelope.tags['ai.user.accountId'] = data.baseData.properties.user_name || data.baseData.properties.user_id;
            envelope.tags['ai.user.authUserId'] = data.baseData.properties.user_name || data.baseData.properties.user_id;
        }

        if (data.baseData.properties.user_agent) {
            envelope.tags['ai.user.agent'] = data.baseData.properties.user_agent;
        }
        return envelope;
    };

    return client;
};

function lastLogCheckpoint(req, res) {
    var ctx = req.webtaskContext;

    if (!ctx.data.AUTH0_DOMAIN || !ctx.data.AUTH0_CLIENT_ID || !ctx.data.AUTH0_CLIENT_SECRET) {
        return res.status(400).send({ message: 'Auth0 API v2 credentials or domain missing.' });
    }

    if (!ctx.data.APPINSIGHTS_INSTRUMENTATIONKEY) {
        return res.status(400).send({ message: 'Application Insights instrumentation key is missing.' });
    }

    req.webtaskContext.storage.get(function (err, data) {
        var checkpointId = typeof data === 'undefined' ? null : data.checkpointId;
        /*
         * If this is a scheduled task, we'll get the last log checkpoint from the previous run and continue from there.
         */
        console.log('Starting from:', checkpointId);

        var client = getClient(ctx.data.APPINSIGHTS_INSTRUMENTATIONKEY);
        client.config.endpointUrl = "https://dc.services.visualstudio.com/v2/track";
        client.commonProperties = {
            auth0_domain: ctx.data.AUTH0_DOMAIN
        };

        /*
         * Test authenticating with the Auth0 API.
         */
        var authenticate = function authenticate(callback) {
            return callback();
        };

        /*
         * Get the logs from Auth0.
         */
        var logs = [];
        var getLogs = function getLogs(checkPoint, callback) {
            var take = Number.parseInt(ctx.data.BATCH_SIZE);

            take = take > 100 ? 100 : take;
            getLogsFromAuth0(req.webtaskContext.data.AUTH0_DOMAIN, req.access_token, take, checkPoint, function (result, err) {
                if (result.error) {
                    console.log('Error getting logs from Auth0', result.message);
                    return callback(err);
                }
                if (result && result.length > 0) {
                    result.forEach(function (log) {
                        // Application Insights does not allow you to send very old logs, so we'll only send the logs of the last 48 hours max.
                        if (log.date && moment().diff(moment(log.date), 'hours') < 48) {
                            logs.push(log);
                        }
                    });

                    console.log('Retrieved ' + logs.length + ' logs from Auth0 after ' + checkPoint + '.');
                    setImmediate(function () {
                        checkpointId = result[result.length - 1]._id;
                        getLogs(result[result.length - 1]._id, callback);
                    });
                } else {
                    console.log('Reached end of logs. Total: ' + logs.length + '.');
                    return callback(null, logs);
                }
            });
        };

        /*
         * Export the logs to Application Insights.
         */
        var exportLogs = function exportLogs(logs, callback) {
            console.log('Exporting logs to Application Insights: ' + logs.length);

            logs.forEach(function (record) {
                var level = 0;
                record.type_code = record.type;
                if (logTypes[record.type]) {
                    level = logTypes[record.type].level;
                    record.type = logTypes[record.type].event;
                }

                // Application Insights does not like null or empty strings.
                if (!record.ip || record.ip === '') delete record.ip;
                if (!record.user_id || record.user_id === '') delete record.user_id;
                if (!record.user_name || record.user_name === '') delete record.user_name;
                if (!record.connection || record.connection === '') delete record.connection;
                if (!record.client_name || record.client_name === '') delete record.client_name;
                if (!record.description || record.description === '') delete record.description;

                // Application Insights does not like booleans.
                record.isMobile = record.isMobile && 'yes' || 'no';

                // Application Insights does not like objects.
                if (record.details) {
                    record.details = JSON.stringify(record.details, null, 2);
                }

                // Application Insights does not like login strings.
                if (record.details && record.details.length > 8185) {
                    record.details = record.details.substring(0, 8185) + '...';
                }

                var agent = useragent.parse(record.user_agent);
                record.os = agent.os.toString();
                record.os_version = agent.os.toVersion();
                record.device = agent.device.toString();
                record.device_version = agent.device.toVersion();

                // Don't show "Generic Smartphone" in Application Insights.
                if (record.device && record.device.indexOf('Generic Smartphone') >= 0) {
                    record.device = agent.os.toString();
                    record.device_version = agent.os.toVersion();
                }

                if (level >= 4) {
                    var error = new Error(record.type);
                    error.name = record.type;
                    client.trackException(error, record);
                }

                client.trackEvent(record.type, record);
            });

            if (logs && logs.length) {
                console.log('Flushing all data...');

                client.sendPendingData(function (response) {
                    return callback(null, response);
                });
            } else {
                console.log('No data to flush...');

                return callback(null, '{ "itemsAccepted": 0 }');
            }
        };

        /*
         * Start the process.
         */
        authenticate(function (err) {
            if (err) {
                return res.status(500).send({ err: err });
            }

            getLogs(checkpointId, function (err, logs) {
                if (!logs) {
                    return res.status(500).send({ err: err });
                }

                exportLogs(logs, function (err, response) {
                    try {
                        response = JSON.parse(response);
                    } catch (e) {
                        console.log('Error parsing response, this might indicate that an error occurred:', response);

                        return req.webtaskContext.storage.set({ checkpointId: checkpointId }, { force: 1 }, function (error) {
                            if (error) return res.status(500).send(error);

                            res.status(500).send({
                                error: response
                            });
                        });
                    }

                    if (response.errors.length > 0) {
                        return res.status(500).send(response.errors);
                    }

                    // At least one item we sent was accepted, so we're good and next run can continue where we stopped.
                    if (response.itemsAccepted && response.itemsAccepted > 0) {
                        return req.webtaskContext.storage.set({ checkpointId: checkpointId }, { force: 1 }, function (error) {
                            if (error) {
                                console.log('Error storing startCheckpoint', error);
                                return res.status(500).send({ error: error });
                            }

                            res.sendStatus(200);
                        });
                    }

                    // None of our items were accepted, next run should continue from same starting point.
                    console.log('No items accepted.');
                    return req.webtaskContext.storage.set({ checkpointId: checkpointId }, { force: 1 }, function (error) {
                        if (error) {
                            console.log('Error storing checkpoint', error);
                            return res.status(500).send({ error: error });
                        }

                        res.sendStatus(200);
                    });
                });
            });
        });
    });
}

var logTypes = {
    's': {
        event: 'Success Login',
        level: 1 // Info
    },
    'seacft': {
        event: 'Success Exchange',
        level: 1 // Info
    },
    'seccft': {
        event: 'Success Exchange (Client Credentials)',
        level: 1 // Info
    },
    'feacft': {
        event: 'Failed Exchange',
        level: 3 // Error
    },
    'feccft': {
        event: 'Failed Exchange (Client Credentials)',
        level: 3 // Error
    },
    'f': {
        event: 'Failed Login',
        level: 3 // Error
    },
    'w': {
        event: 'Warnings During Login',
        level: 2 // Warning
    },
    'du': {
        event: 'Deleted User',
        level: 1 // Info
    },
    'fu': {
        event: 'Failed Login (invalid email/username)',
        level: 3 // Error
    },
    'fp': {
        event: 'Failed Login (wrong password)',
        level: 3 // Error
    },
    'fc': {
        event: 'Failed by Connector',
        level: 3 // Error
    },
    'fco': {
        event: 'Failed by CORS',
        level: 3 // Error
    },
    'con': {
        event: 'Connector Online',
        level: 1 // Info
    },
    'coff': {
        event: 'Connector Offline',
        level: 3 // Error
    },
    'fcpro': {
        event: 'Failed Connector Provisioning',
        level: 4 // Critical
    },
    'ss': {
        event: 'Success Signup',
        level: 1 // Info
    },
    'fs': {
        event: 'Failed Signup',
        level: 3 // Error
    },
    'cs': {
        event: 'Code Sent',
        level: 0 // Debug
    },
    'cls': {
        event: 'Code/Link Sent',
        level: 0 // Debug
    },
    'sv': {
        event: 'Success Verification Email',
        level: 0 // Debug
    },
    'fv': {
        event: 'Failed Verification Email',
        level: 0 // Debug
    },
    'scp': {
        event: 'Success Change Password',
        level: 1 // Info
    },
    'fcp': {
        event: 'Failed Change Password',
        level: 3 // Error
    },
    'sce': {
        event: 'Success Change Email',
        level: 1 // Info
    },
    'fce': {
        event: 'Failed Change Email',
        level: 3 // Error
    },
    'scu': {
        event: 'Success Change Username',
        level: 1 // Info
    },
    'fcu': {
        event: 'Failed Change Username',
        level: 3 // Error
    },
    'scpn': {
        event: 'Success Change Phone Number',
        level: 1 // Info
    },
    'fcpn': {
        event: 'Failed Change Phone Number',
        level: 3 // Error
    },
    'svr': {
        event: 'Success Verification Email Request',
        level: 0 // Debug
    },
    'fvr': {
        event: 'Failed Verification Email Request',
        level: 3 // Error
    },
    'scpr': {
        event: 'Success Change Password Request',
        level: 0 // Debug
    },
    'fcpr': {
        event: 'Failed Change Password Request',
        level: 3 // Error
    },
    'fn': {
        event: 'Failed Sending Notification',
        level: 3 // Error
    },
    'sapi': {
        event: 'API Operation'
    },
    'limit_ui': {
        event: 'Too Many Calls to /userinfo',
        level: 4 // Critical
    },
    'api_limit': {
        event: 'Rate Limit On API',
        level: 4 // Critical
    },
    'sdu': {
        event: 'Successful User Deletion',
        level: 1 // Info
    },
    'fdu': {
        event: 'Failed User Deletion',
        level: 3 // Error
    },
    'fapi': {
        event: 'Failed API Operation',
        level: 3 // Error
    },
    'limit_wc': {
        event: 'Blocked Account',
        level: 3 // Error
    },
    'limit_mu': {
        event: 'Blocked IP Address',
        level: 3 // Error
    },
    'slo': {
        event: 'Success Logout',
        level: 1 // Info
    },
    'flo': {
        event: ' Failed Logout',
        level: 3 // Error
    },
    'sd': {
        event: 'Success Delegation',
        level: 1 // Info
    },
    'fd': {
        event: 'Failed Delegation',
        level: 3 // Error
    }
};

function getLogsFromAuth0(domain, token, take, from, cb) {
    var url = 'https://' + domain + '/api/v2/logs';

    Request({
        method: 'GET',
        url: url,
        json: true,
        qs: {
            take: take,
            from: from,
            sort: 'date:1',
            per_page: take
        },
        headers: {
            Authorization: 'Bearer ' + token,
            Accept: 'application/json'
        }
    }, function (err, res, body) {
        if (err) {
            console.log('Error getting logs', err);
            cb(null, err);
        } else {
            cb(body);
        }
    });
}

var getTokenCached = memoizer({
    load: function load(apiUrl, audience, clientId, clientSecret, cb) {
        Request({
            method: 'POST',
            url: apiUrl,
            json: true,
            body: {
                audience: audience,
                grant_type: 'client_credentials',
                client_id: clientId,
                client_secret: clientSecret
            }
        }, function (err, res, body) {
            if (body.error_description) {
                cb(null, body.error_description);
            } else {
                cb(body.access_token);
            }
        });
    },
    hash: function hash(apiUrl) {
        return apiUrl;
    },
    max: 100,
    maxAge: 1000 * 60 * 60
});

app.use(function (req, res, next) {
    var apiUrl = 'https://' + req.webtaskContext.data.AUTH0_DOMAIN + '/oauth/token';
    var audience = 'https://' + req.webtaskContext.data.AUTH0_DOMAIN + '/api/v2/';
    var clientId = req.webtaskContext.data.AUTH0_CLIENT_ID;
    var clientSecret = req.webtaskContext.data.AUTH0_CLIENT_SECRET;

    getTokenCached(apiUrl, audience, clientId, clientSecret, function (access_token, err) {
        if (err) {
            console.log('Error getting access_token', err);
            return next(err);
        }

        req.access_token = access_token;
        next();
    });
});

app.get('/', lastLogCheckpoint);
app.post('/', lastLogCheckpoint);

// This endpoint would be called by webtask-gallery when the extension is installed as custom-extension
app.get('/meta', function (req, res) {
    res.status(200).send(metadata);
});

module.exports = Webtask.fromExpress(app);
/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(6).setImmediate))

/***/ }),
/* 14 */
/***/ (function(module, exports, __webpack_require__) {

var fs = __webpack_require__(22)
    , path = __webpack_require__(23)
    , builtEdge = path.resolve(__dirname, '../build/Release/' + (process.env.EDGE_USE_CORECLR || !fs.existsSync(path.resolve(__dirname, '../build/Release/edge_nativeclr.node')) ? 'edge_coreclr.node' : 'edge_nativeclr.node'))
    , edge;

var versionMap = [
    [ /^4\./, '4.1.1' ],
    [ /^5\./, '5.1.0' ],
    [ /^6\./, '6.4.0' ],
    [ /^7\./, '7.10.0' ],
];

function determineVersion() {
    for (var i in versionMap) {
        if (process.versions.node.match(versionMap[i][0])) {
            return versionMap[i][1];
        }
    }

    throw new Error('The edge module has not been pre-compiled for node.js version ' + process.version +
        '. You must build a custom version of edge.node. Please refer to https://github.com/tjanczuk/edge ' +
        'for building instructions.');
}
var edgeNative;
if (process.env.EDGE_NATIVE) {
    edgeNative = process.env.EDGE_NATIVE;
}
else if (fs.existsSync(builtEdge)) {
    edgeNative = builtEdge;
}
else if (process.platform === 'win32') {
    edgeNative = path.resolve(__dirname, './native/' + process.platform + '/' + process.arch + '/' + determineVersion() + '/' + (process.env.EDGE_USE_CORECLR ? 'edge_coreclr' : 'edge_nativeclr'));
}
else {
    throw new Error('The edge native module is not available at ' + builtEdge 
        + '. You can use EDGE_NATIVE environment variable to provide alternate location of edge.node. '
        + 'If you need to build edge.node, follow build instructions for your platform at https://github.com/tjanczuk/edge');
}
if (process.env.EDGE_DEBUG) {
    console.log('Load edge native library from: ' + edgeNative);
}
if (edgeNative.match(/edge_coreclr\.node$/i)) {
    // Propagate the choice between desktop and coreclr to edge-cs; this is used in deciding
    // how to compile literal C# at https://github.com/tjanczuk/edge-cs/blob/master/lib/edge-cs.js
    process.env.EDGE_USE_CORECLR = 1;
}
if (process.env.EDGE_USE_CORECLR && !process.env.EDGE_BOOTSTRAP_DIR && fs.existsSync(path.join(__dirname, 'bootstrap', 'bin', 'Release', 'netcoreapp1.0', 'bootstrap.dll'))) {
    process.env.EDGE_BOOTSTRAP_DIR = path.join(__dirname, 'bootstrap', 'bin', 'Release', 'netcoreapp1.0');
}

process.env.EDGE_NATIVE = edgeNative;
edge = !(function webpackMissingModule() { var e = new Error("Cannot find module \".\""); e.code = 'MODULE_NOT_FOUND'; throw e; }());

exports.func = function(language, options) {
    if (!options) {
        options = language;
        language = 'cs';
    }

    if (typeof options === 'string') {
        if (options.match(/\.dll$/i)) {
            options = { assemblyFile: options };
        }
        else {
            options = { source: options };
        }
    }
    else if (typeof options === 'function') {
        var originalPrepareStackTrace = Error.prepareStackTrace;
        var stack;
        try {
            Error.prepareStackTrace = function(error, stack) {
                return stack;
            };
            stack = new Error().stack;
        }
        finally
        {
            Error.prepareStackTrace = originalPrepareStackTrace;
        }
        
        options = { source: options, jsFileName: stack[1].getFileName(), jsLineNumber: stack[1].getLineNumber() };
    }
    else if (typeof options !== 'object') {
        throw new Error('Specify the source code as string or provide an options object.');
    }

    if (typeof language !== 'string') {
        throw new Error('The first argument must be a string identifying the language compiler to use.');
    }
    else if (!options.assemblyFile) {
        var compilerName = 'edge-' + language.toLowerCase();
        var compiler;
        try {
            compiler = !(function webpackMissingModule() { var e = new Error("Cannot find module \".\""); e.code = 'MODULE_NOT_FOUND'; throw e; }());
        }
        catch (e) {
            throw new Error("Unsupported language '" + language + "'. To compile script in language '" + language +
                "' an npm module '" + compilerName + "' must be installed.");
        }

        try {
            options.compiler = compiler.getCompiler();
        }
        catch (e) {
            throw new Error("The '" + compilerName + "' module required to compile the '" + language + "' language " +
                "does not contain getCompiler() function.");
        }

        if (typeof options.compiler !== 'string') {
            throw new Error("The '" + compilerName + "' module required to compile the '" + language + "' language " +
                "did not specify correct compiler package name or assembly.");
        }

        if (process.env.EDGE_USE_CORECLR) {
            options.bootstrapDependencyManifest = compiler.getBootstrapDependencyManifest();
        }
    }

    if (!options.assemblyFile && !options.source) {
        throw new Error('Provide DLL or source file name or .NET script literal as a string parmeter, or specify an options object '+
            'with assemblyFile or source string property.');
    }
    else if (options.assemblyFile && options.source) {
        throw new Error('Provide either an asseblyFile or source property, but not both.');
    }

    if (typeof options.source === 'function') {
        var match = options.source.toString().match(/[^]*\/\*([^]*)\*\/\s*\}$/);
        if (match) {
            options.source = match[1];
        }
        else {
            throw new Error('If .NET source is provided as JavaScript function, function body must be a /* ... */ comment.');
        }
    }

    if (options.references !== undefined) {
        if (!Array.isArray(options.references)) {
            throw new Error('The references property must be an array of strings.');
        }

        options.references.forEach(function (ref) {
            if (typeof ref !== 'string') {
                throw new Error('The references property must be an array of strings.');
            }
        });
    }

    if (options.assemblyFile) {
        if (!options.typeName) {
            var matched = options.assemblyFile.match(/([^\\\/]+)\.dll$/i);
            if (!matched) {
                throw new Error('Unable to determine the namespace name based on assembly file name. ' +
                    'Specify typeName parameter as a namespace qualified CLR type name of the application class.');
            }

            options.typeName = matched[1] + '.Startup';
        }
    }
    else if (!options.typeName) {
        options.typeName = "Startup";
    }

    if (!options.methodName) {
        options.methodName = 'Invoke';
    }

    return edge.initializeClrFunc(options);
};


/***/ }),
/* 15 */
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(21)


/***/ }),
/* 16 */
/***/ (function(module, exports) {

(function (global, undefined) {
    "use strict";

    if (global.setImmediate) {
        return;
    }

    var nextHandle = 1; // Spec says greater than zero
    var tasksByHandle = {};
    var currentlyRunningATask = false;
    var doc = global.document;
    var registerImmediate;

    function setImmediate(callback) {
      // Callback can either be a function or a string
      if (typeof callback !== "function") {
        callback = new Function("" + callback);
      }
      // Copy function arguments
      var args = new Array(arguments.length - 1);
      for (var i = 0; i < args.length; i++) {
          args[i] = arguments[i + 1];
      }
      // Store and register the task
      var task = { callback: callback, args: args };
      tasksByHandle[nextHandle] = task;
      registerImmediate(nextHandle);
      return nextHandle++;
    }

    function clearImmediate(handle) {
        delete tasksByHandle[handle];
    }

    function run(task) {
        var callback = task.callback;
        var args = task.args;
        switch (args.length) {
        case 0:
            callback();
            break;
        case 1:
            callback(args[0]);
            break;
        case 2:
            callback(args[0], args[1]);
            break;
        case 3:
            callback(args[0], args[1], args[2]);
            break;
        default:
            callback.apply(undefined, args);
            break;
        }
    }

    function runIfPresent(handle) {
        // From the spec: "Wait until any invocations of this algorithm started before this one have completed."
        // So if we're currently running a task, we'll need to delay this invocation.
        if (currentlyRunningATask) {
            // Delay by doing a setTimeout. setImmediate was tried instead, but in Firefox 7 it generated a
            // "too much recursion" error.
            setTimeout(runIfPresent, 0, handle);
        } else {
            var task = tasksByHandle[handle];
            if (task) {
                currentlyRunningATask = true;
                try {
                    run(task);
                } finally {
                    clearImmediate(handle);
                    currentlyRunningATask = false;
                }
            }
        }
    }

    function installNextTickImplementation() {
        registerImmediate = function(handle) {
            process.nextTick(function () { runIfPresent(handle); });
        };
    }

    function canUsePostMessage() {
        // The test against `importScripts` prevents this implementation from being installed inside a web worker,
        // where `global.postMessage` means something completely different and can't be used for this purpose.
        if (global.postMessage && !global.importScripts) {
            var postMessageIsAsynchronous = true;
            var oldOnMessage = global.onmessage;
            global.onmessage = function() {
                postMessageIsAsynchronous = false;
            };
            global.postMessage("", "*");
            global.onmessage = oldOnMessage;
            return postMessageIsAsynchronous;
        }
    }

    function installPostMessageImplementation() {
        // Installs an event handler on `global` for the `message` event: see
        // * https://developer.mozilla.org/en/DOM/window.postMessage
        // * http://www.whatwg.org/specs/web-apps/current-work/multipage/comms.html#crossDocumentMessages

        var messagePrefix = "setImmediate$" + Math.random() + "$";
        var onGlobalMessage = function(event) {
            if (event.source === global &&
                typeof event.data === "string" &&
                event.data.indexOf(messagePrefix) === 0) {
                runIfPresent(+event.data.slice(messagePrefix.length));
            }
        };

        if (global.addEventListener) {
            global.addEventListener("message", onGlobalMessage, false);
        } else {
            global.attachEvent("onmessage", onGlobalMessage);
        }

        registerImmediate = function(handle) {
            global.postMessage(messagePrefix + handle, "*");
        };
    }

    function installMessageChannelImplementation() {
        var channel = new MessageChannel();
        channel.port1.onmessage = function(event) {
            var handle = event.data;
            runIfPresent(handle);
        };

        registerImmediate = function(handle) {
            channel.port2.postMessage(handle);
        };
    }

    function installReadyStateChangeImplementation() {
        var html = doc.documentElement;
        registerImmediate = function(handle) {
            // Create a <script> element; its readystatechange event will be fired asynchronously once it is inserted
            // into the document. Do so, thus queuing up the task. Remember to clean up once it's been called.
            var script = doc.createElement("script");
            script.onreadystatechange = function () {
                runIfPresent(handle);
                script.onreadystatechange = null;
                html.removeChild(script);
                script = null;
            };
            html.appendChild(script);
        };
    }

    function installSetTimeoutImplementation() {
        registerImmediate = function(handle) {
            setTimeout(runIfPresent, 0, handle);
        };
    }

    // If supported, we should attach to the prototype of global, since that is where setTimeout et al. live.
    var attachTo = Object.getPrototypeOf && Object.getPrototypeOf(global);
    attachTo = attachTo && attachTo.setTimeout ? attachTo : global;

    // Don't get fooled by e.g. browserify environments.
    if ({}.toString.call(global.process) === "[object process]") {
        // For Node.js before 0.9
        installNextTickImplementation();

    } else if (canUsePostMessage()) {
        // For non-IE10 modern browsers
        installPostMessageImplementation();

    } else if (global.MessageChannel) {
        // For web workers, where supported
        installMessageChannelImplementation();

    } else if (doc && "onreadystatechange" in doc.createElement("script")) {
        // For IE 6–8
        installReadyStateChangeImplementation();

    } else {
        // For older browsers
        installSetTimeoutImplementation();
    }

    attachTo.setImmediate = setImmediate;
    attachTo.clearImmediate = clearImmediate;
}(typeof self === "undefined" ? typeof global === "undefined" ? this : global : self));


/***/ }),
/* 17 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


module.exports = function (webtask, options, ctx, req, res, routingInfo) {
    return options.exclude && options.exclude(ctx, req, routingInfo.appPath)
        ? run()
        : authenticate();

    function authenticate() {
        const token = options.getAccessToken(ctx, req);
        if (!token) {
            return options.loginError({
                code: 401,
                message: 'Unauthorized.',
                error: 'Missing access token.',
                redirect: routingInfo.baseUrl + '/login',
            }, ctx, req, res, routingInfo.baseUrl);
        }
        options.validateToken(ctx, req, token, function (error, user) {
            if (error) {
                return options.loginError({
                    code: error.code || 401,
                    message: error.message || 'Unauthorized.'
                }, ctx, req, res, routingInfo.baseUrl);
            }
            else {
                ctx.accessToken = token;
                ctx.user = req.user = user;
                authorize();
            }
        });
    }

    function authorize() {
        if  (options.authorized && !options.authorized(ctx, req)) {
            return options.loginError({
                code: 403,
                message: 'Forbidden.'
            }, ctx, req, res, routingInfo.baseUrl);        
        }

        return run();
    }

    function run() {
        // Route request to webtask code
        return webtask(ctx, req, res);
    }
};


/***/ }),
/* 18 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


const Url = __webpack_require__(26);
const Buffer = __webpack_require__(15).Buffer
const handleAppEndpoint = __webpack_require__(17);
const handleLogin = __webpack_require__(20);
const handleCallback = __webpack_require__(19);
const getAuthParams = __webpack_require__(2);

module.exports = function (webtask, options) {
    if (typeof webtask !== 'function' || webtask.length !== 3) {
        throw new Error('The auth0() function can only be called on webtask functions with the (ctx, req, res) signature.');
    }
    if (!options) {
        options = {};
    }
    if (typeof options !== 'object') {
        throw new Error('The options parameter must be an object.');
    }
    if (options.scope && typeof options.scope !== 'string') {
        throw new Error('The scope option, if specified, must be a string.');
    }
    if (options.authorized && ['string','function'].indexOf(typeof options.authorized) < 0 && !Array.isArray(options.authorized)) {
        throw new Error('The authorized option, if specified, must be a string or array of strings with e-mail or domain names, or a function that accepts (ctx, req) and returns boolean.');
    }
    if (options.exclude && ['string','function'].indexOf(typeof options.exclude) < 0 && !Array.isArray(options.exclude)) {
        throw new Error('The exclude option, if specified, must be a string or array of strings with URL paths that do not require authentication, or a function that accepts (ctx, req, appPath) and returns boolean.');
    }
    if (options.clientId && typeof options.clientId !== 'function') {
        throw new Error('The clientId option, if specified, must be a function that accepts (ctx, req) and returns an Auth0 Client ID.');
    }
    if (options.clientSecret && typeof options.clientSecret !== 'function') {
        throw new Error('The clientSecret option, if specified, must be a function that accepts (ctx, req) and returns an Auth0 Client Secret.');
    }
    if (options.secretEncoding && typeof options.secretEncoding !== 'function') {
        throw new Error('The secretEncoding option, if specified, must be a function that accepts (ctx, req) and returns a character encoding name for use with the "Buffer" class.');
    }
    if (options.domain && typeof options.domain !== 'function') {
        throw new Error('The domain option, if specified, must be a function that accepts (ctx, req) and returns an Auth0 Domain.');
    }
    if (options.createToken && typeof options.createToken !== 'function') {
        throw new Error('The createToken option, if specified, must be a function that accepts (ctx, res, idToken, accessToken) and returns an access token that can be used to authenticate future calls to webtask APIs.');
    }
    if (options.getAccessToken && typeof options.getAccessToken !== 'function') {
        throw new Error('The getAccessToken option, if specified, must be a function that accepts (ctx, req) and returns the access token associated with the request, or null.');
    }
    if (options.validateToken && typeof options.validateToken !== 'function') {
        throw new Error('The validateToken option, if specified, must be a function that accepts (ctx, req, token, cb) and calls the callback with (error, userProfile).');
    }
    if (options.loginSuccess && typeof options.loginSuccess !== 'function') {
        throw new Error('The loginSuccess option, if specified, must be a function that accepts (ctx, req, res, baseUrl) and generates a response.');
    }
    if (options.loginError && typeof options.loginError !== 'function') {
        throw new Error('The loginError option, if specified, must be a function that accepts (error, ctx, req, res, baseUrl) and generates a response.');
    }

    options.clientId = options.clientId || function (ctx, req) {
        return ctx.secrets.AUTH0_CLIENT_ID;
    };
    options.clientSecret = options.clientSecret || function (ctx, req) {
        return ctx.secrets.AUTH0_CLIENT_SECRET;
    };
    options.secretEncoding = options.secretEncoding || function (ctx, req) {
        return (ctx.secrets.AUTH0_SECRET_ENCODING === undefined) ? 'base64' : ctx.secrets.AUTH0_SECRET_ENCODING;
    };
    options.domain = options.domain || function (ctx, req) {
        return ctx.secrets.AUTH0_DOMAIN;
    };
    options.createToken = options.createToken || function (ctx, req, idToken, accessToken) {
        return idToken;
    };
    options.getAccessToken = options.getAccessToken || function (ctx, req) {
        if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
            return req.headers.authorization.split(' ')[1];
        } else {
            return req.query && req.query.access_token;
        }
    };
    options.validateToken = options.validateToken || function (ctx, req, token, cb) {
        const authParams = getAuthParams(options, ctx, req);
        if (!authParams) {
            return cb({
                code: 400,
                message: 'Auth0 Client ID, Client Secret, and Auth0 Domain must be specified.'
            });
        }

        // Validate Auth0 issued id_token
        let user;
        try {
            user = __webpack_require__(4).verify(token, Buffer.from(authParams.clientSecret, authParams.secretEncoding), {
                audience: authParams.clientId,
                issuer: 'https://' + authParams.domain + '/'
            });
        }
        catch (e) {
            return cb({
                code: 401,
                message: 'Unauthorized: ' + e.message
            });
        }
        return cb(null, user);
    };
    options.loginSuccess = options.loginSuccess || function (ctx, req, res, baseUrl) {
        res.writeHead(302, { Location: `${ baseUrl }?access_token=${ ctx.accessToken }` });
        return res.end();
    };
    options.loginError = options.loginError || function (err, ctx, req, res, baseUrl) {
        if (req.method === 'GET') {
            if (err.redirect) {
                res.writeHead(302, { Location: err.redirect, 'x-wt-error': err.message });
                return res.end(JSON.stringify(err));
            }
            else if (err.code === 400) {
                return error(err, res);
            }
            res.writeHead(err.code || 401, { 
                'Content-Type': 'text/html', 
                'Cache-Control': 'no-cache',
                'x-wt-error': err.message
            });
            return res.end(getNotAuthorizedHtml(baseUrl + '/login'));
        }
        else {
            // Reject all other requests
            return error(err, res);
        }            
    };
    if (typeof options.authorized === 'string') {
        options.authorized = [ options.authorized ];
    }
    if (Array.isArray(options.authorized)) {
        const authorized = [];
        options.authorized.forEach(function (a) {
            authorized.push(a.toLowerCase());
        });
        options.authorized = function (ctx, res) {
            if (ctx.user.email_verified) {
                for (let i = 0; i < authorized.length; i++) {
                    const email = ctx.user.email.toLowerCase();
                    if (email === authorized[i] || authorized[i][0] === '@' && email.indexOf(authorized[i]) > 1) {
                        return true;
                    }
                }
            }
            return false;
        }
    }
    if (typeof options.exclude === 'string') {
        options.exclude = [ options.exclude ];
    }
    if (Array.isArray(options.exclude)) {
        const exclude = options.exclude;
        options.exclude = function (ctx, res, appPath) {
            return exclude.indexOf(appPath) > -1;
        }
    }

    return createAuthenticatedWebtask(webtask, options);
};

function createAuthenticatedWebtask(webtask, options) {

    // Inject middleware into the HTTP pipeline before the webtask handler
    // to implement authentication endpoints and perform authentication 
    // and authorization.

    return function (ctx, req, res) {
        if (!req.x_wt.jtn || !req.x_wt.container) {
            return error({
                code: 400,
                message: 'Auth0 authentication can only be used with named webtasks.'
            }, res);
        }

        const routingInfo = getRoutingInfo(req);
        if (!routingInfo) {
            return error({
                code: 400,
                message: 'Error processing request URL path.'
            }, res);
        }
        switch (req.method === 'GET' && routingInfo.appPath) {
            case '/login': handleLogin(options, ctx, req, res, routingInfo); break;
            case '/callback': handleCallback(options, ctx, req, res, routingInfo); break;
            default: handleAppEndpoint(webtask, options, ctx, req, res, routingInfo); break;
        };
        return;
    };
}

function getRoutingInfo(req) {
    const routingInfo = Url.parse(req.url, true);
    const segments = routingInfo.pathname.split('/');
    if (segments[1] === 'api' && segments[2] === 'run' && segments[3] === req.x_wt.container && segments[4] === req.x_wt.jtn) {
        // Shared domain case: /api/run/{container}/{jtn}
        routingInfo.basePath = segments.splice(0, 5).join('/');
    }
    else if (segments[1] === req.x_wt.container && segments[2] === req.x_wt.jtn) {
        // Custom domain case: /{container}/{jtn}
        routingInfo.basePath = segments.splice(0, 3).join('/');
    }
    else if (segments[1] === req.x_wt.jtn && req.headers.host.indexOf(req.x_wt.container + '.') === 0) {
        // Webtask subdomain case: //{container}.us.webtask.io/{jtn}
        routingInfo.basePath = segments.splice(0,2).join('/');
    }
    else {
        return null;
    }
    routingInfo.appPath = '/' + segments.join('/');
    routingInfo.baseUrl = [
        req.headers['x-forwarded-proto'] || 'https',
        '://',
        req.headers.host,
        routingInfo.basePath
    ].join('');
    return routingInfo;
}

function getNotAuthorizedHtml(loginUrl) {
    const notAuthorizedTemplate = `
    <!DOCTYPE html5>
    <html>
    <head>
        <meta charset="utf-8"/>
        <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <link href="https://cdn.auth0.com/styleguide/latest/index.css" rel="stylesheet" />
        <title>Access denied</title>
    </head>
    <body>
        <div class="container">
        <div class="row text-center">
            <h1><a href="https://auth0.com" title="Go to Auth0!"><img src="https://cdn.auth0.com/styleguide/1.0.0/img/badge.svg" alt="Auth0 badge" /></a></h1>
            <h1>Not authorized</h1>
            <p><a href="${ loginUrl }">Try again</a></p>
        </div>
        </div>
    </body>
    </html>`;

    return notAuthorizedTemplate;
}

function error(err, res) {
    res.writeHead(err.code || 500, { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
    });
    res.end(JSON.stringify(err));
}


/***/ }),
/* 19 */
/***/ (function(module, exports, __webpack_require__) {

var getAuthParams = __webpack_require__(2)

module.exports = function (options, ctx, req, res, routingInfo) {
    if (!ctx.query.code) {
        return options.loginError({
            code: 401,
            message: 'Authentication error.',
            callbackQuery: ctx.query
        }, ctx, req, res, routingInfo.baseUrl);
    }

    var authParams = getAuthParams(options, ctx, req);
    if (!authParams) {
        return options.loginError({
            code: 400,
            message: 'Auth0 Client ID, Client Secret, and Auth0 Domain must be specified.'
        }, ctx, res, res, routingInfo.baseUrl);
    }

    return __webpack_require__(25)
        .post('https://' + authParams.domain + '/oauth/token')
        .type('form')
        .send({
            client_id: authParams.clientId,
            client_secret: authParams.clientSecret,
            redirect_uri: routingInfo.baseUrl + '/callback',
            code: ctx.query.code,
            grant_type: 'authorization_code'
        })
        .timeout(15000)
        .end(function (err, ares) {
            if (err || !ares.ok) {
                return options.loginError({
                    code: 502,
                    message: 'OAuth code exchange completed with error.',
                    error: err && err.message,
                    auth0Status: ares && ares.status,
                    auth0Response: ares && (ares.body || ares.text)
                }, ctx, req, res, routingInfo.baseUrl);
            }

            return issueAccessToken(ares.body.id_token, ares.body.access_token);
        });

    function issueAccessToken(id_token, access_token) {
        var jwt = __webpack_require__(4);
        try {
            req.user = ctx.user = jwt.decode(id_token);
        }
        catch (e) {
            return options.loginError({
                code: 502,
                message: 'Cannot parse id_token returned from Auth0.',
                id_token: id_token,
                error: e.message
            }, ctx, req, res, routingInfo.baseUrl);
        }

        ctx.accessToken = options.createToken(ctx, req, id_token, access_token);
        if (typeof ctx.accessToken !== 'string') {
            return options.loginError({
                code: 400,
                message: 'The createToken function did not return a string access token.'
            }, ctx, req, res, routingInfo.baseUrl);
        }

        // Perform post-login action (redirect to /?access_token=... by default)
        return options.loginSuccess(ctx, req, res, routingInfo.baseUrl);
    }
};


/***/ }),
/* 20 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


const getAuthParams = __webpack_require__(2);

module.exports = function(options, ctx, req, res, routingInfo) {
    const authParams = getAuthParams(options, ctx, req);
    const scope = 'openid name email email_verified ' + (options.scope || '');
    if (!authParams) {
        // TODO, tjanczuk, support the shared Auth0 application case
        return options.loginError({
            code: 400,
            message: 'You must specify Auth0 client ID, client secret, and domain when creating the webtask. See https://webtask.io/docs/auth for details.'
        }, ctx, req, res, routingInfo.baseUrl);
        // Neither client id or domain are specified; use shared Auth0 settings
        // var authUrl = 'https://auth0.auth0.com/i/oauth2/authorize'
        //     + '?response_type=code'
        //     + '&audience=https://auth0.auth0.com/userinfo'
        //     + '&scope=' + encodeURIComponent(scope)
        //     + '&client_id=' + encodeURIComponent(routingInfo.baseUrl)
        //     + '&redirect_uri=' + encodeURIComponent(routingInfo.baseUrl + '/callback');
        // res.writeHead(302, { Location: authUrl });
        // return res.end();
    }
    else {
        // Use custom Auth0 account
        const authUrl = 'https://' + authParams.domain + '/authorize' 
            + '?response_type=code'
            + '&scope=' + encodeURIComponent(scope)
            + '&client_id=' + encodeURIComponent(authParams.clientId)
            + '&redirect_uri=' + encodeURIComponent(routingInfo.baseUrl + '/callback');
        res.writeHead(302, { Location: authUrl });
        return res.end();
    }
};


/***/ }),
/* 21 */
/***/ (function(module, exports) {

module.exports = require("buffer");

/***/ }),
/* 22 */
/***/ (function(module, exports) {

module.exports = require("fs");

/***/ }),
/* 23 */
/***/ (function(module, exports) {

module.exports = require("path");

/***/ }),
/* 24 */
/***/ (function(module, exports) {

module.exports = require("pug");

/***/ }),
/* 25 */
/***/ (function(module, exports) {

module.exports = require("superagent");

/***/ }),
/* 26 */
/***/ (function(module, exports) {

module.exports = require("url");

/***/ })
/******/ ]);