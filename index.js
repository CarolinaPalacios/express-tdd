import app from './src/app.js';
import sequelize from './src/config/database.js';
import { scheduleCleanup } from './src/service/tokenService.js';
import { removeUnusedAttachments } from './src/service/fileService.js';
import logger from './src/shared/logger.js';

sequelize.sync();

scheduleCleanup();
removeUnusedAttachments();

app.listen(process.env.PORT || 3000, () =>
  logger.info(`server is running. version: ${process.env.npm_package_version}`)
);
