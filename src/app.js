const express = require('express');
const morgan = require('morgan');
const i18next = require('i18next');
const Backend = require('i18next-fs-backend');
const middleware = require('i18next-http-middleware');
const { errorHandler, notFoundHandler } = require('./error/errorHandler');
const router = require('./routes');

i18next
  .use(Backend)
  .use(middleware.LanguageDetector)
  .init({
    fallbackLng: 'en',
    backend: {
      loadPath: './locales/{{lng}}/translation.json',
    },
  });

const app = express();

app.use(middleware.handle(i18next));

app.use(express.json());

app.use(morgan('dev'));

app.use('/api/1.0', router);

app.use(errorHandler);

app.use('*', notFoundHandler);

module.exports = app;
