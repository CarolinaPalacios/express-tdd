import express from 'express';
import morgan from 'morgan';
import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import middleware from 'i18next-http-middleware';
import path from 'path';
import { errorHandler, notFoundHandler } from './error/errorHandler.js';
import router from './routes/index.js';
import { tokenAuthentication } from './middlewares/tokenAuthentication.js';
import { createFolders } from './service/fileService.js';

import {
  uploadDirConfigs,
  profileDirConfigs,
  attachmentDirConfigs,
} from '../database/config.js';

const uploadDir = uploadDirConfigs.development;
const profileDir = profileDirConfigs.development;
const attachmentDir = attachmentDirConfigs.development;

const profileFolder = path.join('.', uploadDir, profileDir);
const attachmentFolder = path.join('.', uploadDir, attachmentDir);

const ONE_YEAR_IN_MILLIS = 365 * 24 * 60 * 60 * 1000;

i18next
  .use(Backend)
  .use(middleware.LanguageDetector)
  .init({
    fallbackLng: 'en',
    lng: 'en',
    ns: ['translation'],
    defaultNs: 'translation',
    backend: {
      loadPath: './locales/{{lng}}/{{ns}}.json',
    },
    detection: {
      lookupHeader: 'accept-language',
    },
  });

createFolders();

const app = express();

app.use(middleware.handle(i18next));

app.use(express.json({ limit: '3mb' }));

app.use(
  '/images',
  express.static(profileFolder, { maxAge: ONE_YEAR_IN_MILLIS })
);
app.use(
  '/attachments',
  express.static(attachmentFolder, { maxAge: ONE_YEAR_IN_MILLIS })
);

app.use(morgan('dev'));

app.use(tokenAuthentication);

app.use('/api/1.0', router);

app.use(errorHandler);

app.use('*', notFoundHandler);

export default app;
