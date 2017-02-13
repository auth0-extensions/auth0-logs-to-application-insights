"use latest";

const useragent = require('useragent');
const moment    = require('moment');
const express   = require('express');
const Webtask   = require('webtask-tools');
const app       = express();
const Request   = require('request');
const memoizer  = require('lru-memoizer');

/*
 * Get the application insights client.
 */
const getClient = (key) => {
  const appInsights = require('applicationinsights');
  const client = appInsights.getClient(key);

  // Override the original getEnvelope method to allow setting a custom time.
  const originalGetEnvelope = client.getEnvelope;
  client.getEnvelope = (data, tagOverrides) => {
    let envelope = originalGetEnvelope.apply(client, [data, tagOverrides]);
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

    if (data.baseData.properties.user_id || data.baseData.properties.user_name) {
      envelope.tags['ai.user.id'] = data.baseData.properties.user_id || data.baseData.properties.user_name;
      envelope.tags['ai.user.accountId'] = data.baseData.properties.user_name || data.baseData.properties.user_id;
      envelope.tags['ai.user.authUserId'] = data.baseData.properties.user_id || data.baseData.properties.user_name;
    }

    if (data.baseData.properties.user_agent) {
      envelope.tags['ai.user.agent'] = data.baseData.properties.user_agent;
    }
    return envelope;
  };

  return client;
};

function lastLogCheckpoint (req, res) {
  let ctx = req.webtaskContext;

  if (!ctx.data.AUTH0_DOMAIN || !ctx.data.AUTH0_CLIENT_ID || !ctx.data.AUTH0_CLIENT_SECRET) {
    return res.status(400).send({ message: 'Auth0 API v1 credentials or domain missing.' });
  }

  if (!ctx.data.APPINSIGHTS_INSTRUMENTATIONKEY) {
    return res.status(400).send({ message: 'Application Insights instrumentation key is missing.' });
  }

  req.webtaskContext.storage.get((err, data) => {
    let checkpointId = typeof data === 'undefined' ? null : data.checkpointId;
    /*
     * If this is a scheduled task, we'll get the last log checkpoint from the previous run and continue from there.
     */
    console.log('Starting from:', checkpointId);

    const client = getClient(ctx.data.APPINSIGHTS_INSTRUMENTATIONKEY);
    client.commonProperties = {
      auth0_domain: ctx.data.AUTH0_DOMAIN
    };

    /*
     * Test authenticating with the Auth0 API.
     */
    const authenticate = (callback) => {
      return callback();
    };

    /*
     * Get the logs from Auth0.
     */
    const logs = [];
    const getLogs = (checkPoint, callback) => {
      let take = Number.parseInt(ctx.data.BATCH_SIZE);

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
    const exportLogs = (logs, callback) => {
      console.log('Exporting logs to Application Insights: ' + logs.length);

      logs.forEach(function(record) {
        var level = 0;
        record.type_code = record.type;
        if (logTypes[record.type]) {
          level = logTypes[record.type].level;
          record.type = logTypes[record.type].event;
        }

        // Application Insights does not like null or empty strings.
        if (!record.ip || record.ip === '') delete record.ip;
        if (!record.user_id || record.user_id === '')  delete record.user_id;
        if (!record.user_name || record.user_name === '')  delete record.user_name;
        if (!record.connection || record.connection === '')  delete record.connection;
        if (!record.client_name || record.client_name === '') delete record.client_name;
        if (!record.description || record.description === '')  delete record.description;

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

        client.sendPendingData((response) => {
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
    authenticate((err) => {
      if (err) {
        return res.status(500).send({ err: err });
      }

      getLogs(checkpointId, (err, logs) => {
        if (!logs) {
          return res.status(500).send({ err: err });
        }

        exportLogs(logs, (err, response) => {
          try {
            response = JSON.parse(response);
          } catch (e) {
            console.log('Error parsing response, this might indicate that an error occurred:', response);

            return req.webtaskContext.storage.set({checkpointId: checkpointId}, {force: 1}, (error) => {
              if (error) return res.status(500).send(error);

              res.status(500).send({
                error: response
              });
            });
          }

          // At least one item we sent was accepted, so we're good and next run can continue where we stopped.
          if (response.itemsAccepted && response.itemsAccepted > 0) {
            return req.webtaskContext.storage.set({checkpointId: checkpointId}, {force: 1}, (error) => {
              if (error) {
                console.log('Error storing startCheckpoint', error);
                return res.status(500).send({ error: error });
              }

              res.sendStatus(200);
            });
          }

          // None of our items were accepted, next run should continue from same starting point.
          console.log('No items accepted.');
          return req.webtaskContext.storage.set({checkpointId: checkpointId}, {force: 1}, (error) => {
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

const logTypes = {
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

function getLogsFromAuth0 (domain, token, take, from, cb) {
  var url = `https://${domain}/api/v2/logs`;

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
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    }
  }, (err, res, body) => {
    if (err) {
      console.log('Error getting logs', err);
      cb(null, err);
    } else {
      cb(body);
    }
  });
}

const getTokenCached = memoizer({
  load: (apiUrl, audience, clientId, clientSecret, cb) => {
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
    }, (err, res, body) => {
      if (err) {
        cb(null, err);
      } else {
        cb(body.access_token);
      }
    });
  },
  hash: (apiUrl) => apiUrl,
  max: 100,
  maxAge: 1000 * 60 * 60
});

app.use(function (req, res, next) {
  var apiUrl       = `https://${req.webtaskContext.data.AUTH0_DOMAIN}/oauth/token`;
  var audience     = `https://${req.webtaskContext.data.AUTH0_DOMAIN}/api/v2/`;
  var clientId     = req.webtaskContext.data.AUTH0_CLIENT_ID;
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

app.get ('/', lastLogCheckpoint);
app.post('/', lastLogCheckpoint);

module.exports = Webtask.fromExpress(app);
