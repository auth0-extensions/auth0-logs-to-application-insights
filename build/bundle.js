module.exports =
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "/build/";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(setImmediate) {'use strict';
	"use latest";

	var _logTypes;

	function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

	var useragent = __webpack_require__(3);
	var moment = __webpack_require__(4);
	var express = __webpack_require__(5);
	var Webtask = __webpack_require__(6);
	var app = express();
	var Request = __webpack_require__(16);
	var memoizer = __webpack_require__(17);

	/*
	 * Get the application insights client.
	 */
	var getClient = function getClient(key) {
	  var appInsights = __webpack_require__(18);
	  var client = appInsights.getClient(key);

	  // Override the original getEnvelope method to allow setting a custom time.
	  var originalGetEnvelope = client.getEnvelope;
	  client.getEnvelope = function (data, tagOverrides) {
	    var envelope = originalGetEnvelope.apply(client, [data, tagOverrides]);
	    envelope.time = data.baseData.properties.date;
	    envelope.os = data.baseData.properties.os;
	    envelope.osVer = data.baseData.properties.os_version;
	    envelope.tags['ai.device.id'] = data.baseData.properties.device;
	    envelope.tags['ai.device.machineName'] = '';
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
	      envelope.tags['ai.user.authUserId'] = data.baseData.properties.user_id || data.baseData.properties.user_name;
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
	    return res.status(400).send({ message: 'Auth0 API v1 credentials or domain missing.' });
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
	        if (err) {
	          console.log('Error getting logs from Auth0', err);
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

	        // Don't show "Generic Smartphone" in Application Insightis.
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

	var logTypes = (_logTypes = {
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
	  'fapi': {
	    event: 'Failed API Operation'
	  },
	  'limit_wc': {
	    event: 'Blocked Account',
	    level: 4 // Critical
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
	  }
	}, _defineProperty(_logTypes, 'fapi', {
	  event: 'Failed API Operation',
	  level: 3 // Error
	}), _defineProperty(_logTypes, 'limit_wc', {
	  event: 'Blocked Account',
	  level: 3 // Error
	}), _defineProperty(_logTypes, 'limit_mu', {
	  event: 'Blocked IP Address',
	  level: 3 // Error
	}), _defineProperty(_logTypes, 'slo', {
	  event: 'Success Logout',
	  level: 1 // Info
	}), _defineProperty(_logTypes, 'flo', {
	  event: ' Failed Logout',
	  level: 3 // Error
	}), _defineProperty(_logTypes, 'sd', {
	  event: 'Success Delegation',
	  level: 1 // Info
	}), _defineProperty(_logTypes, 'fd', {
	  event: 'Failed Delegation',
	  level: 3 // Error
	}), _logTypes);

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
	      if (err) {
	        cb(null, err);
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

	module.exports = Webtask.fromExpress(app);
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(1).setImmediate))

/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

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
	__webpack_require__(2);
	exports.setImmediate = setImmediate;
	exports.clearImmediate = clearImmediate;


/***/ },
/* 2 */
/***/ function(module, exports) {

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


/***/ },
/* 3 */
/***/ function(module, exports) {

	module.exports = require("useragent");

/***/ },
/* 4 */
/***/ function(module, exports) {

	module.exports = require("moment");

/***/ },
/* 5 */
/***/ function(module, exports) {

	module.exports = require("express");

/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

	exports.auth0 = __webpack_require__(7);
	exports.fromConnect = exports.fromExpress = fromConnect;
	exports.fromHapi = fromHapi;
	exports.fromServer = exports.fromRestify = fromServer;

	// API functions

	function addAuth0(func) {
	    func.auth0 = function (options) {
	        return exports.auth0(func, options);
	    }

	    return func;
	}

	function fromConnect (connectFn) {
	    return addAuth0(function (context, req, res) {
	        var normalizeRouteRx = createRouteNormalizationRx(req.x_wt.jtn);

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
	        var normalizeRouteRx = createRouteNormalizationRx(req.x_wt.jtn);

	        req.originalUrl = req.url;
	        req.url = req.url.replace(normalizeRouteRx, '/');
	        req.webtaskContext = attachStorageHelpers(context);

	        return httpServer.emit('request', req, res);
	    });
	}


	// Helper functions

	function createRouteNormalizationRx(jtn) {
	    var normalizeRouteBase = '^\/api\/run\/[^\/]+\/';
	    var normalizeNamedRoute = '(?:[^\/\?#]*\/?)?';

	    return new RegExp(
	        normalizeRouteBase + (
	        jtn
	            ?   normalizeNamedRoute
	            :   ''
	    ));
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
	        var Boom = __webpack_require__(15);

	        if (typeof options === 'function') {
	            cb = options;
	            options = {};
	        }

	        cb(Boom.preconditionFailed('Storage is not available in this context'));
	    }

	    function readFromPath(path, options, cb) {
	        var Boom = __webpack_require__(15);
	        var Request = __webpack_require__(16);

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
	        var Boom = __webpack_require__(15);

	        if (typeof options === 'function') {
	            cb = options;
	            options = {};
	        }

	        cb(Boom.preconditionFailed('Storage is not available in this context'));
	    }

	    function writeToPath(path, data, options, cb) {
	        var Boom = __webpack_require__(15);
	        var Request = __webpack_require__(16);

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


/***/ },
/* 7 */
/***/ function(module, exports, __webpack_require__) {

	var url = __webpack_require__(8);
	var error = __webpack_require__(9);
	var handleAppEndpoint = __webpack_require__(10);
	var handleLogin = __webpack_require__(12);
	var handleCallback = __webpack_require__(13);

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
	    if (options.domain && typeof options.domain !== 'function') {
	        throw new Error('The domain option, if specified, must be a function that accepts (ctx, req) and returns an Auth0 Domain.');
	    }
	    if (options.webtaskSecret && typeof options.webtaskSecret !== 'function') {
	        throw new Error('The webtaskSecret option, if specified, must be a function that accepts (ctx, req) and returns a key to be used to sign issued JWT tokens.');
	    }
	    if (options.getApiKey && typeof options.getApiKey !== 'function') {
	        throw new Error('The getApiKey option, if specified, must be a function that accepts (ctx, req) and returns an apiKey associated with the request.');
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
	    options.domain = options.domain || function (ctx, req) {
	        return ctx.secrets.AUTH0_DOMAIN;
	    };
	    options.webtaskSecret = options.webtaskSecret || function (ctx, req) {
	        // By default we don't expect developers to specify WEBTASK_SECRET when
	        // creating authenticated webtasks. In this case we will use webtask token
	        // itself as a JWT signing key. The webtask token of a named webtask is secret
	        // and it contains enough entropy (jti, iat, ca) to pass
	        // for a symmetric key. Using webtask token ensures that the JWT signing secret 
	        // remains constant for the lifetime of the webtask; however regenerating 
	        // the webtask will invalidate previously issued JWTs. 
	        return ctx.secrets.WEBTASK_SECRET || req.x_wt.token;
	    };
	    options.getApiKey = options.getApiKey || function (ctx, req) {
	        if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
	            return req.headers.authorization.split(' ')[1];
	        } else if (req.query && req.query.apiKey) {
	            return req.query.apiKey;
	        }
	        return null;
	    };
	    options.loginSuccess = options.loginSuccess || function (ctx, req, res, baseUrl) {
	        res.writeHead(302, { Location: baseUrl + '?apiKey=' + ctx.apiKey });
	        return res.end();
	    };
	    options.loginError = options.loginError || function (error, ctx, req, res, baseUrl) {
	        if (req.method === 'GET') {
	            if (error.redirect) {
	                res.writeHead(302, { Location: error.redirect });
	                return res.end(JSON.stringify(error));
	            }
	            res.writeHead(error.code || 401, { 
	                'Content-Type': 'text/html', 
	                'Cache-Control': 'no-cache' 
	            });
	            return res.end(getNotAuthorizedHtml(baseUrl + '/login'));
	        }
	        else {
	            // Reject all other requests
	            return error(error, res);
	        }            
	    };
	    if (typeof options.authorized === 'string') {
	        options.authorized = [ options.authorized ];
	    }
	    if (Array.isArray(options.authorized)) {
	        var authorized = [];
	        options.authorized.forEach(function (a) {
	            authorized.push(a.toLowerCase());
	        });
	        options.authorized = function (ctx, res) {
	            if (ctx.user.email_verified) {
	                for (var i = 0; i < authorized.length; i++) {
	                    var email = ctx.user.email.toLowerCase();
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
	        var exclude = options.exclude;
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

	        var routingInfo = getRoutingInfo(req);
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
	    var routingInfo = url.parse(req.url, true);
	    var segments = routingInfo.pathname.split('/');
	    if (segments[1] === 'api' && segments[2] === 'run' && segments[3] === req.x_wt.container && segments[4] === req.x_wt.jtn) {
	        // Shared domain case: /api/run/{container}/{jtn}
	        routingInfo.basePath = segments.splice(0, 5).join('/');
	    }
	    else if (segments[1] === req.x_wt.container && segments[2] === req.x_wt.jtn) {
	        // Custom domain case: /{container}/{jtn}
	        routingInfo.basePath = segments.splice(0, 3).join('/');
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

	var notAuthorizedTemplate = function () {/*
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
	        <p><a href="##">Try again</a></p>
	      </div>
	    </div>
	  </body>
	</html>
	*/}.toString().match(/[^]*\/\*([^]*)\*\/\s*\}$/)[1];

	function getNotAuthorizedHtml(loginUrl) {
	    return notAuthorizedTemplate.replace('##', loginUrl);
	}


/***/ },
/* 8 */
/***/ function(module, exports) {

	module.exports = require("url");

/***/ },
/* 9 */
/***/ function(module, exports) {

	module.exports = function (err, res) {
	    res.writeHead(err.code || 500, { 
	        'Content-Type': 'application/json',
	        'Cache-Control': 'no-cache'
	    });
	    res.end(JSON.stringify(err));
	};


/***/ },
/* 10 */
/***/ function(module, exports, __webpack_require__) {

	var error = __webpack_require__(9);

	module.exports = function (webtask, options, ctx, req, res, routingInfo) {
	    return options.exclude && options.exclude(ctx, req, routingInfo.appPath)
	        ? run()
	        : authenticate();

	    function authenticate() {
	        var apiKey = options.getApiKey(ctx, req);
	        if (!apiKey) {
	            return options.loginError({
	                code: 401,
	                message: 'Unauthorized.',
	                error: 'Missing apiKey.',
	                redirect: routingInfo.baseUrl + '/login'
	            }, ctx, req, res, routingInfo.baseUrl);
	        }

	        // Authenticate

	        var secret = options.webtaskSecret(ctx, req);
	        if (!secret) {
	            return error({
	                code: 400,
	                message: 'The webtask secret must be provided to allow for validating apiKeys.'
	            }, res);
	        }

	        try {
	            ctx.user = req.user = __webpack_require__(11).verify(apiKey, secret);
	        }
	        catch (e) {
	            return options.loginError({
	                code: 401,
	                message: 'Unauthorized.',
	                error: e.message
	            }, ctx, req, res, routingInfo.baseUrl);       
	        }

	        ctx.apiKey = apiKey;

	        // Authorize

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


/***/ },
/* 11 */
/***/ function(module, exports) {

	module.exports = require("jsonwebtoken");

/***/ },
/* 12 */
/***/ function(module, exports, __webpack_require__) {

	var error = __webpack_require__(9);

	module.exports = function(options, ctx, req, res, routingInfo) {
	    var authParams = {
	        clientId: options.clientId(ctx, req),
	        domain: options.domain(ctx, req)
	    };
	    var count = !!authParams.clientId + !!authParams.domain;
	    var scope = 'openid name email email_verified ' + (options.scope || '');
	    if (count ===  0) {
	        // TODO, tjanczuk, support the shared Auth0 application case
	        return error({
	            code: 501,
	            message: 'Not implemented.'
	        }, res);
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
	    else if (count === 2) {
	        // Use custom Auth0 account
	        var authUrl = 'https://' + authParams.domain + '/authorize' 
	            + '?response_type=code'
	            + '&scope=' + encodeURIComponent(scope)
	            + '&client_id=' + encodeURIComponent(authParams.clientId)
	            + '&redirect_uri=' + encodeURIComponent(routingInfo.baseUrl + '/callback');
	        res.writeHead(302, { Location: authUrl });
	        return res.end();
	    }
	    else {
	        return error({
	            code: 400,
	            message: 'Both or neither Auth0 Client ID and Auth0 domain must be specified.'
	        }, res);
	    }
	};


/***/ },
/* 13 */
/***/ function(module, exports, __webpack_require__) {

	var error = __webpack_require__(9);

	module.exports = function (options, ctx, req, res, routingInfo) {
	    if (!ctx.query.code) {
	        return options.loginError({
	            code: 401,
	            message: 'Authentication error.',
	            callbackQuery: ctx.query
	        }, ctx, req, res, routingInfo.baseUrl);
	    }

	    var authParams = {
	        clientId: options.clientId(ctx, req),
	        domain: options.domain(ctx, req),
	        clientSecret: options.clientSecret(ctx, req)
	    };
	    var count = !!authParams.clientId + !!authParams.domain + !!authParams.clientSecret;
	    if (count !== 3) {
	        return error({
	            code: 400,
	            message: 'Auth0 Client ID, Client Secret, and Auth0 Domain must be specified.'
	        }, res);
	    }

	    return __webpack_require__(14)
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

	            return issueApiKey(ares.body.id_token);
	        });

	    function issueApiKey(id_token) {
	        var jwt = __webpack_require__(11);
	        var claims;
	        try {
	            claims = jwt.decode(id_token);
	        }
	        catch (e) {
	            return options.loginError({
	                code: 502,
	                message: 'Cannot parse id_token returned from Auth0.',
	                id_token: id_token,
	                error: e.message
	            }, ctx, req, res, routingInfo.baseUrl);
	        }

	        // Issue apiKey by re-signing the id_token claims 
	        // with configured secret (webtask token by default).

	        var secret = options.webtaskSecret(ctx, req);
	        if (!secret) {
	            return error({
	                code: 400,
	                message: 'The webtask secret must be be provided to allow for issuing apiKeys.'
	            }, res);
	        }

	        claims.iss = routingInfo.baseUrl;
	        req.user = ctx.user = claims;
	        ctx.apiKey = jwt.sign(claims, secret);

	        // Perform post-login action (redirect to /?apiKey=... by default)
	        return options.loginSuccess(ctx, req, res, routingInfo.baseUrl);
	    }
	};


/***/ },
/* 14 */
/***/ function(module, exports) {

	module.exports = require("superagent");

/***/ },
/* 15 */
/***/ function(module, exports) {

	module.exports = require("boom");

/***/ },
/* 16 */
/***/ function(module, exports) {

	module.exports = require("request");

/***/ },
/* 17 */
/***/ function(module, exports) {

	module.exports = require("lru-memoizer");

/***/ },
/* 18 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	var AutoCollectConsole = __webpack_require__(19);
	var AutoCollectExceptions = __webpack_require__(20);
	var AutoCollectPerformance = __webpack_require__(24);
	var AutoCollectClientRequests = __webpack_require__(27);
	var AutoCollectServerRequests = __webpack_require__(32);
	var Client = __webpack_require__(34);
	var Logging = __webpack_require__(23);
	/**
	 * The singleton meta class for the default client of the client. This class is used to setup/start and configure
	 * the auto-collection behavior of the application insights module.
	 */
	var ApplicationInsights = (function () {
	    function ApplicationInsights() {
	    }
	    /**
	     * Initializes a client with the given instrumentation key, if this is not specified, the value will be
	     * read from the environment variable APPINSIGHTS_INSTRUMENTATIONKEY
	     * @returns {ApplicationInsights/Client} a new client
	     */
	    ApplicationInsights.getClient = function (instrumentationKey) {
	        return new Client(instrumentationKey);
	    };
	    /**
	     * Initializes the default client of the client and sets the default configuration
	     * @param instrumentationKey the instrumentation key to use. Optional, if this is not specified, the value will be
	     * read from the environment variable APPINSIGHTS_INSTRUMENTATIONKEY
	     * @returns {ApplicationInsights} this class
	     */
	    ApplicationInsights.setup = function (instrumentationKey) {
	        if (!ApplicationInsights.client) {
	            ApplicationInsights.client = ApplicationInsights.getClient(instrumentationKey);
	            ApplicationInsights._console = new AutoCollectConsole(ApplicationInsights.client);
	            ApplicationInsights._exceptions = new AutoCollectExceptions(ApplicationInsights.client);
	            ApplicationInsights._performance = new AutoCollectPerformance(ApplicationInsights.client);
	            ApplicationInsights._serverRequests = new AutoCollectServerRequests(ApplicationInsights.client);
	            ApplicationInsights._clientRequests = new AutoCollectClientRequests(ApplicationInsights.client);
	        }
	        else {
	            Logging.info("The default client is already setup");
	        }
	        if (ApplicationInsights.client && ApplicationInsights.client.channel) {
	            ApplicationInsights.client.channel.setOfflineMode(ApplicationInsights._isOfflineMode);
	        }
	        return ApplicationInsights;
	    };
	    /**
	     * Starts automatic collection of telemetry. Prior to calling start no telemetry will be collected
	     * @returns {ApplicationInsights} this class
	     */
	    ApplicationInsights.start = function () {
	        if (!!this.client) {
	            ApplicationInsights._isStarted = true;
	            ApplicationInsights._console.enable(ApplicationInsights._isConsole);
	            ApplicationInsights._exceptions.enable(ApplicationInsights._isExceptions);
	            ApplicationInsights._performance.enable(ApplicationInsights._isPerformance);
	            ApplicationInsights._serverRequests.enable(ApplicationInsights._isRequests);
	            ApplicationInsights._clientRequests.enable(ApplicationInsights._isDependencies);
	        }
	        else {
	            Logging.warn("Start cannot be called before setup");
	        }
	        return ApplicationInsights;
	    };
	    /**
	     * Sets the state of console tracking (enabled by default)
	     * @param value if true console activity will be sent to Application Insights
	     * @returns {ApplicationInsights} this class
	     */
	    ApplicationInsights.setAutoCollectConsole = function (value) {
	        ApplicationInsights._isConsole = value;
	        if (ApplicationInsights._isStarted) {
	            ApplicationInsights._console.enable(value);
	        }
	        return ApplicationInsights;
	    };
	    /**
	     * Sets the state of exception tracking (enabled by default)
	     * @param value if true uncaught exceptions will be sent to Application Insights
	     * @returns {ApplicationInsights} this class
	     */
	    ApplicationInsights.setAutoCollectExceptions = function (value) {
	        ApplicationInsights._isExceptions = value;
	        if (ApplicationInsights._isStarted) {
	            ApplicationInsights._exceptions.enable(value);
	        }
	        return ApplicationInsights;
	    };
	    /**
	     * Sets the state of performance tracking (enabled by default)
	     * @param value if true performance counters will be collected every second and sent to Application Insights
	     * @returns {ApplicationInsights} this class
	     */
	    ApplicationInsights.setAutoCollectPerformance = function (value) {
	        ApplicationInsights._isPerformance = value;
	        if (ApplicationInsights._isStarted) {
	            ApplicationInsights._performance.enable(value);
	        }
	        return ApplicationInsights;
	    };
	    /**
	     * Sets the state of request tracking (enabled by default)
	     * @param value if true requests will be sent to Application Insights
	     * @returns {ApplicationInsights} this class
	     */
	    ApplicationInsights.setAutoCollectRequests = function (value) {
	        ApplicationInsights._isRequests = value;
	        if (ApplicationInsights._isStarted) {
	            ApplicationInsights._serverRequests.enable(value);
	        }
	        return ApplicationInsights;
	    };
	    /**
	     * Sets the state of dependency tracking (enabled by default)
	     * @param value if true dependencies will be sent to Application Insights
	     * @returns {ApplicationInsights} this class
	     */
	    ApplicationInsights.setAutoCollectDependencies = function (value) {
	        ApplicationInsights._isDependencies = value;
	        if (ApplicationInsights._isStarted) {
	            ApplicationInsights._clientRequests.enable(value);
	        }
	        return ApplicationInsights;
	    };
	    /**
	    * Enable or disable offline mode to cache events when client is offline (disabled by default)
	    * @param value if true events that occured while client is offline will be cached on disk
	    * @param resendInterval. The wait interval for resending cached events.
	    * @returns {ApplicationInsights} this class
	    */
	    ApplicationInsights.setOfflineMode = function (value, resendInterval) {
	        ApplicationInsights._isOfflineMode = value;
	        if (ApplicationInsights.client && ApplicationInsights.client.channel) {
	            ApplicationInsights.client.channel.setOfflineMode(value, resendInterval);
	        }
	        return ApplicationInsights;
	    };
	    /**
	     * Enables verbose debug logging
	     * @returns {ApplicationInsights} this class
	     */
	    ApplicationInsights.enableVerboseLogging = function () {
	        Logging.enableDebug = true;
	        return ApplicationInsights;
	    };
	    /**
	      * Disposes the default client and all the auto collectors so they can be reinitialized with different configuration
	      */
	    ApplicationInsights.dispose = function () {
	        ApplicationInsights.client = null;
	        ApplicationInsights._isStarted = false;
	        if (ApplicationInsights._console) {
	            ApplicationInsights._console.dispose();
	        }
	        if (ApplicationInsights._exceptions) {
	            ApplicationInsights._exceptions.dispose();
	        }
	        if (ApplicationInsights._performance) {
	            ApplicationInsights._performance.dispose();
	        }
	        if (ApplicationInsights._serverRequests) {
	            ApplicationInsights._serverRequests.dispose();
	        }
	        if (ApplicationInsights._clientRequests) {
	            ApplicationInsights._clientRequests.dispose();
	        }
	    };
	    return ApplicationInsights;
	}());
	ApplicationInsights._isConsole = true;
	ApplicationInsights._isExceptions = true;
	ApplicationInsights._isPerformance = true;
	ApplicationInsights._isRequests = true;
	ApplicationInsights._isDependencies = true;
	ApplicationInsights._isOfflineMode = false;
	ApplicationInsights._isStarted = false;
	module.exports = ApplicationInsights;


/***/ },
/* 19 */
/***/ function(module, exports) {

	"use strict";
	var AutoCollectConsole = (function () {
	    function AutoCollectConsole(client) {
	        if (!!AutoCollectConsole.INSTANCE) {
	            throw new Error("Console logging adapter tracking should be configured from the applicationInsights object");
	        }
	        this._client = client;
	        AutoCollectConsole.INSTANCE = this;
	    }
	    AutoCollectConsole.prototype.enable = function (isEnabled) {
	        // todo: investigate feasibility/utility of this; does it make sense to have a logging adapter in node?
	    };
	    AutoCollectConsole.prototype.isInitialized = function () {
	        return this._isInitialized;
	    };
	    AutoCollectConsole.prototype.dispose = function () {
	        AutoCollectConsole.INSTANCE = null;
	    };
	    return AutoCollectConsole;
	}());
	AutoCollectConsole._methodNames = ["debug", "info", "log", "warn", "error"];
	module.exports = AutoCollectConsole;


/***/ },
/* 20 */
/***/ function(module, exports, __webpack_require__) {

	///<reference path="..\typings\globals\node\index.d.ts" />
	"use strict";
	var ContractsModule = __webpack_require__(21);
	var Util = __webpack_require__(22);
	var AutoCollectExceptions = (function () {
	    function AutoCollectExceptions(client) {
	        if (!!AutoCollectExceptions.INSTANCE) {
	            throw new Error("Exception tracking should be configured from the applicationInsights object");
	        }
	        AutoCollectExceptions.INSTANCE = this;
	        this._client = client;
	    }
	    AutoCollectExceptions.prototype.isInitialized = function () {
	        return this._isInitialized;
	    };
	    AutoCollectExceptions.prototype.enable = function (isEnabled) {
	        var _this = this;
	        if (isEnabled) {
	            this._isInitialized = true;
	            var self = this;
	            if (!this._exceptionListenerHandle) {
	                var handle = function (reThrow, error) {
	                    var data = AutoCollectExceptions.getExceptionData(error, false);
	                    var envelope = _this._client.getEnvelope(data);
	                    _this._client.channel.handleCrash(envelope);
	                    if (reThrow) {
	                        throw error;
	                    }
	                };
	                this._exceptionListenerHandle = handle.bind(this, true);
	                this._rejectionListenerHandle = handle.bind(this, false);
	                process.on("uncaughtException", this._exceptionListenerHandle);
	                process.on("unhandledRejection", this._rejectionListenerHandle);
	            }
	        }
	        else {
	            if (this._exceptionListenerHandle) {
	                process.removeListener("uncaughtException", this._exceptionListenerHandle);
	                process.removeListener("unhandledRejection", this._rejectionListenerHandle);
	                this._exceptionListenerHandle = undefined;
	                this._rejectionListenerHandle = undefined;
	                delete this._exceptionListenerHandle;
	                delete this._rejectionListenerHandle;
	            }
	        }
	    };
	    /**
	     * Track an exception
	     * @param error the exception to track
	     * @param handledAt where this exception was handled (leave null for unhandled)
	     * @param properties additional properties
	     * @param measurements metrics associated with this event, displayed in Metrics Explorer on the portal. Defaults to empty.
	     */
	    AutoCollectExceptions.getExceptionData = function (error, isHandled, properties, measurements) {
	        var exception = new ContractsModule.Contracts.ExceptionData();
	        exception.properties = properties;
	        exception.severityLevel = ContractsModule.Contracts.SeverityLevel.Error;
	        exception.measurements = measurements;
	        exception.exceptions = [];
	        var stack = error["stack"];
	        var exceptionDetails = new ContractsModule.Contracts.ExceptionDetails();
	        exceptionDetails.message = error.message;
	        exceptionDetails.typeName = error.name;
	        exceptionDetails.parsedStack = this.parseStack(stack);
	        exceptionDetails.hasFullStack = Util.isArray(exceptionDetails.parsedStack) && exceptionDetails.parsedStack.length > 0;
	        exception.exceptions.push(exceptionDetails);
	        var data = new ContractsModule.Contracts.Data();
	        data.baseType = "Microsoft.ApplicationInsights.ExceptionData";
	        data.baseData = exception;
	        return data;
	    };
	    AutoCollectExceptions.parseStack = function (stack) {
	        var parsedStack = undefined;
	        if (typeof stack === "string") {
	            var frames = stack.split("\n");
	            parsedStack = [];
	            var level = 0;
	            var totalSizeInBytes = 0;
	            for (var i = 0; i <= frames.length; i++) {
	                var frame = frames[i];
	                if (_StackFrame.regex.test(frame)) {
	                    var parsedFrame = new _StackFrame(frames[i], level++);
	                    totalSizeInBytes += parsedFrame.sizeInBytes;
	                    parsedStack.push(parsedFrame);
	                }
	            }
	            // DP Constraint - exception parsed stack must be < 32KB
	            // remove frames from the middle to meet the threshold
	            var exceptionParsedStackThreshold = 32 * 1024;
	            if (totalSizeInBytes > exceptionParsedStackThreshold) {
	                var left = 0;
	                var right = parsedStack.length - 1;
	                var size = 0;
	                var acceptedLeft = left;
	                var acceptedRight = right;
	                while (left < right) {
	                    // check size
	                    var lSize = parsedStack[left].sizeInBytes;
	                    var rSize = parsedStack[right].sizeInBytes;
	                    size += lSize + rSize;
	                    if (size > exceptionParsedStackThreshold) {
	                        // remove extra frames from the middle
	                        var howMany = acceptedRight - acceptedLeft + 1;
	                        parsedStack.splice(acceptedLeft, howMany);
	                        break;
	                    }
	                    // update pointers
	                    acceptedLeft = left;
	                    acceptedRight = right;
	                    left++;
	                    right--;
	                }
	            }
	        }
	        return parsedStack;
	    };
	    AutoCollectExceptions.prototype.dispose = function () {
	        AutoCollectExceptions.INSTANCE = null;
	        this._isInitialized = false;
	    };
	    return AutoCollectExceptions;
	}());
	AutoCollectExceptions.INSTANCE = null;
	var _StackFrame = (function () {
	    function _StackFrame(frame, level) {
	        this.sizeInBytes = 0;
	        this.level = level;
	        this.method = "<no_method>";
	        this.assembly = Util.trim(frame);
	        var matches = frame.match(_StackFrame.regex);
	        if (matches && matches.length >= 5) {
	            this.method = Util.trim(matches[2]) || this.method;
	            this.fileName = Util.trim(matches[4]) || "<no_filename>";
	            this.line = parseInt(matches[5]) || 0;
	        }
	        this.sizeInBytes += this.method.length;
	        this.sizeInBytes += this.fileName.length;
	        this.sizeInBytes += this.assembly.length;
	        // todo: these might need to be removed depending on how the back-end settles on their size calculation
	        this.sizeInBytes += _StackFrame.baseSize;
	        this.sizeInBytes += this.level.toString().length;
	        this.sizeInBytes += this.line.toString().length;
	    }
	    return _StackFrame;
	}());
	// regex to match stack frames from ie/chrome/ff
	// methodName=$2, fileName=$4, lineNo=$5, column=$6
	_StackFrame.regex = /^([\s]+at)?(.*?)(\@|\s\(|\s)([^\(\@\n]+):([0-9]+):([0-9]+)(\)?)$/;
	_StackFrame.baseSize = 58; //'{"method":"","level":,"assembly":"","fileName":"","line":}'.length
	module.exports = AutoCollectExceptions;


/***/ },
/* 21 */
/***/ function(module, exports) {

	// this file is manually constructed and many types and fields here are deprecated.
	// Need to switch to use Declarations\Constracts\Generated instead
	// This will be consistent with JavaScript SDK
	"use strict";
	var __extends = (this && this.__extends) || function (d, b) {
	    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
	    function __() { this.constructor = d; }
	    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	};
	var Contracts;
	(function (Contracts) {
	    var DataPointType;
	    (function (DataPointType) {
	        DataPointType[DataPointType["Measurement"] = 0] = "Measurement";
	        DataPointType[DataPointType["Aggregation"] = 1] = "Aggregation";
	    })(DataPointType = Contracts.DataPointType || (Contracts.DataPointType = {}));
	    var SeverityLevel;
	    (function (SeverityLevel) {
	        SeverityLevel[SeverityLevel["Verbose"] = 0] = "Verbose";
	        SeverityLevel[SeverityLevel["Information"] = 1] = "Information";
	        SeverityLevel[SeverityLevel["Warning"] = 2] = "Warning";
	        SeverityLevel[SeverityLevel["Error"] = 3] = "Error";
	        SeverityLevel[SeverityLevel["Critical"] = 4] = "Critical";
	    })(SeverityLevel = Contracts.SeverityLevel || (Contracts.SeverityLevel = {}));
	    var ContextTagKeys = (function () {
	        function ContextTagKeys() {
	            this.applicationVersion = "ai.application.ver";
	            this.deviceId = "ai.device.id";
	            this.deviceLocale = "ai.device.locale";
	            this.deviceModel = "ai.device.model";
	            this.deviceOEMName = "ai.device.oemName";
	            this.deviceOSVersion = "ai.device.osVersion";
	            this.deviceType = "ai.device.type";
	            this.locationIp = "ai.location.ip";
	            this.operationId = "ai.operation.id";
	            this.operationName = "ai.operation.name";
	            this.operationParentId = "ai.operation.parentId";
	            this.operationSyntheticSource = "ai.operation.syntheticSource";
	            this.operationCorrelationVector = "ai.operation.correlationVector";
	            this.sessionId = "ai.session.id";
	            this.sessionIsFirst = "ai.session.isFirst";
	            this.userAccountId = "ai.user.accountId";
	            this.userAgent = "ai.user.userAgent";
	            this.userId = "ai.user.id";
	            this.userAuthUserId = "ai.user.authUserId";
	            this.cloudRole = "ai.cloud.role";
	            this.cloudRoleInstance = "ai.cloud.roleInstance";
	            this.internalSdkVersion = "ai.internal.sdkVersion";
	            this.internalAgentVersion = "ai.internal.agentVersion";
	            this.internalNodeName = "ai.internal.nodeName";
	        }
	        return ContextTagKeys;
	    }());
	    Contracts.ContextTagKeys = ContextTagKeys;
	    var Domain = (function () {
	        function Domain() {
	        }
	        return Domain;
	    }());
	    Contracts.Domain = Domain;
	    var Data = (function () {
	        function Data() {
	        }
	        return Data;
	    }());
	    Contracts.Data = Data;
	    var Envelope = (function () {
	        function Envelope() {
	            this.ver = 1;
	            // the 'name' property must be initialized before 'tags' and/or 'data'.
	            this.name = "";
	            // the 'time' property must be initialized before 'tags' and/or 'data'.
	            this.time = "";
	            this.sampleRate = 100.0;
	            this.tags = {};
	        }
	        return Envelope;
	    }());
	    Contracts.Envelope = Envelope;
	    var EventData = (function (_super) {
	        __extends(EventData, _super);
	        function EventData() {
	            var _this = _super.call(this) || this;
	            _this.ver = 2;
	            _this.properties = {};
	            _this.measurements = {};
	            _this = _super.call(this) || this;
	            return _this;
	        }
	        return EventData;
	    }(Contracts.Domain));
	    Contracts.EventData = EventData;
	    var MessageData = (function (_super) {
	        __extends(MessageData, _super);
	        function MessageData() {
	            var _this = _super.call(this) || this;
	            _this.ver = 2;
	            _this.properties = {};
	            _this = _super.call(this) || this;
	            return _this;
	        }
	        return MessageData;
	    }(Contracts.Domain));
	    Contracts.MessageData = MessageData;
	    var ExceptionData = (function (_super) {
	        __extends(ExceptionData, _super);
	        function ExceptionData() {
	            var _this = _super.call(this) || this;
	            _this.ver = 2;
	            _this.exceptions = [];
	            _this.properties = {};
	            _this.measurements = {};
	            return _this;
	        }
	        return ExceptionData;
	    }(Contracts.Domain));
	    Contracts.ExceptionData = ExceptionData;
	    var StackFrame = (function () {
	        function StackFrame() {
	        }
	        return StackFrame;
	    }());
	    Contracts.StackFrame = StackFrame;
	    var ExceptionDetails = (function () {
	        function ExceptionDetails() {
	            this.hasFullStack = true;
	            this.parsedStack = [];
	        }
	        return ExceptionDetails;
	    }());
	    Contracts.ExceptionDetails = ExceptionDetails;
	    var DataPoint = (function () {
	        function DataPoint() {
	            this.kind = Contracts.DataPointType.Measurement;
	        }
	        return DataPoint;
	    }());
	    Contracts.DataPoint = DataPoint;
	    var MetricData = (function (_super) {
	        __extends(MetricData, _super);
	        function MetricData() {
	            var _this = _super.call(this) || this;
	            _this.ver = 2;
	            _this.metrics = [];
	            _this.properties = {};
	            _this = _super.call(this) || this;
	            return _this;
	        }
	        return MetricData;
	    }(Contracts.Domain));
	    Contracts.MetricData = MetricData;
	    var PageViewData = (function (_super) {
	        __extends(PageViewData, _super);
	        function PageViewData() {
	            var _this = _super.call(this) || this;
	            _this.ver = 2;
	            _this.properties = {};
	            _this.measurements = {};
	            _this = _super.call(this) || this;
	            return _this;
	        }
	        return PageViewData;
	    }(Contracts.EventData));
	    Contracts.PageViewData = PageViewData;
	    var PageViewPerfData = (function (_super) {
	        __extends(PageViewPerfData, _super);
	        function PageViewPerfData() {
	            var _this = _super.call(this) || this;
	            _this.ver = 2;
	            _this.properties = {};
	            _this.measurements = {};
	            return _this;
	        }
	        return PageViewPerfData;
	    }(Contracts.PageViewData));
	    Contracts.PageViewPerfData = PageViewPerfData;
	    var RemoteDependencyDataConstants = (function () {
	        function RemoteDependencyDataConstants() {
	        }
	        return RemoteDependencyDataConstants;
	    }());
	    RemoteDependencyDataConstants.TYPE_HTTP = "Http";
	    Contracts.RemoteDependencyDataConstants = RemoteDependencyDataConstants;
	    var RemoteDependencyData = (function (_super) {
	        __extends(RemoteDependencyData, _super);
	        function RemoteDependencyData() {
	            var _this = _super.call(this) || this;
	            _this.ver = 2;
	            _this.success = true;
	            _this.properties = {};
	            _this.measurements = {};
	            return _this;
	        }
	        return RemoteDependencyData;
	    }(Contracts.Domain));
	    Contracts.RemoteDependencyData = RemoteDependencyData;
	    var AjaxCallData = (function (_super) {
	        __extends(AjaxCallData, _super);
	        function AjaxCallData() {
	            var _this = _super.call(this) || this;
	            _this.ver = 2;
	            _this.properties = {};
	            _this.measurements = {};
	            _this = _super.call(this) || this;
	            return _this;
	        }
	        return AjaxCallData;
	    }(Contracts.PageViewData));
	    Contracts.AjaxCallData = AjaxCallData;
	    var RequestData = (function (_super) {
	        __extends(RequestData, _super);
	        function RequestData() {
	            var _this = _super.call(this) || this;
	            _this.ver = 2;
	            _this.properties = {};
	            _this.measurements = {};
	            return _this;
	        }
	        return RequestData;
	    }(Contracts.Domain));
	    Contracts.RequestData = RequestData;
	    var PerformanceCounterData = (function (_super) {
	        __extends(PerformanceCounterData, _super);
	        function PerformanceCounterData() {
	            var _this = _super.call(this) || this;
	            _this.ver = 2;
	            _this.kind = DataPointType.Aggregation;
	            _this.properties = {};
	            _this = _super.call(this) || this;
	            return _this;
	        }
	        return PerformanceCounterData;
	    }(Contracts.Domain));
	    Contracts.PerformanceCounterData = PerformanceCounterData;
	})(Contracts = exports.Contracts || (exports.Contracts = {}));


/***/ },
/* 22 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	var url = __webpack_require__(8);
	var Logging = __webpack_require__(23);
	var Util = (function () {
	    function Util() {
	    }
	    /**
	     * helper method to access userId and sessionId cookie
	     */
	    Util.getCookie = function (name, cookie) {
	        var value = "";
	        if (name && name.length && typeof cookie === "string") {
	            var cookieName = name + "=";
	            var cookies = cookie.split(";");
	            for (var i = 0; i < cookies.length; i++) {
	                var cookie = cookies[i];
	                cookie = Util.trim(cookie);
	                if (cookie && cookie.indexOf(cookieName) === 0) {
	                    value = cookie.substring(cookieName.length, cookies[i].length);
	                    break;
	                }
	            }
	        }
	        return value;
	    };
	    /**
	     * helper method to trim strings (IE8 does not implement String.prototype.trim)
	     */
	    Util.trim = function (str) {
	        if (typeof str === "string") {
	            return str.replace(/^\s+|\s+$/g, "");
	        }
	        else {
	            return "";
	        }
	    };
	    /**
	     * Convert an array of int32 to Base64 (no '==' at the end).
	     * MSB first.
	     */
	    Util.int32ArrayToBase64 = function (array) {
	        var toChar = function (v, i) {
	            return String.fromCharCode((v >> i) & 0xFF);
	        };
	        var int32AsString = function (v) {
	            return toChar(v, 24) + toChar(v, 16) + toChar(v, 8) + toChar(v, 0);
	        };
	        var x = array.map(int32AsString).join("");
	        var s = new Buffer(x, "binary").toString("base64");
	        return s.substr(0, s.indexOf("="));
	    };
	    /**
	     * generate a random 32bit number (-0x80000000..0x7FFFFFFF).
	     */
	    Util.random32 = function () {
	        return (0x100000000 * Math.random()) | 0;
	    };
	    /**
	     * generate GUID
	     */
	    Util.newGuid = function () {
	        var hexValues = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "A", "B", "C", "D", "E", "F"];
	        // c.f. rfc4122 (UUID version 4 = xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx)
	        var oct = "", tmp;
	        for (var a = 0; a < 4; a++) {
	            tmp = Util.random32();
	            oct +=
	                hexValues[tmp & 0xF] +
	                    hexValues[tmp >> 4 & 0xF] +
	                    hexValues[tmp >> 8 & 0xF] +
	                    hexValues[tmp >> 12 & 0xF] +
	                    hexValues[tmp >> 16 & 0xF] +
	                    hexValues[tmp >> 20 & 0xF] +
	                    hexValues[tmp >> 24 & 0xF] +
	                    hexValues[tmp >> 28 & 0xF];
	        }
	        // "Set the two most significant bits (bits 6 and 7) of the clock_seq_hi_and_reserved to zero and one, respectively"
	        var clockSequenceHi = hexValues[8 + (Math.random() * 4) | 0];
	        return oct.substr(0, 8) + "-" + oct.substr(9, 4) + "-4" + oct.substr(13, 3) + "-" + clockSequenceHi + oct.substr(16, 3) + "-" + oct.substr(19, 12);
	    };
	    /**
	     * Check if an object is of type Array
	     */
	    Util.isArray = function (obj) {
	        return Object.prototype.toString.call(obj) === "[object Array]";
	    };
	    /**
	     * Check if an object is of type Error
	     */
	    Util.isError = function (obj) {
	        return obj instanceof Error;
	    };
	    /**
	     * Check if an object is of type Date
	     */
	    Util.isDate = function (obj) {
	        return Object.prototype.toString.call(obj) === "[object Date]";
	    };
	    /**
	     * Convert ms to c# time span format
	     */
	    Util.msToTimeSpan = function (totalms) {
	        if (isNaN(totalms) || totalms < 0) {
	            totalms = 0;
	        }
	        var ms = "" + totalms % 1000;
	        var sec = "" + Math.floor(totalms / 1000) % 60;
	        var min = "" + Math.floor(totalms / (1000 * 60)) % 60;
	        var hour = "" + Math.floor(totalms / (1000 * 60 * 60)) % 24;
	        ms = ms.length === 1 ? "00" + ms : ms.length === 2 ? "0" + ms : ms;
	        sec = sec.length < 2 ? "0" + sec : sec;
	        min = min.length < 2 ? "0" + min : min;
	        hour = hour.length < 2 ? "0" + hour : hour;
	        return hour + ":" + min + ":" + sec + "." + ms;
	    };
	    /**
	     * Validate that an object is of type { [key: string]: string }
	     */
	    Util.validateStringMap = function (obj) {
	        var map;
	        if (typeof obj === "object") {
	            map = {};
	            for (var field in obj) {
	                var property = obj[field];
	                var propertyType = typeof property;
	                if (propertyType !== "string") {
	                    if (property && typeof property.toString === "function") {
	                        property = property.toString();
	                    }
	                    else {
	                        property = "invalid property type: " + propertyType;
	                    }
	                }
	                map[field] = property.trim(0, Util.MAX_PROPERTY_LENGTH);
	            }
	        }
	        else {
	            Logging.info("Invalid properties dropped from payload");
	        }
	        return map;
	    };
	    /**
	     * Checks if a request url is not on a excluded domain list
	     * and if it is safe to add correlation headers (x-ms-request-source-ikey, x-ms-request-target-ikey)
	     */
	    Util.canIncludeCorrelationHeader = function (client, requestUrl) {
	        var excludedDomains = client && client.config && client.config.correlationHeaderExcludedDomains;
	        if (!excludedDomains || excludedDomains.length == 0 || !requestUrl) {
	            return true;
	        }
	        for (var i = 0; i < excludedDomains.length; i++) {
	            var regex = new RegExp(excludedDomains[i].replace(/\./g, "\.").replace(/\*/g, ".*"));
	            return !regex.test(url.parse(requestUrl).hostname);
	        }
	        return true;
	    };
	    return Util;
	}());
	Util.MAX_PROPERTY_LENGTH = 1024;
	Util.document = typeof document !== "undefined" ? document : {};
	module.exports = Util;


/***/ },
/* 23 */
/***/ function(module, exports) {

	"use strict";
	var Logging = (function () {
	    function Logging() {
	    }
	    Logging.info = function (message) {
	        var optionalParams = [];
	        for (var _i = 1; _i < arguments.length; _i++) {
	            optionalParams[_i - 1] = arguments[_i];
	        }
	        if (Logging.enableDebug) {
	            console.info(Logging.TAG + message, optionalParams);
	        }
	    };
	    Logging.warn = function (message) {
	        var optionalParams = [];
	        for (var _i = 1; _i < arguments.length; _i++) {
	            optionalParams[_i - 1] = arguments[_i];
	        }
	        if (!Logging.disableWarnings) {
	            console.warn(Logging.TAG + message, optionalParams);
	        }
	    };
	    return Logging;
	}());
	Logging.enableDebug = false;
	Logging.disableWarnings = false;
	Logging.TAG = "ApplicationInsights:";
	module.exports = Logging;


/***/ },
/* 24 */
/***/ function(module, exports, __webpack_require__) {

	///<reference path="..\typings\globals\node\index.d.ts" />
	"use strict";
	var http = __webpack_require__(25);
	var os = __webpack_require__(26);
	var ContractsModule = __webpack_require__(21);
	var Logging = __webpack_require__(23);
	var PerfCounterType;
	(function (PerfCounterType) {
	    PerfCounterType[PerfCounterType["ProcessorTime"] = 0] = "ProcessorTime";
	    PerfCounterType[PerfCounterType["AvailableMemory"] = 1] = "AvailableMemory";
	    PerfCounterType[PerfCounterType["RequestsPerSec"] = 2] = "RequestsPerSec";
	    PerfCounterType[PerfCounterType["PrivateBytes"] = 3] = "PrivateBytes";
	    PerfCounterType[PerfCounterType["RequestExecutionTime"] = 4] = "RequestExecutionTime";
	    PerfCounterType[PerfCounterType["PercentProcessorTime"] = 5] = "PercentProcessorTime";
	})(PerfCounterType || (PerfCounterType = {}));
	var AutoCollectPerformance = (function () {
	    function AutoCollectPerformance(client) {
	        if (!!AutoCollectPerformance.INSTANCE) {
	            throw new Error("Performance tracking should be configured from the applicationInsights object");
	        }
	        AutoCollectPerformance.INSTANCE = this;
	        this._isInitialized = false;
	        this._client = client;
	    }
	    AutoCollectPerformance.prototype.enable = function (isEnabled) {
	        var _this = this;
	        this._isEnabled = isEnabled;
	        if (this._isEnabled && !this._isInitialized) {
	            this._initialize();
	        }
	        if (isEnabled) {
	            if (!this._handle) {
	                this._lastCpus = os.cpus();
	                this._lastRequests = {
	                    totalRequestCount: AutoCollectPerformance._totalRequestCount,
	                    totalFailedRequestCount: AutoCollectPerformance._totalFailedRequestCount,
	                    time: +new Date
	                };
	                this._handle = setInterval(function () { return _this.trackPerformance(); }, 10000);
	            }
	        }
	        else {
	            if (this._handle) {
	                clearInterval(this._handle);
	                this._handle = undefined;
	            }
	        }
	    };
	    AutoCollectPerformance.prototype.isInitialized = function () {
	        return this._isInitialized;
	    };
	    AutoCollectPerformance.prototype._initialize = function () {
	        var _this = this;
	        this._isInitialized = true;
	        var originalServer = http.createServer;
	        http.createServer = function (onRequest) {
	            return originalServer(function (request, response) {
	                if (_this._isEnabled) {
	                    AutoCollectPerformance.countRequest(request, response);
	                }
	                if (typeof onRequest === "function") {
	                    onRequest(request, response);
	                }
	            });
	        };
	    };
	    AutoCollectPerformance.countRequest = function (request, response) {
	        var _this = this;
	        var start = +new Date;
	        if (!request || !response) {
	            Logging.warn("AutoCollectPerformance.countRequest was called with invalid parameters: ", !!request, !!response);
	            return;
	        }
	        // response listeners
	        if (typeof response.once === "function") {
	            response.once("finish", function () {
	                var end = +new Date;
	                _this._lastRequestExecutionTime = end - start;
	                AutoCollectPerformance._totalRequestCount++;
	                if (response.statusCode >= 400) {
	                    AutoCollectPerformance._totalFailedRequestCount++;
	                }
	            });
	        }
	    };
	    AutoCollectPerformance.prototype.trackPerformance = function () {
	        this._trackCpu();
	        this._trackMemory();
	        this._trackNetwork();
	    };
	    // this is necessary to accommodate some point-in-time UI quirks
	    AutoCollectPerformance.prototype._trackLegacyPerformance = function (counterType, value) {
	        var perfmetric = new ContractsModule.Contracts.PerformanceCounterData();
	        // semantic descriptions of these can be found here: https://support.microsoft.com/en-us/kb/815159/
	        switch (counterType) {
	            case PerfCounterType.ProcessorTime:
	                perfmetric.categoryName = "Process";
	                perfmetric.counterName = "% Processor Time";
	                break;
	            case PerfCounterType.AvailableMemory:
	                perfmetric.categoryName = "Memory";
	                perfmetric.counterName = "Available Bytes";
	                break;
	            case PerfCounterType.RequestsPerSec:
	                perfmetric.categoryName = "ASP.NET Applications";
	                perfmetric.counterName = "Requests/Sec";
	                break;
	            case PerfCounterType.PrivateBytes:
	                perfmetric.categoryName = "Process";
	                perfmetric.counterName = "Private Bytes";
	                break;
	            case PerfCounterType.RequestExecutionTime:
	                perfmetric.categoryName = "ASP.NET Applications";
	                perfmetric.counterName = "Request Execution Time";
	                break;
	            case PerfCounterType.PercentProcessorTime:
	                perfmetric.categoryName = "Processor";
	                perfmetric.counterName = "% Processor Time";
	                break;
	        }
	        perfmetric.count = 1;
	        perfmetric.kind = ContractsModule.Contracts.DataPointType.Aggregation;
	        perfmetric.max = value;
	        perfmetric.min = value;
	        perfmetric.stdDev = 0;
	        perfmetric.value = value;
	        var data = new ContractsModule.Contracts.Data();
	        data.baseType = "Microsoft.ApplicationInsights.PerformanceCounterData";
	        data.baseData = perfmetric;
	        this._client.track(data);
	    };
	    AutoCollectPerformance.prototype._trackCpu = function () {
	        // this reports total ms spent in each category since the OS was booted, to calculate percent it is necessary
	        // to find the delta since the last measurement
	        var cpus = os.cpus();
	        if (cpus && cpus.length && this._lastCpus && cpus.length === this._lastCpus.length) {
	            var totalUser = 0;
	            var totalSys = 0;
	            var totalNice = 0;
	            var totalIdle = 0;
	            var totalIrq = 0;
	            for (var i = 0; !!cpus && i < cpus.length; i++) {
	                var cpu = cpus[i];
	                var lastCpu = this._lastCpus[i];
	                var name = "% cpu(" + i + ") ";
	                var model = cpu.model;
	                var speed = cpu.speed;
	                var times = cpu.times;
	                var lastTimes = lastCpu.times;
	                // user cpu time (or) % CPU time spent in user space
	                var user = (times.user - lastTimes.user) || 0;
	                totalUser += user;
	                // system cpu time (or) % CPU time spent in kernel space
	                var sys = (times.sys - lastTimes.sys) || 0;
	                totalSys += sys;
	                // user nice cpu time (or) % CPU time spent on low priority processes
	                var nice = (times.nice - lastTimes.nice) || 0;
	                totalNice += nice;
	                // idle cpu time (or) % CPU time spent idle
	                var idle = (times.idle - lastTimes.idle) || 0;
	                totalIdle += idle;
	                // irq (or) % CPU time spent servicing/handling hardware interrupts
	                var irq = (times.irq - lastTimes.irq) || 0;
	                totalIrq += irq;
	                var total = (user + sys + nice + idle + irq) || 1; // don"t let this be 0 since it is a divisor
	                this._client.trackMetric(name + "user", user / total);
	            }
	            var combinedName = "% total cpu ";
	            var combinedTotal = (totalUser + totalSys + totalNice + totalIdle + totalIrq) || 1;
	            this._client.trackMetric(combinedName + "user", totalUser / combinedTotal);
	            this._client.trackMetric(combinedName + "sys", totalSys / combinedTotal);
	            this._client.trackMetric(combinedName + "nice", totalNice / combinedTotal);
	            this._client.trackMetric(combinedName + "idle", totalIdle / combinedTotal);
	            this._client.trackMetric(combinedName + "irq", totalIrq / combinedTotal);
	            // todo: remove this legacy counter once the UI updates (~june 2015)
	            this._trackLegacyPerformance(PerfCounterType.ProcessorTime, totalUser / combinedTotal);
	            this._trackLegacyPerformance(PerfCounterType.PercentProcessorTime, (combinedTotal - totalIdle) / combinedTotal);
	        }
	        this._lastCpus = cpus;
	    };
	    AutoCollectPerformance.prototype._trackMemory = function () {
	        var totalMem = os.totalmem();
	        var freeMem = os.freemem();
	        var usedMem = totalMem - freeMem;
	        var percentUsedMem = usedMem / (totalMem || 1);
	        var percentAvailableMem = freeMem / (totalMem || 1);
	        this._client.trackMetric("Memory Used", usedMem);
	        this._client.trackMetric("Memory Free", freeMem);
	        this._client.trackMetric("Memory Total", totalMem);
	        this._client.trackMetric("% Memory Used", percentUsedMem);
	        this._client.trackMetric("% Memory Free", percentAvailableMem);
	        // todo: remove this legacy counter once the UI updates (~june 2015)
	        this._trackLegacyPerformance(PerfCounterType.AvailableMemory, freeMem);
	        this._trackLegacyPerformance(PerfCounterType.PrivateBytes, usedMem);
	    };
	    AutoCollectPerformance.prototype._trackNetwork = function () {
	        // track total request counters
	        var lastRequests = this._lastRequests;
	        var requests = {
	            totalRequestCount: AutoCollectPerformance._totalRequestCount,
	            totalFailedRequestCount: AutoCollectPerformance._totalFailedRequestCount,
	            time: +new Date
	        };
	        var intervalRequests = (requests.totalRequestCount - lastRequests.totalRequestCount) || 0;
	        var intervalFailedRequests = (requests.totalFailedRequestCount - lastRequests.totalFailedRequestCount) || 0;
	        var elapsedMs = requests.time - lastRequests.time;
	        var elapsedSeconds = elapsedMs / 1000;
	        if (elapsedMs > 0) {
	            var requestsPerSec = intervalRequests / elapsedSeconds;
	            var failedRequestsPerSec = intervalFailedRequests / elapsedSeconds;
	            this._client.trackMetric("Total Requests", requests.totalRequestCount);
	            this._client.trackMetric("Total Failed Requests", requests.totalFailedRequestCount);
	            this._client.trackMetric("Requests per Second", requestsPerSec);
	            this._client.trackMetric("Failed Requests per Second", failedRequestsPerSec);
	            this._client.trackMetric("Last Request Execution Time", AutoCollectPerformance._lastRequestExecutionTime);
	            // todo: remove this legacy counter once the UI updates (~june 2015)
	            this._trackLegacyPerformance(PerfCounterType.RequestsPerSec, requestsPerSec);
	            this._trackLegacyPerformance(PerfCounterType.RequestExecutionTime, AutoCollectPerformance._lastRequestExecutionTime);
	        }
	        this._lastRequests = requests;
	    };
	    AutoCollectPerformance.prototype.dispose = function () {
	        AutoCollectPerformance.INSTANCE = null;
	        this._isInitialized = false;
	    };
	    return AutoCollectPerformance;
	}());
	AutoCollectPerformance._totalRequestCount = 0;
	AutoCollectPerformance._totalFailedRequestCount = 0;
	AutoCollectPerformance._lastRequestExecutionTime = 0;
	module.exports = AutoCollectPerformance;


/***/ },
/* 25 */
/***/ function(module, exports) {

	module.exports = require("http");

/***/ },
/* 26 */
/***/ function(module, exports) {

	module.exports = require("os");

/***/ },
/* 27 */
/***/ function(module, exports, __webpack_require__) {

	///<reference path="..\typings\globals\node\index.d.ts" />
	"use strict";
	var http = __webpack_require__(25);
	var https = __webpack_require__(28);
	var Logging = __webpack_require__(23);
	var Util = __webpack_require__(22);
	var RequestResponseHeaders = __webpack_require__(29);
	var ClientRequestParser = __webpack_require__(30);
	var AutoCollectClientRequests = (function () {
	    function AutoCollectClientRequests(client) {
	        if (!!AutoCollectClientRequests.INSTANCE) {
	            throw new Error("Client request tracking should be configured from the applicationInsights object");
	        }
	        AutoCollectClientRequests.INSTANCE = this;
	        this._client = client;
	    }
	    AutoCollectClientRequests.prototype.enable = function (isEnabled) {
	        this._isEnabled = isEnabled;
	        if (this._isEnabled && !this._isInitialized) {
	            this._initialize();
	        }
	    };
	    AutoCollectClientRequests.prototype.isInitialized = function () {
	        return this._isInitialized;
	    };
	    AutoCollectClientRequests.prototype._initialize = function () {
	        var _this = this;
	        this._isInitialized = true;
	        var originalRequest = http.request;
	        http.request = function (options) {
	            var requestArgs = [];
	            for (var _i = 1; _i < arguments.length; _i++) {
	                requestArgs[_i - 1] = arguments[_i];
	            }
	            var request = originalRequest.call.apply(originalRequest, [http, options].concat(requestArgs));
	            if (request && options && !options[AutoCollectClientRequests.disableCollectionRequestOption]) {
	                AutoCollectClientRequests.trackRequest(_this._client, options, request);
	            }
	            return request;
	        };
	        // On node >= v0.11.12, https.request just calls http.request (with additional options).
	        // But on older versions, https.request needs to be patched also.
	        // The regex matches versions < 0.11.12 (avoiding a semver package dependency).
	        if (/^0\.([0-9]\.)|(10\.)|(11\.([0-9]|10|11)$)/.test(process.versions.node)) {
	            var originalHttpsRequest_1 = https.request;
	            https.request = function (options) {
	                var requestArgs = [];
	                for (var _i = 1; _i < arguments.length; _i++) {
	                    requestArgs[_i - 1] = arguments[_i];
	                }
	                var request = originalHttpsRequest_1.call.apply(originalHttpsRequest_1, [https, options].concat(requestArgs));
	                if (request && options && !options[AutoCollectClientRequests.disableCollectionRequestOption]) {
	                    AutoCollectClientRequests.trackRequest(_this._client, options, request);
	                }
	                return request;
	            };
	        }
	    };
	    /**
	     * Tracks an outgoing request. Because it may set headers this method must be called before
	     * writing content to or ending the request.
	     */
	    AutoCollectClientRequests.trackRequest = function (client, requestOptions, request, properties) {
	        if (!requestOptions || !request || !client) {
	            Logging.info("AutoCollectClientRequests.trackRequest was called with invalid parameters: ", !requestOptions, !request, !client);
	            return;
	        }
	        var requestParser = new ClientRequestParser(requestOptions, request);
	        // Add the source ikey hash to the request headers, if a value was not already provided.
	        // The getHeader/setHeader methods aren't available on very old Node versions, and
	        // are not included in the v0.10 type declarations currently used. So check if the
	        // methods exist before invoking them.
	        if (client.config && client.config.instrumentationKeyHash &&
	            Util.canIncludeCorrelationHeader(client, requestParser.getUrl()) &&
	            request['getHeader'] && request['setHeader'] &&
	            !request['getHeader'](RequestResponseHeaders.sourceInstrumentationKeyHeader)) {
	            request['setHeader'](RequestResponseHeaders.sourceInstrumentationKeyHeader, client.config.instrumentationKeyHash);
	        }
	        // Collect dependency telemetry about the request when it finishes.
	        if (request.on) {
	            request.on('response', function (response) {
	                requestParser.onResponse(response, properties);
	                var context = { "http.RequestOptions": requestOptions, "http.ClientRequest": request, "http.ClientResponse": response };
	                client.track(requestParser.getDependencyData(), null, context);
	            });
	            request.on('error', function (e) {
	                requestParser.onError(e, properties);
	                var context = { "http.RequestOptions": requestOptions, "http.ClientRequest": request, "Error": e };
	                client.track(requestParser.getDependencyData(), null, context);
	            });
	        }
	    };
	    AutoCollectClientRequests.prototype.dispose = function () {
	        AutoCollectClientRequests.INSTANCE = null;
	        this._isInitialized = false;
	    };
	    return AutoCollectClientRequests;
	}());
	AutoCollectClientRequests.disableCollectionRequestOption = 'disableAppInsightsAutoCollection';
	module.exports = AutoCollectClientRequests;


/***/ },
/* 28 */
/***/ function(module, exports) {

	module.exports = require("https");

/***/ },
/* 29 */
/***/ function(module, exports) {

	"use strict";
	module.exports = {
	    /**
	     * Source instrumentation header that is added by an application while making http
	     * requests and retrieved by the other application when processing incoming requests.
	     */
	    sourceInstrumentationKeyHeader: "x-ms-request-source-ikey",
	    /**
	     * Target instrumentation header that is added to the response and retrieved by the
	     * calling application when processing incoming responses.
	     */
	    targetInstrumentationKeyHeader: "x-ms-request-target-ikey",
	    /**
	     * Header containing the id of the immidiate caller
	     */
	    parentIdHeader: "x-ms-request-id",
	    /**
	     * Header containing the correlation id that kept the same for every telemetry item
	     * accross transactions
	     */
	    rootIdHeader: "x-ms-request-root-id"
	};


/***/ },
/* 30 */
/***/ function(module, exports, __webpack_require__) {

	///<reference path="..\typings\globals\node\index.d.ts" />
	"use strict";
	var __extends = (this && this.__extends) || function (d, b) {
	    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
	    function __() { this.constructor = d; }
	    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	};
	var url = __webpack_require__(8);
	var ContractsModule = __webpack_require__(21);
	var Util = __webpack_require__(22);
	var RequestResponseHeaders = __webpack_require__(29);
	var RequestParser = __webpack_require__(31);
	/**
	 * Helper class to read data from the requst/response objects and convert them into the telemetry contract
	 */
	var ClientRequestParser = (function (_super) {
	    __extends(ClientRequestParser, _super);
	    function ClientRequestParser(requestOptions, request) {
	        var _this = _super.call(this) || this;
	        if (request && request.method && requestOptions) {
	            // The ClientRequest.method property isn't documented, but is always there.
	            _this.method = request.method;
	            _this.url = ClientRequestParser._getUrlFromRequestOptions(requestOptions, request);
	            _this.startTime = +new Date();
	        }
	        return _this;
	    }
	    /**
	     * Called when the ClientRequest emits an error event.
	     */
	    ClientRequestParser.prototype.onError = function (error, properties) {
	        this._setStatus(undefined, error, properties);
	    };
	    /**
	     * Called when the ClientRequest emits a response event.
	     */
	    ClientRequestParser.prototype.onResponse = function (response, properties) {
	        this._setStatus(response.statusCode, undefined, properties);
	        this.targetIKeyHash =
	            response.headers && response.headers[RequestResponseHeaders.targetInstrumentationKeyHeader];
	    };
	    /**
	     * Gets a dependency data contract object for a completed ClientRequest.
	     */
	    ClientRequestParser.prototype.getDependencyData = function () {
	        var urlObject = url.parse(this.url);
	        urlObject.search = undefined;
	        urlObject.hash = undefined;
	        var dependencyName = this.method.toUpperCase() + " " + urlObject.pathname;
	        var remoteDependency = new ContractsModule.Contracts.RemoteDependencyData();
	        remoteDependency.type = ContractsModule.Contracts.RemoteDependencyDataConstants.TYPE_HTTP;
	        if (this.targetIKeyHash) {
	            remoteDependency.type = "ApplicationInsights";
	            remoteDependency.target = urlObject.hostname + " | " + this.targetIKeyHash;
	        }
	        else {
	            remoteDependency.type = ContractsModule.Contracts.RemoteDependencyDataConstants.TYPE_HTTP;
	            remoteDependency.target = urlObject.hostname;
	        }
	        remoteDependency.name = dependencyName;
	        remoteDependency.data = this.url;
	        remoteDependency.duration = Util.msToTimeSpan(this.duration);
	        remoteDependency.success = this._isSuccess();
	        remoteDependency.resultCode = this.statusCode ? this.statusCode.toString() : null;
	        remoteDependency.properties = this.properties || {};
	        var data = new ContractsModule.Contracts.Data();
	        data.baseType = "Microsoft.ApplicationInsights.RemoteDependencyData";
	        data.baseData = remoteDependency;
	        return data;
	    };
	    /**
	     * Builds a URL from request options, using the same logic as http.request(). This is
	     * necessary because a ClientRequest object does not expose a url property.
	     */
	    ClientRequestParser._getUrlFromRequestOptions = function (options, request) {
	        if (typeof options === 'string') {
	            options = url.parse(options);
	        }
	        else {
	            // Avoid modifying the original options object.
	            var originalOptions_1 = options;
	            options = {};
	            if (originalOptions_1) {
	                Object.keys(originalOptions_1).forEach(function (key) {
	                    options[key] = originalOptions_1[key];
	                });
	            }
	        }
	        // Oddly, url.format ignores path and only uses pathname and search,
	        // so create them from the path, if path was specified
	        if (options.path) {
	            var parsedQuery = url.parse(options.path);
	            options.pathname = parsedQuery.pathname;
	            options.search = parsedQuery.search;
	        }
	        // Simiarly, url.format ignores hostname and port if host is specified,
	        // even if host doesn't have the port, but http.request does not work
	        // this way. It will use the port if one is not specified in host,
	        // effectively treating host as hostname, but will use the port specified
	        // in host if it exists.
	        if (options.host && options.port) {
	            // Force a protocol so it will parse the host as the host, not path.
	            // It is discarded and not used, so it doesn't matter if it doesn't match
	            var parsedHost = url.parse("http://" + options.host);
	            if (!parsedHost.port && options.port) {
	                options.hostname = options.host;
	                delete options.host;
	            }
	        }
	        // Mix in default values used by http.request and others
	        options.protocol = options.protocol || request.agent.protocol;
	        options.hostname = options.hostname || 'localhost';
	        return url.format(options);
	    };
	    return ClientRequestParser;
	}(RequestParser));
	module.exports = ClientRequestParser;


/***/ },
/* 31 */
/***/ function(module, exports) {

	"use strict";
	/**
	 * Base class for helpers that read data from HTTP requst/response objects and convert them
	 * into the telemetry contract objects.
	 */
	var RequestParser = (function () {
	    function RequestParser() {
	    }
	    /**
	     * Gets a url parsed out from request options
	     */
	    RequestParser.prototype.getUrl = function () {
	        return this.url;
	    };
	    RequestParser.prototype.RequestParser = function () {
	        this.startTime = +new Date();
	    };
	    RequestParser.prototype._setStatus = function (status, error, properties) {
	        var endTime = +new Date();
	        this.duration = endTime - this.startTime;
	        this.statusCode = status;
	        if (error) {
	            if (!properties) {
	                properties = {};
	            }
	            if (typeof error === "string") {
	                properties["error"] = error;
	            }
	            else if (error instanceof Error) {
	                properties["error"] = error.message;
	            }
	            else if (typeof error === "object") {
	                for (var key in error) {
	                    properties[key] = error[key] && error[key].toString && error[key].toString();
	                }
	            }
	        }
	        this.properties = properties;
	    };
	    RequestParser.prototype._isSuccess = function () {
	        return (0 < this.statusCode) && (this.statusCode < 400);
	    };
	    return RequestParser;
	}());
	module.exports = RequestParser;


/***/ },
/* 32 */
/***/ function(module, exports, __webpack_require__) {

	///<reference path="..\typings\globals\node\index.d.ts" />
	"use strict";
	var http = __webpack_require__(25);
	var https = __webpack_require__(28);
	var Logging = __webpack_require__(23);
	var Util = __webpack_require__(22);
	var RequestResponseHeaders = __webpack_require__(29);
	var ServerRequestParser = __webpack_require__(33);
	var AutoCollectServerRequests = (function () {
	    function AutoCollectServerRequests(client) {
	        if (!!AutoCollectServerRequests.INSTANCE) {
	            throw new Error("Server request tracking should be configured from the applicationInsights object");
	        }
	        AutoCollectServerRequests.INSTANCE = this;
	        this._client = client;
	    }
	    AutoCollectServerRequests.prototype.enable = function (isEnabled) {
	        this._isEnabled = isEnabled;
	        if (this._isEnabled && !this._isInitialized) {
	            this._initialize();
	        }
	    };
	    AutoCollectServerRequests.prototype.isInitialized = function () {
	        return this._isInitialized;
	    };
	    AutoCollectServerRequests.prototype._initialize = function () {
	        var _this = this;
	        this._isInitialized = true;
	        var originalHttpServer = http.createServer;
	        http.createServer = function (onRequest) {
	            // todo: get a pointer to the server so the IP address can be read from server.address
	            return originalHttpServer(function (request, response) {
	                if (_this._isEnabled) {
	                    AutoCollectServerRequests.trackRequest(_this._client, request, response);
	                }
	                if (typeof onRequest === "function") {
	                    onRequest(request, response);
	                }
	            });
	        };
	        var originalHttpsServer = https.createServer;
	        https.createServer = function (options, onRequest) {
	            return originalHttpsServer(options, function (request, response) {
	                if (_this._isEnabled) {
	                    AutoCollectServerRequests.trackRequest(_this._client, request, response);
	                }
	                if (typeof onRequest === "function") {
	                    onRequest(request, response);
	                }
	            });
	        };
	    };
	    /**
	     * Tracks a request synchronously (doesn't wait for response 'finish' event)
	     */
	    AutoCollectServerRequests.trackRequestSync = function (client, request, response, ellapsedMilliseconds, properties, error) {
	        if (!request || !response || !client) {
	            Logging.info("AutoCollectServerRequests.trackRequestSync was called with invalid parameters: ", !request, !response, !client);
	            return;
	        }
	        AutoCollectServerRequests.addResponseIKeyHeader(client, response);
	        // store data about the request
	        var requestParser = new ServerRequestParser(request);
	        AutoCollectServerRequests.endRequest(client, requestParser, request, response, ellapsedMilliseconds, properties, error);
	    };
	    /**
	     * Tracks a request by listening to the response 'finish' event
	     */
	    AutoCollectServerRequests.trackRequest = function (client, request, response, properties) {
	        if (!request || !response || !client) {
	            Logging.info("AutoCollectServerRequests.trackRequest was called with invalid parameters: ", !request, !response, !client);
	            return;
	        }
	        // store data about the request
	        var requestParser = new ServerRequestParser(request);
	        if (Util.canIncludeCorrelationHeader(client, requestParser.getUrl())) {
	            AutoCollectServerRequests.addResponseIKeyHeader(client, response);
	        }
	        // response listeners
	        if (response.once) {
	            response.once("finish", function () {
	                AutoCollectServerRequests.endRequest(client, requestParser, request, response, null, properties, null);
	            });
	        }
	        // track a failed request if an error is emitted
	        if (request.on) {
	            request.on("error", function (error) {
	                AutoCollectServerRequests.endRequest(client, requestParser, request, response, null, properties, error);
	            });
	        }
	    };
	    /**
	     * Add the target ikey hash to the response headers, if not already provided.
	     */
	    AutoCollectServerRequests.addResponseIKeyHeader = function (client, response) {
	        if (client.config && client.config.instrumentationKeyHash &&
	            response.getHeader && response.setHeader &&
	            !response.getHeader(RequestResponseHeaders.targetInstrumentationKeyHeader) &&
	            !response.headersSent) {
	            response.setHeader(RequestResponseHeaders.targetInstrumentationKeyHeader, client.config.instrumentationKeyHash);
	        }
	    };
	    AutoCollectServerRequests.endRequest = function (client, requestParser, request, response, ellapsedMilliseconds, properties, error) {
	        if (error) {
	            requestParser.onError(error, properties, ellapsedMilliseconds);
	        }
	        else {
	            requestParser.onResponse(response, properties, ellapsedMilliseconds);
	        }
	        var data = requestParser.getRequestData();
	        var tags = requestParser.getRequestTags(client.context.tags);
	        var context = { "http.ServerRequest": request, "http.ServerResponse": response };
	        client.track(data, tags, context);
	    };
	    AutoCollectServerRequests.prototype.dispose = function () {
	        AutoCollectServerRequests.INSTANCE = null;
	        this._isInitialized = false;
	    };
	    return AutoCollectServerRequests;
	}());
	module.exports = AutoCollectServerRequests;


/***/ },
/* 33 */
/***/ function(module, exports, __webpack_require__) {

	///<reference path="..\typings\globals\node\index.d.ts" />
	"use strict";
	var __extends = (this && this.__extends) || function (d, b) {
	    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
	    function __() { this.constructor = d; }
	    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	};
	var url = __webpack_require__(8);
	var ContractsModule = __webpack_require__(21);
	var Util = __webpack_require__(22);
	var RequestResponseHeaders = __webpack_require__(29);
	var RequestParser = __webpack_require__(31);
	/**
	 * Helper class to read data from the requst/response objects and convert them into the telemetry contract
	 */
	var ServerRequestParser = (function (_super) {
	    __extends(ServerRequestParser, _super);
	    function ServerRequestParser(request) {
	        var _this = _super.call(this) || this;
	        if (request) {
	            _this.method = request.method;
	            _this.url = _this._getAbsoluteUrl(request);
	            _this.startTime = +new Date();
	            _this.rawHeaders = request.headers || request.rawHeaders;
	            _this.socketRemoteAddress = request.socket && request.socket.remoteAddress;
	            _this.userAgent = request.headers && request.headers["user-agent"];
	            _this.sourceIKeyHash =
	                request.headers && request.headers[RequestResponseHeaders.sourceInstrumentationKeyHeader];
	            _this.parentId =
	                request.headers && request.headers[RequestResponseHeaders.parentIdHeader];
	            _this.operationId =
	                request.headers && request.headers[RequestResponseHeaders.rootIdHeader];
	            if (request.connection) {
	                _this.connectionRemoteAddress = request.connection.remoteAddress;
	                _this.legacySocketRemoteAddress = request.connection["socket"] && request.connection["socket"].remoteAddress;
	            }
	        }
	        return _this;
	    }
	    ServerRequestParser.prototype.onError = function (error, properties, ellapsedMilliseconds) {
	        this._setStatus(undefined, error, properties);
	    };
	    ServerRequestParser.prototype.onResponse = function (response, properties, ellapsedMilliseconds) {
	        this._setStatus(response.statusCode, undefined, properties);
	        if (ellapsedMilliseconds) {
	            this.duration = ellapsedMilliseconds;
	        }
	    };
	    ServerRequestParser.prototype.getRequestData = function () {
	        var requestData = new ContractsModule.Contracts.RequestData();
	        requestData.id = Util.newGuid();
	        requestData.name = this.method + " " + url.parse(this.url).pathname;
	        requestData.url = this.url;
	        requestData.source = this.sourceIKeyHash;
	        requestData.duration = Util.msToTimeSpan(this.duration);
	        requestData.responseCode = this.statusCode ? this.statusCode.toString() : null;
	        requestData.success = this._isSuccess();
	        requestData.properties = this.properties;
	        var data = new ContractsModule.Contracts.Data();
	        data.baseType = "Microsoft.ApplicationInsights.RequestData";
	        data.baseData = requestData;
	        return data;
	    };
	    ServerRequestParser.prototype.getRequestTags = function (tags) {
	        // create a copy of the context for requests since client info will be used here
	        var newTags = {};
	        for (var key in tags) {
	            newTags[key] = tags[key];
	        }
	        // don't override tags if they are already set
	        newTags[ServerRequestParser.keys.locationIp] = tags[ServerRequestParser.keys.locationIp] || this._getIp();
	        newTags[ServerRequestParser.keys.sessionId] = tags[ServerRequestParser.keys.sessionId] || this._getId("ai_session");
	        newTags[ServerRequestParser.keys.userId] = tags[ServerRequestParser.keys.userId] || this._getId("ai_user");
	        newTags[ServerRequestParser.keys.userAgent] = tags[ServerRequestParser.keys.userAgent] || this.userAgent;
	        newTags[ServerRequestParser.keys.operationName] = tags[ServerRequestParser.keys.operationName] || this.method + " " + url.parse(this.url).pathname;
	        newTags[ServerRequestParser.keys.operationParentId] = tags[ServerRequestParser.keys.operationParentId] || this.parentId;
	        newTags[ServerRequestParser.keys.operationId] = tags[ServerRequestParser.keys.operationId] || this.operationId;
	        return newTags;
	    };
	    ServerRequestParser.prototype._getAbsoluteUrl = function (request) {
	        if (!request.headers) {
	            return request.url;
	        }
	        var encrypted = request.connection ? request.connection.encrypted : null;
	        var requestUrl = url.parse(request.url);
	        var pathName = requestUrl.pathname;
	        var search = requestUrl.search;
	        var absoluteUrl = url.format({
	            protocol: encrypted ? "https" : "http",
	            host: request.headers.host,
	            pathname: pathName,
	            search: search
	        });
	        return absoluteUrl;
	    };
	    ServerRequestParser.prototype._getIp = function () {
	        // regex to match ipv4 without port
	        // Note: including the port would cause the payload to be rejected by the data collector
	        var ipMatch = /[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/;
	        var check = function (str) {
	            var results = ipMatch.exec(str);
	            if (results) {
	                return results[0];
	            }
	        };
	        var ip = check(this.rawHeaders["x-forwarded-for"])
	            || check(this.rawHeaders["x-client-ip"])
	            || check(this.rawHeaders["x-real-ip"])
	            || check(this.connectionRemoteAddress)
	            || check(this.socketRemoteAddress)
	            || check(this.legacySocketRemoteAddress);
	        // node v12 returns this if the address is "localhost"
	        if (!ip
	            && this.connectionRemoteAddress
	            && this.connectionRemoteAddress.substr
	            && this.connectionRemoteAddress.substr(0, 2) === "::") {
	            ip = "127.0.0.1";
	        }
	        return ip;
	    };
	    ServerRequestParser.prototype._getId = function (name) {
	        var cookie = (this.rawHeaders && this.rawHeaders["cookie"] &&
	            typeof this.rawHeaders["cookie"] === 'string' && this.rawHeaders["cookie"]) || "";
	        var value = ServerRequestParser.parseId(Util.getCookie(name, cookie));
	        return value;
	    };
	    ServerRequestParser.parseId = function (cookieValue) {
	        return cookieValue.substr(0, cookieValue.indexOf('|'));
	    };
	    return ServerRequestParser;
	}(RequestParser));
	ServerRequestParser.keys = new ContractsModule.Contracts.ContextTagKeys();
	module.exports = ServerRequestParser;


/***/ },
/* 34 */
/***/ function(module, exports, __webpack_require__) {

	///<reference path="..\typings\globals\node\index.d.ts" />
	"use strict";
	var url = __webpack_require__(8);
	var os = __webpack_require__(26);
	var Config = __webpack_require__(35);
	var Context = __webpack_require__(37);
	var ExceptionTracking = __webpack_require__(20);
	var ContractsModule = __webpack_require__(21);
	var Channel = __webpack_require__(39);
	var ServerRequestTracking = __webpack_require__(32);
	var ClientRequestTracking = __webpack_require__(27);
	var Sender = __webpack_require__(40);
	var Util = __webpack_require__(22);
	var Logging = __webpack_require__(23);
	var Client = (function () {
	    /**
	     * Constructs a new client of the client
	     * @param iKey the instrumentation key to use (read from environment variable if not specified)
	     */
	    function Client(iKey) {
	        this._sequencePrefix = Util.int32ArrayToBase64([
	            Util.random32(),
	            Util.random32(),
	            Util.random32(),
	            Util.random32()
	        ]) +
	            ":";
	        this._sequenceNumber = 0;
	        this._telemetryProcessors = [];
	        var config = new Config(iKey);
	        this.config = config;
	        this.context = new Context();
	        this.commonProperties = {};
	        var sender = new Sender(function () { return config.endpointUrl; });
	        this.channel = new Channel(function () { return config.disableAppInsights; }, function () { return config.maxBatchSize; }, function () { return config.maxBatchIntervalMs; }, sender);
	    }
	    /**
	     * Log a user action or other occurrence.
	     * @param   name    A string to identify this event in the portal.
	     * @param   properties  map[string, string] - additional data used to filter events and metrics in the portal. Defaults to empty.
	     * @param   measurements    map[string, number] - metrics associated with this event, displayed in Metrics Explorer on the portal. Defaults to empty.
	     */
	    Client.prototype.trackEvent = function (name, properties, measurements) {
	        var event = new ContractsModule.Contracts.EventData();
	        event.name = name;
	        event.properties = properties;
	        event.measurements = measurements;
	        var data = new ContractsModule.Contracts.Data();
	        data.baseType = "EventData";
	        data.baseData = event;
	        this.track(data);
	    };
	    /**
	     * Log a trace message
	     * @param   message    A string to identify this event in the portal.
	     * @param   properties  map[string, string] - additional data used to filter events and metrics in the portal. Defaults to empty.
	     */
	    Client.prototype.trackTrace = function (message, severityLevel, properties) {
	        var trace = new ContractsModule.Contracts.MessageData();
	        trace.message = message;
	        trace.properties = properties;
	        if (!isNaN(severityLevel)) {
	            trace.severityLevel = severityLevel;
	        }
	        else {
	            trace.severityLevel = ContractsModule.Contracts.SeverityLevel.Information;
	        }
	        var data = new ContractsModule.Contracts.Data();
	        data.baseType = "MessageData";
	        data.baseData = trace;
	        this.track(data);
	    };
	    /**
	     * Log an exception you have caught.
	     * @param   exception   An Error from a catch clause, or the string error message.
	     * @param   properties  map[string, string] - additional data used to filter events and metrics in the portal. Defaults to empty.
	     * @param   measurements    map[string, number] - metrics associated with this event, displayed in Metrics Explorer on the portal. Defaults to empty.
	     */
	    Client.prototype.trackException = function (exception, properties, measurements) {
	        if (!Util.isError(exception)) {
	            exception = new Error(exception);
	        }
	        var data = ExceptionTracking.getExceptionData(exception, true, properties, measurements);
	        this.track(data);
	    };
	    /**
	     * * Log a numeric value that is not associated with a specific event. Typically used to send regular reports of performance indicators.
	     * To send a single measurement, use just the first two parameters. If you take measurements very frequently, you can reduce the
	     * telemetry bandwidth by aggregating multiple measurements and sending the resulting average at intervals.
	     *
	     * @param name   A string that identifies the metric.
	     * @param value  The value of the metric
	     * @param count  the number of samples used to get this value
	     * @param min    the min sample for this set
	     * @param max    the max sample for this set
	     * @param stdDev the standard deviation of the set
	     */
	    Client.prototype.trackMetric = function (name, value, count, min, max, stdDev, properties) {
	        var metrics = new ContractsModule.Contracts.MetricData(); // todo: enable client-batching of these
	        metrics.metrics = [];
	        var metric = new ContractsModule.Contracts.DataPoint();
	        metric.count = !isNaN(count) ? count : 1;
	        metric.kind = ContractsModule.Contracts.DataPointType.Aggregation;
	        metric.max = !isNaN(max) ? max : value;
	        metric.min = !isNaN(min) ? min : value;
	        metric.name = name;
	        metric.stdDev = !isNaN(stdDev) ? stdDev : 0;
	        metric.value = value;
	        metrics.metrics.push(metric);
	        metrics.properties = properties;
	        var data = new ContractsModule.Contracts.Data();
	        data.baseType = "MetricData";
	        data.baseData = metrics;
	        this.track(data);
	    };
	    Client.prototype.trackRequestSync = function (request, response, ellapsedMilliseconds, properties, error) {
	        ServerRequestTracking.trackRequestSync(this, request, response, ellapsedMilliseconds, properties, error);
	    };
	    Client.prototype.trackRequest = function (request, response, properties) {
	        ServerRequestTracking.trackRequest(this, request, response, properties);
	    };
	    Client.prototype.trackDependencyRequest = function (requestOptions, request, properties) {
	        ClientRequestTracking.trackRequest(this, requestOptions, request, properties);
	    };
	    Client.prototype.trackDependency = function (name, commandName, elapsedTimeMs, success, dependencyTypeName, properties, async, target) {
	        if (properties === void 0) { properties = {}; }
	        if (async === void 0) { async = false; }
	        if (target === void 0) { target = null; }
	        if (!target && commandName) {
	            target = url.parse(commandName).host;
	        }
	        var remoteDependency = new ContractsModule.Contracts.RemoteDependencyData();
	        remoteDependency.name = name;
	        remoteDependency.data = commandName;
	        remoteDependency.target = target;
	        remoteDependency.duration = Util.msToTimeSpan(elapsedTimeMs);
	        remoteDependency.success = success;
	        remoteDependency.type = dependencyTypeName;
	        remoteDependency.properties = properties;
	        var data = new ContractsModule.Contracts.Data();
	        data.baseType = "RemoteDependencyData";
	        data.baseData = remoteDependency;
	        this.track(data);
	    };
	    /**
	     * Immediately send all queued telemetry.
	     */
	    Client.prototype.sendPendingData = function (callback) {
	        this.channel.triggerSend(false, callback);
	    };
	    Client.prototype.getEnvelope = function (data, tagOverrides) {
	        if (data && data.baseData) {
	            data.baseData.ver = 2;
	            // if no properties are specified just add the common ones
	            if (!data.baseData.properties) {
	                data.baseData.properties = this.commonProperties;
	            }
	            else {
	                // otherwise, check each of the common ones
	                for (var name in this.commonProperties) {
	                    // only override if the property `name` has not been set on this item
	                    if (!data.baseData.properties[name]) {
	                        data.baseData.properties[name] = this.commonProperties[name];
	                    }
	                }
	            }
	        }
	        // sanitize properties
	        data.baseData.properties = Util.validateStringMap(data.baseData.properties);
	        var iKey = this.config.instrumentationKey;
	        var envelope = new ContractsModule.Contracts.Envelope();
	        envelope.data = data;
	        envelope.appVer = this.context.tags[this.context.keys.applicationVersion];
	        envelope.iKey = iKey;
	        // this is kind of a hack, but the envelope name is always the same as the data name sans the chars "data"
	        envelope.name =
	            "Microsoft.ApplicationInsights." +
	                iKey.replace(/-/g, "") +
	                "." +
	                data.baseType.substr(0, data.baseType.length - 4);
	        envelope.os = os && os.type();
	        envelope.osVer = os && os.release();
	        envelope.seq = this._sequencePrefix + (this._sequenceNumber++).toString();
	        envelope.tags = tagOverrides || this.context.tags;
	        envelope.time = (new Date()).toISOString();
	        envelope.ver = 1;
	        return envelope;
	    };
	    /**
	     * Generic track method for all telemetry types
	     * @param data the telemetry to send
	     * @param tagOverrides the context tags to use for this telemetry which overwrite default context values
	     */
	    Client.prototype.track = function (data, tagOverrides, contextObjects) {
	        var envelope = this.getEnvelope(data, tagOverrides);
	        var accepted = this.runTelemetryProcessors(envelope, contextObjects);
	        if (accepted) {
	            this.channel.send(envelope);
	        }
	    };
	    /**
	     * Adds telemetry processor to the collection. Telemetry processors will be called one by one
	     * before telemetry item is pushed for sending and in the order they were added.
	     *
	     * @param telemetryProcessor function, takes Envelope, and optional context object and returns boolean
	     */
	    Client.prototype.addTelemetryProcessor = function (telemetryProcessor) {
	        this._telemetryProcessors.push(telemetryProcessor);
	    };
	    /*
	     * Removes all telemetry processors
	     */
	    Client.prototype.clearTelemetryProcessors = function () {
	        this._telemetryProcessors = [];
	    };
	    /**
	     * Parse an envelope sequence.
	     */
	    Client.parseSeq = function (seq) {
	        var array = seq.split(":");
	        return [array[0], parseInt(array[1])];
	    };
	    Client.prototype.runTelemetryProcessors = function (envelope, contextObjects) {
	        var accepted = true;
	        var telemetryProcessorsCount = this._telemetryProcessors.length;
	        if (telemetryProcessorsCount === 0) {
	            return accepted;
	        }
	        for (var i = 0; i < telemetryProcessorsCount; ++i) {
	            try {
	                var processor = this._telemetryProcessors[i];
	                if (processor) {
	                    if (processor.apply(null, [envelope, contextObjects]) === false) {
	                        accepted = false;
	                        break;
	                    }
	                }
	            }
	            catch (error) {
	                accepted = false;
	                Logging.warn("One of telemetry processors failed, telemetry item will not be sent.", error, envelope);
	            }
	        }
	        return accepted;
	    };
	    return Client;
	}());
	module.exports = Client;


/***/ },
/* 35 */
/***/ function(module, exports, __webpack_require__) {

	///<reference path="..\typings\globals\node\index.d.ts" />
	"use strict";
	var crypto = __webpack_require__(36);
	var Config = (function () {
	    function Config(instrumentationKey) {
	        this.instrumentationKey = instrumentationKey || Config._getInstrumentationKey();
	        this.instrumentationKeyHash = Config._getStringHashBase64(this.instrumentationKey);
	        this.endpointUrl = "https://dc.services.visualstudio.com/v2/track";
	        this.sessionRenewalMs = 30 * 60 * 1000;
	        this.sessionExpirationMs = 24 * 60 * 60 * 1000;
	        this.maxBatchSize = 250;
	        this.maxBatchIntervalMs = 15000;
	        this.disableAppInsights = false;
	        this.correlationHeaderExcludedDomains = ["*.blob.core.windows.net"];
	    }
	    Config._getInstrumentationKey = function () {
	        // check for both the documented env variable and the azure-prefixed variable
	        var iKey = process.env[Config.ENV_iKey]
	            || process.env[Config.ENV_azurePrefix + Config.ENV_iKey]
	            || process.env[Config.legacy_ENV_iKey]
	            || process.env[Config.ENV_azurePrefix + Config.legacy_ENV_iKey];
	        if (!iKey || iKey == "") {
	            throw new Error("Instrumentation key not found, pass the key in the config to this method or set the key in the environment variable APPINSIGHTS_INSTRUMENTATIONKEY before starting the server");
	        }
	        return iKey;
	    };
	    Config._getStringHashBase64 = function (value) {
	        var hash = crypto.createHash('sha256');
	        hash.update(value);
	        var result = hash.digest('base64');
	        return result;
	    };
	    return Config;
	}());
	// Azure adds this prefix to all environment variables
	Config.ENV_azurePrefix = "APPSETTING_";
	// This key is provided in the readme
	Config.ENV_iKey = "APPINSIGHTS_INSTRUMENTATIONKEY";
	Config.legacy_ENV_iKey = "APPINSIGHTS_INSTRUMENTATION_KEY";
	module.exports = Config;


/***/ },
/* 36 */
/***/ function(module, exports) {

	module.exports = require("crypto");

/***/ },
/* 37 */
/***/ function(module, exports, __webpack_require__) {

	///<reference path="..\typings\globals\node\index.d.ts" />
	"use strict";
	var os = __webpack_require__(26);
	var ContractsModule = __webpack_require__(21);
	var Logging = __webpack_require__(23);
	var Context = (function () {
	    function Context(packageJsonPath) {
	        this.keys = new ContractsModule.Contracts.ContextTagKeys();
	        this.tags = {};
	        this._loadApplicationContext();
	        this._loadDeviceContext();
	        this._loadInternalContext();
	    }
	    Context.prototype._loadApplicationContext = function (packageJsonPath) {
	        var version = "unknown";
	        var description = undefined;
	        try {
	            // note: this should return the host package.json
	            var packageJson = __webpack_require__(38)(packageJsonPath || "../../../package.json");
	            if (packageJson) {
	                if (typeof packageJson.version === "string") {
	                    version = packageJson.version;
	                }
	                if (typeof packageJson.description === "string") {
	                    description = packageJson.description;
	                }
	            }
	        }
	        catch (exception) {
	            Logging.info("unable to read app version: ", exception);
	        }
	        this.tags[this.keys.applicationVersion] = version;
	        // TODO: consider sending it as a custom property
	        //if(description) {
	        //    this.tags[this.keys.applicationBuild] = description;
	        //}
	    };
	    Context.prototype._loadDeviceContext = function () {
	        this.tags[this.keys.deviceId] = "";
	        this.tags[this.keys.cloudRoleInstance] = os && os.hostname();
	        this.tags[this.keys.deviceOSVersion] = os && os.type() + " " + os && os.release();
	        // not yet supported tags
	        this.tags["ai.device.osArchitecture"] = os && os.arch();
	        this.tags["ai.device.osPlatform"] = os && os.platform();
	    };
	    Context.prototype._loadInternalContext = function () {
	        var version = "unknown";
	        try {
	            // note: this should return the appInsights package.json
	            var packageJson = __webpack_require__(!(function webpackMissingModule() { var e = new Error("Cannot find module \"../package.json\""); e.code = 'MODULE_NOT_FOUND'; throw e; }()));
	            if (packageJson && typeof packageJson.version === "string") {
	                version = packageJson.version;
	            }
	        }
	        catch (exception) {
	            Logging.info("unable to read SDK version: " + exception);
	        }
	        this.tags[this.keys.internalSdkVersion] = "node:" + version || "unknown";
	    };
	    return Context;
	}());
	module.exports = Context;


/***/ },
/* 38 */
/***/ function(module, exports, __webpack_require__) {

	var map = {
		"./Channel": 39,
		"./Channel.js": 39,
		"./Client": 34,
		"./Client.js": 34,
		"./Config": 35,
		"./Config.js": 35,
		"./Context": 37,
		"./Context.js": 37,
		"./Contracts": 21,
		"./Contracts.js": 21,
		"./Logging": 23,
		"./Logging.js": 23,
		"./RequestResponseHeaders": 29,
		"./RequestResponseHeaders.js": 29,
		"./Sender": 40,
		"./Sender.js": 40,
		"./Util": 22,
		"./Util.js": 22
	};
	function webpackContext(req) {
		return __webpack_require__(webpackContextResolve(req));
	};
	function webpackContextResolve(req) {
		return map[req] || (function() { throw new Error("Cannot find module '" + req + "'.") }());
	};
	webpackContext.keys = function webpackContextKeys() {
		return Object.keys(map);
	};
	webpackContext.resolve = webpackContextResolve;
	module.exports = webpackContext;
	webpackContext.id = 38;


/***/ },
/* 39 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	var Logging = __webpack_require__(23);
	var Channel = (function () {
	    function Channel(isDisabled, getBatchSize, getBatchIntervalMs, sender) {
	        this._buffer = [];
	        this._lastSend = 0;
	        this._isDisabled = isDisabled;
	        this._getBatchSize = getBatchSize;
	        this._getBatchIntervalMs = getBatchIntervalMs;
	        this._sender = sender;
	    }
	    /**
	     * Enable or disable offline mode
	     */
	    Channel.prototype.setOfflineMode = function (value, resendInterval) {
	        this._sender.setOfflineMode(value, resendInterval);
	    };
	    /**
	     * Add a telemetry item to the send buffer
	     */
	    Channel.prototype.send = function (envelope) {
	        var _this = this;
	        // if master off switch is set, don't send any data
	        if (this._isDisabled()) {
	            // Do not send/save data
	            return;
	        }
	        // validate input
	        if (!envelope) {
	            Logging.warn("Cannot send null/undefined telemetry");
	            return;
	        }
	        // check if the incoming payload is too large, truncate if necessary
	        var payload = this._stringify(envelope);
	        if (typeof payload !== "string") {
	            return;
	        }
	        // enqueue the payload
	        this._buffer.push(payload);
	        // flush if we would exceed the max-size limit by adding this item
	        if (this._buffer.length >= this._getBatchSize()) {
	            this.triggerSend(false);
	            return;
	        }
	        // ensure an invocation timeout is set if anything is in the buffer
	        if (!this._timeoutHandle && this._buffer.length > 0) {
	            this._timeoutHandle = setTimeout(function () {
	                _this._timeoutHandle = null;
	                _this.triggerSend(false);
	            }, this._getBatchIntervalMs());
	        }
	    };
	    Channel.prototype.handleCrash = function (envelope) {
	        if (envelope) {
	            var payload = this._stringify(envelope);
	            if (typeof payload === "string") {
	                this._buffer.push(payload);
	                this.triggerSend(true);
	            }
	            else {
	                Logging.warn("Could not send crash", envelope);
	            }
	        }
	        else {
	            Logging.warn("handleCrash was called with empty payload", envelope);
	        }
	    };
	    /**
	     * Immediately send buffered data
	     */
	    Channel.prototype.triggerSend = function (isNodeCrashing, callback) {
	        var bufferIsEmpty = this._buffer.length < 1;
	        if (!bufferIsEmpty) {
	            // compose an array of payloads
	            var batch = this._buffer.join("\n");
	            // invoke send
	            if (isNodeCrashing) {
	                this._sender.saveOnCrash(batch);
	                if (typeof callback === "function") {
	                    callback("data saved on crash");
	                }
	            }
	            else {
	                this._sender.send(new Buffer(batch), callback);
	            }
	        }
	        // update lastSend time to enable throttling
	        this._lastSend = +new Date;
	        // clear buffer
	        this._buffer.length = 0;
	        clearTimeout(this._timeoutHandle);
	        this._timeoutHandle = null;
	        if (bufferIsEmpty && typeof callback === "function") {
	            callback("no data to send");
	        }
	    };
	    Channel.prototype._stringify = function (envelope) {
	        try {
	            return JSON.stringify(envelope);
	        }
	        catch (error) {
	            Logging.warn("Failed to serialize payload", error, envelope);
	        }
	    };
	    return Channel;
	}());
	module.exports = Channel;


/***/ },
/* 40 */
/***/ function(module, exports, __webpack_require__) {

	///<reference path="..\typings\globals\node\index.d.ts" />
	"use strict";
	var fs = __webpack_require__(41);
	var http = __webpack_require__(25);
	var https = __webpack_require__(28);
	var os = __webpack_require__(26);
	var path = __webpack_require__(42);
	var url = __webpack_require__(8);
	var zlib = __webpack_require__(43);
	var Logging = __webpack_require__(23);
	var AutoCollectClientRequests = __webpack_require__(27);
	var Sender = (function () {
	    function Sender(getUrl, onSuccess, onError) {
	        this._getUrl = getUrl;
	        this._onSuccess = onSuccess;
	        this._onError = onError;
	        this._enableOfflineMode = false;
	        this._resendInterval = Sender.WAIT_BETWEEN_RESEND;
	    }
	    /**
	    * Enable or disable offline mode
	    */
	    Sender.prototype.setOfflineMode = function (value, resendInterval) {
	        this._enableOfflineMode = value;
	        if (typeof resendInterval === 'number' && resendInterval >= 0) {
	            this._resendInterval = Math.floor(resendInterval);
	        }
	    };
	    Sender.prototype.send = function (payload, callback) {
	        var _this = this;
	        var endpointUrl = this._getUrl();
	        if (endpointUrl && endpointUrl.indexOf("//") === 0) {
	            // use https if the config did not specify a protocol
	            endpointUrl = "https:" + endpointUrl;
	        }
	        // todo: investigate specifying an agent here: https://nodejs.org/api/http.html#http_class_http_agent
	        var parsedUrl = url.parse(endpointUrl);
	        var options = {
	            host: parsedUrl.hostname,
	            port: parsedUrl.port,
	            path: parsedUrl.pathname,
	            method: "POST",
	            headers: {
	                "Content-Type": "application/x-json-stream"
	            }
	        };
	        zlib.gzip(payload, function (err, buffer) {
	            var dataToSend = buffer;
	            if (err) {
	                Logging.warn(err);
	                dataToSend = payload; // something went wrong so send without gzip
	                options.headers["Content-Length"] = payload.length;
	            }
	            else {
	                options.headers["Content-Encoding"] = "gzip";
	                options.headers["Content-Length"] = buffer.length;
	            }
	            Logging.info(Sender.TAG, options);
	            // Ensure this request is not captured by auto-collection.
	            options[AutoCollectClientRequests.disableCollectionRequestOption] = true;
	            var requestCallback = function (res) {
	                res.setEncoding("utf-8");
	                //returns empty if the data is accepted
	                var responseString = "";
	                res.on("data", function (data) {
	                    responseString += data;
	                });
	                res.on("end", function () {
	                    Logging.info(Sender.TAG, responseString);
	                    if (typeof _this._onSuccess === "function") {
	                        _this._onSuccess(responseString);
	                    }
	                    if (typeof callback === "function") {
	                        callback(responseString);
	                    }
	                    if (_this._enableOfflineMode) {
	                        // try to send any cached events if the user is back online
	                        if (res.statusCode === 200) {
	                            setTimeout(function () { return _this._sendFirstFileOnDisk(); }, _this._resendInterval);
	                        }
	                        else if (res.statusCode === 206 ||
	                            res.statusCode === 429 ||
	                            res.statusCode === 439) {
	                            _this._storeToDisk(payload);
	                        }
	                    }
	                });
	            };
	            var req = (parsedUrl.protocol == "https:") ?
	                https.request(options, requestCallback) :
	                http.request(options, requestCallback);
	            req.on("error", function (error) {
	                // todo: handle error codes better (group to recoverable/non-recoverable and persist)
	                Logging.warn(Sender.TAG, error);
	                _this._onErrorHelper(error);
	                if (typeof callback === "function") {
	                    var errorMessage = "error sending telemetry";
	                    if (error && (typeof error.toString === "function")) {
	                        errorMessage = error.toString();
	                    }
	                    callback(errorMessage);
	                }
	                if (_this._enableOfflineMode) {
	                    _this._storeToDisk(payload);
	                }
	            });
	            req.write(dataToSend);
	            req.end();
	        });
	    };
	    Sender.prototype.saveOnCrash = function (payload) {
	        this._storeToDiskSync(payload);
	    };
	    Sender.prototype._confirmDirExists = function (direcotry, callback) {
	        fs.exists(direcotry, function (exists) {
	            if (!exists) {
	                fs.mkdir(direcotry, function (err) {
	                    callback(err);
	                });
	            }
	            else {
	                callback(null);
	            }
	        });
	    };
	    /**
	     * Stores the payload as a json file on disk in the temp direcotry
	     */
	    Sender.prototype._storeToDisk = function (payload) {
	        var _this = this;
	        //ensure directory is created
	        var direcotry = path.join(os.tmpdir(), Sender.TEMPDIR);
	        this._confirmDirExists(direcotry, function (error) {
	            if (error) {
	                _this._onErrorHelper(error);
	                return;
	            }
	            //create file - file name for now is the timestamp, a better approach would be a UUID but that
	            //would require an external dependency
	            var fileName = new Date().getTime() + ".ai.json";
	            var fileFullPath = path.join(direcotry, fileName);
	            Logging.info(Sender.TAG, "saving data to disk at: " + fileFullPath);
	            fs.writeFile(fileFullPath, payload, function (error) { return _this._onErrorHelper(error); });
	        });
	    };
	    /**
	     * Stores the payload as a json file on disk using sync file operations
	     * this is used when storing data before crashes
	     */
	    Sender.prototype._storeToDiskSync = function (payload) {
	        var direcotry = path.join(os.tmpdir(), Sender.TEMPDIR);
	        try {
	            if (!fs.existsSync(direcotry)) {
	                fs.mkdirSync(direcotry);
	            }
	            //create file - file name for now is the timestamp, a better approach would be a UUID but that
	            //would require an external dependency
	            var fileName = new Date().getTime() + ".ai.json";
	            var fileFullPath = path.join(direcotry, fileName);
	            Logging.info(Sender.TAG, "saving data before crash to disk at: " + fileFullPath);
	            fs.writeFileSync(fileFullPath, payload);
	        }
	        catch (error) {
	            this._onErrorHelper(error);
	        }
	    };
	    /**
	     * Check for temp telemetry files
	     * reads the first file if exist, deletes it and tries to send its load
	     */
	    Sender.prototype._sendFirstFileOnDisk = function () {
	        var _this = this;
	        var tempDir = path.join(os.tmpdir(), Sender.TEMPDIR);
	        fs.exists(tempDir, function (exists) {
	            if (exists) {
	                fs.readdir(tempDir, function (error, files) {
	                    if (!error) {
	                        files = files.filter(function (f) { return path.basename(f).indexOf(".ai.json") > -1; });
	                        if (files.length > 0) {
	                            var firstFile = files[0];
	                            var filePath = path.join(tempDir, firstFile);
	                            fs.readFile(filePath, function (error, payload) {
	                                if (!error) {
	                                    // delete the file first to prevent double sending
	                                    fs.unlink(filePath, function (error) {
	                                        if (!error) {
	                                            _this.send(payload);
	                                        }
	                                        else {
	                                            _this._onErrorHelper(error);
	                                        }
	                                    });
	                                }
	                                else {
	                                    _this._onErrorHelper(error);
	                                }
	                            });
	                        }
	                    }
	                    else {
	                        _this._onErrorHelper(error);
	                    }
	                });
	            }
	        });
	    };
	    Sender.prototype._onErrorHelper = function (error) {
	        if (typeof this._onError === "function") {
	            this._onError(error);
	        }
	    };
	    return Sender;
	}());
	Sender.TAG = "Sender";
	// the amount of time the SDK will wait between resending cached data, this buffer is to avoid any throtelling from the service side
	Sender.WAIT_BETWEEN_RESEND = 60 * 1000;
	Sender.TEMPDIR = "appInsights-node";
	module.exports = Sender;


/***/ },
/* 41 */
/***/ function(module, exports) {

	module.exports = require("fs");

/***/ },
/* 42 */
/***/ function(module, exports) {

	module.exports = require("path");

/***/ },
/* 43 */
/***/ function(module, exports) {

	module.exports = require("zlib");

/***/ }
/******/ ]);