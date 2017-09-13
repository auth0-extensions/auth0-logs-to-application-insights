const _ = require('lodash');
const moment = require('moment');
const useragent = require('useragent');
const appInsights = require('applicationinsights');

const loggingTools = require('auth0-log-extension-tools');
const config = require('../lib/config');
const logger = require('../lib/logger');

/*
 * Get the application insights client.
 */
const getClient = () => {
  const client = appInsights.getClient(config('APPINSIGHTS_INSTRUMENTATIONKEY'));

  // Override the original getEnvelope method to allow setting a custom time.
  const originalGetEnvelope = client.getEnvelope;
  client.getEnvelope = (data, tagOverrides) => {
    const envelope = originalGetEnvelope.apply(client, [ data, tagOverrides ]);
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

/*
 * Export the logs to Application Insights.
 */
const exportLogs = (client, logs, callback) => {
  logger.info('Exporting logs to Application Insights: ' + logs.length);

  logs.forEach((record) => {
    let level = 0;
    record.type_code = record.type;

    if (loggingTools.logTypes[record.type]) {
      level = loggingTools.logTypes[record.type].level;
      record.type = loggingTools.logTypes.get(record.type);
    }

    // Application Insights does not like null or empty strings.
    if (!record.ip || record.ip === '') delete record.ip;
    if (!record.user_id || record.user_id === '') delete record.user_id;
    if (!record.user_name || record.user_name === '') delete record.user_name;
    if (!record.connection || record.connection === '') delete record.connection;
    if (!record.client_name || record.client_name === '') delete record.client_name;
    if (!record.description || record.description === '') delete record.description;

    // Application Insights does not like booleans.
    record.isMobile = (record.isMobile && 'yes') || 'no';

    // Application Insights does not like objects.
    if (record.details) {
      record.details = JSON.stringify(record.details, null, 2);
    }

    // Application Insights does not like login strings.
    if (record.details && record.details.length > 8185) {
      record.details = record.details.substring(0, 8185) + '...';
    }

    const agent = useragent.parse(record.user_agent);
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
      const error = new Error(record.type);
      error.name = record.type;
      return client.trackException(error, record);
    }

    return client.trackEvent(record.type, record);
  });

  if (logs && logs.length) {
    logger.info('Flushing all data...');

    return client.sendPendingData(response => callback(null, response));
  }

  logger.info('No data to flush...');
  return callback(null, '{ "itemsAccepted": 0 }');
};

module.exports = storage =>
  (req, res, next) => {
    const wtBody = (req.webtaskContext && req.webtaskContext.body) || req.body || {};
    const wtHead = (req.webtaskContext && req.webtaskContext.headers) || {};
    const isCron = (wtBody.schedule && wtBody.state === 'active') || (wtHead.referer === `${config('AUTH0_MANAGE_URL')}/` && wtHead['if-none-match']);

    if (!isCron) {
      return next();
    }

    const aiClient = getClient();
    aiClient.commonProperties = {
      auth0_domain: config('AUTH0_DOMAIN')
    };

    const onLogsReceived = (logs, cb) => {
      if (!logs || !logs.length) {
        return cb();
      }

      const events = _.filter(logs, log => (log.date && moment().diff(moment(log.date), 'hours') < 48));

      if (!events.length) {
        return cb();
      }

      return exportLogs(aiClient, events, (err, response) => {
        try {
          response = JSON.parse(response);
        } catch (e) {
          logger.info('Error parsing response, this might indicate that an error occurred:', response);

          return cb(response);
        }

        // At least one item we sent was accepted, so we're good and next run can continue where we stopped.
        if (response.itemsAccepted && response.itemsAccepted > 0) {
          return cb();
        } else if (response.errors && response.errors.length > 0) {
          return cb(response.errors);
        }

        // None of our items were accepted, next run should continue from same starting point.
        logger.info('No items accepted.');
        return cb({ message: 'No items accepted.' });
      });
    };

    const slack = new loggingTools.reporters.SlackReporter({
      hook: config('SLACK_INCOMING_WEBHOOK_URL'),
      username: 'auth0-logs-to-application-insights',
      title: 'Logs To Application Insights'
    });

    const options = {
      domain: config('AUTH0_DOMAIN'),
      clientId: config('AUTH0_CLIENT_ID'),
      clientSecret: config('AUTH0_CLIENT_SECRET'),
      batchSize: config('BATCH_SIZE'),
      startFrom: config('START_FROM'),
      logTypes: config('LOG_TYPES'),
      logLevel: config('LOG_LEVEL')
    };

    if (!options.batchSize || options.batchSize > 100) {
      options.batchSize = 100;
    }

    if (options.logTypes && !Array.isArray(options.logTypes)) {
      options.logTypes = options.logTypes.replace(/\s/g, '').split(',');
    }

    const auth0logger = new loggingTools.LogsProcessor(storage, options);

    const sendDailyReport = (lastReportDate) => {
      const current = new Date();

      const end = current.getTime();
      const start = end - 86400000;
      auth0logger.getReport(start, end)
        .then(report => slack.send(report, report.checkpoint))
        .then(() => storage.read())
        .then((data) => {
          data.lastReportDate = lastReportDate;
          return storage.write(data);
        });
    };

    const checkReportTime = () => {
      storage.read()
        .then((data) => {
          const now = moment().format('DD-MM-YYYY');
          const reportTime = config('DAILY_REPORT_TIME') || 16;

          if (data.lastReportDate !== now && new Date().getHours() >= reportTime) {
            sendDailyReport(now);
          }
        });
    };

    return auth0logger
      .run(onLogsReceived)
      .then((result) => {
        if (result && result.status && result.status.error) {
          slack.send(result.status, result.checkpoint);
        } else if (config('SLACK_SEND_SUCCESS') === true || config('SLACK_SEND_SUCCESS') === 'true') {
          slack.send(result.status, result.checkpoint);
        }
        checkReportTime();
        res.json(result);
      })
      .catch((err) => {
        slack.send({ error: err, logsProcessed: 0 }, null);
        checkReportTime();
        next(err);
      });
  };
