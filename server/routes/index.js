const router = require('express').Router;
const middlewares = require('auth0-extension-express-tools').middlewares;

const config = require('../lib/config');
const processLogs = require('../lib/processLogs');
const htmlRoute = require('./html');

module.exports = (storage) => {
  const app = router();
  const authenticateAdmins = middlewares.authenticateAdmins({
    credentialsRequired: true,
    secret: config('EXTENSION_SECRET'),
    audience: 'urn:logs-to-application-insights',
    baseUrl: config('PUBLIC_WT_URL'),
    onLoginSuccess: (req, res, next) => next()
  });

  app.get('/', htmlRoute());
  app.post('/', processLogs(storage));

  app.get('/api/report', authenticateAdmins, (req, res, next) =>
    storage.read()
      .then(data => res.json((data && data.logs) || []))
      .catch(next));

  return app;
};
