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

	var useragent = __webpack_require__(3);
	var moment = __webpack_require__(4);
	var express = __webpack_require__(5);
	var Webtask = __webpack_require__(6);
	var app = express();
	var Request = __webpack_require__(8);
	var memoizer = __webpack_require__(9);

	/*
	 * Get the application insights client.
	 */
	var getClient = function getClient(key) {
	  var appInsights = __webpack_require__(12);
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
	      envelope.tags['ai.user.accountId'] = data.baseData.properties.user_id || data.baseData.properties.user_name;
	      envelope.tags['ai.user.authUserId'] = data.baseData.properties.user_id || data.baseData.properties.user_name;
	    }

	    if (data.baseData.properties.user_agent) {
	      envelope.tags['ai.user.userAgent'] = data.baseData.properties.user_agent;
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

	        if (level >= 3) {
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

	/* WEBPACK VAR INJECTION */(function(setImmediate, clearImmediate) {var nextTick = __webpack_require__(2).nextTick;
	var apply = Function.prototype.apply;
	var slice = Array.prototype.slice;
	var immediateIds = {};
	var nextImmediateId = 0;

	// DOM APIs, for completeness

	exports.setTimeout = function() {
	  return new Timeout(apply.call(setTimeout, window, arguments), clearTimeout);
	};
	exports.setInterval = function() {
	  return new Timeout(apply.call(setInterval, window, arguments), clearInterval);
	};
	exports.clearTimeout =
	exports.clearInterval = function(timeout) { timeout.close(); };

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

	// That's not how node.js implements it but the exposed api is the same.
	exports.setImmediate = typeof setImmediate === "function" ? setImmediate : function(fn) {
	  var id = nextImmediateId++;
	  var args = arguments.length < 2 ? false : slice.call(arguments, 1);

	  immediateIds[id] = true;

	  nextTick(function onNextTick() {
	    if (immediateIds[id]) {
	      // fn.call() is faster so we optimize for the common use-case
	      // @see http://jsperf.com/call-apply-segu
	      if (args) {
	        fn.apply(null, args);
	      } else {
	        fn.call(null);
	      }
	      // Prevent ids from leaking
	      exports.clearImmediate(id);
	    }
	  });

	  return id;
	};

	exports.clearImmediate = typeof clearImmediate === "function" ? clearImmediate : function(id) {
	  delete immediateIds[id];
	};
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(1).setImmediate, __webpack_require__(1).clearImmediate))

/***/ },
/* 2 */
/***/ function(module, exports) {

	// shim for using process in browser

	var process = module.exports = {};
	var queue = [];
	var draining = false;
	var currentQueue;
	var queueIndex = -1;

	function cleanUpNextTick() {
	    draining = false;
	    if (currentQueue.length) {
	        queue = currentQueue.concat(queue);
	    } else {
	        queueIndex = -1;
	    }
	    if (queue.length) {
	        drainQueue();
	    }
	}

	function drainQueue() {
	    if (draining) {
	        return;
	    }
	    var timeout = setTimeout(cleanUpNextTick);
	    draining = true;

	    var len = queue.length;
	    while(len) {
	        currentQueue = queue;
	        queue = [];
	        while (++queueIndex < len) {
	            if (currentQueue) {
	                currentQueue[queueIndex].run();
	            }
	        }
	        queueIndex = -1;
	        len = queue.length;
	    }
	    currentQueue = null;
	    draining = false;
	    clearTimeout(timeout);
	}

	process.nextTick = function (fun) {
	    var args = new Array(arguments.length - 1);
	    if (arguments.length > 1) {
	        for (var i = 1; i < arguments.length; i++) {
	            args[i - 1] = arguments[i];
	        }
	    }
	    queue.push(new Item(fun, args));
	    if (queue.length === 1 && !draining) {
	        setTimeout(drainQueue, 0);
	    }
	};

	// v8 likes predictible objects
	function Item(fun, array) {
	    this.fun = fun;
	    this.array = array;
	}
	Item.prototype.run = function () {
	    this.fun.apply(null, this.array);
	};
	process.title = 'browser';
	process.browser = true;
	process.env = {};
	process.argv = [];
	process.version = ''; // empty string to avoid regexp issues
	process.versions = {};

	function noop() {}

	process.on = noop;
	process.addListener = noop;
	process.once = noop;
	process.off = noop;
	process.removeListener = noop;
	process.removeAllListeners = noop;
	process.emit = noop;

	process.binding = function (name) {
	    throw new Error('process.binding is not supported');
	};

	process.cwd = function () { return '/' };
	process.chdir = function (dir) {
	    throw new Error('process.chdir is not supported');
	};
	process.umask = function() { return 0; };


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

	exports.fromConnect = exports.fromExpress = fromConnect;
	exports.fromHapi = fromHapi;
	exports.fromServer = exports.fromRestify = fromServer;


	// API functions

	function fromConnect (connectFn) {
	    return function (context, req, res) {
	        var normalizeRouteRx = createRouteNormalizationRx(req.x_wt.jtn);

	        req.originalUrl = req.url;
	        req.url = req.url.replace(normalizeRouteRx, '/');
	        req.webtaskContext = attachStorageHelpers(context);

	        return connectFn(req, res);
	    };
	}

	function fromHapi(server) {
	    var webtaskContext;

	    server.ext('onRequest', function (request, response) {
	        var normalizeRouteRx = createRouteNormalizationRx(request.x_wt.jtn);

	        request.setUrl(request.url.replace(normalizeRouteRx, '/'));
	        request.webtaskContext = webtaskContext;
	    });

	    return function (context, req, res) {
	        var dispatchFn = server._dispatch();

	        webtaskContext = attachStorageHelpers(context);

	        dispatchFn(req, res);
	    };
	}

	function fromServer(httpServer) {
	    return function (context, req, res) {
	        var normalizeRouteRx = createRouteNormalizationRx(req.x_wt.jtn);

	        req.originalUrl = req.url;
	        req.url = req.url.replace(normalizeRouteRx, '/');
	        req.webtaskContext = attachStorageHelpers(context);

	        return httpServer.emit('request', req, res);
	    };
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
	        var Boom = __webpack_require__(7);

	        if (typeof options === 'function') {
	            cb = options;
	            options = {};
	        }

	        cb(Boom.preconditionFailed('Storage is not available in this context'));
	    }

	    function readFromPath(path, options, cb) {
	        var Boom = __webpack_require__(7);
	        var Request = __webpack_require__(8);

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
	        var Boom = __webpack_require__(7);

	        if (typeof options === 'function') {
	            cb = options;
	            options = {};
	        }

	        cb(Boom.preconditionFailed('Storage is not available in this context'));
	    }

	    function writeToPath(path, data, options, cb) {
	        var Boom = __webpack_require__(7);
	        var Request = __webpack_require__(8);

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
/***/ function(module, exports) {

	module.exports = require("boom");

/***/ },
/* 8 */
/***/ function(module, exports) {

	module.exports = require("request");

/***/ },
/* 9 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(setImmediate) {const LRU = __webpack_require__(10);
	const _ = __webpack_require__(11);
	const lru_params =  [ 'max', 'maxAge', 'length', 'dispose', 'stale' ];

	module.exports = function (options) {
	  var cache = new LRU(_.pick(options, lru_params));
	  var load = options.load;
	  var hash = options.hash;

	  var result = function () {
	    var args = _.toArray(arguments);
	    var parameters = args.slice(0, -1);
	    var callback = args.slice(-1).pop();

	    var key;

	    if (parameters.length === 0 && !hash) {
	      //the load function only receives callback.
	      key = '_';
	    } else {
	      key = hash.apply(options, parameters);
	    }

	    var fromCache = cache.get(key);

	    if (fromCache) {
	      return setImmediate.apply(null, [callback, null].concat(fromCache));
	    }

	    load.apply(null, parameters.concat(function (err) {
	      if (err) {
	        return callback(err);
	      }

	      cache.set(key, _.toArray(arguments).slice(1));

	      return callback.apply(null, arguments);

	    }));

	  };

	  result.keys = cache.keys.bind(cache);

	  return result;
	};


	module.exports.sync = function (options) {
	  var cache = new LRU(_.pick(options, lru_params));
	  var load = options.load;
	  var hash = options.hash;

	  var result = function () {
	    var args = _.toArray(arguments);

	    var key = hash.apply(options, args);

	    var fromCache = cache.get(key);

	    if (fromCache) {
	      return fromCache;
	    }

	    var result = load.apply(null, args);

	    cache.set(key, result);

	    return result;
	  };

	  result.keys = cache.keys.bind(cache);

	  return result;
	};
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(1).setImmediate))

/***/ },
/* 10 */
/***/ function(module, exports) {

	module.exports = require("lru-cache");

/***/ },
/* 11 */
/***/ function(module, exports) {

	module.exports = require("lodash");

/***/ },
/* 12 */
/***/ function(module, exports) {

	module.exports = require("applicationinsights");

/***/ }
/******/ ]);