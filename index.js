const app = require('./src/app');
const sequelize = require('./src/config/database');
const tokenService = require('./src/service/tokenService');
const fileService = require('./src/service/fileService');
const logger = require('./src/shared/logger');

sequelize.sync();

tokenService.scheduleCleanup();
fileService.removeUnusedAttachments();

app.listen(process.env.PORT || 3000, () =>
  logger.info(`server is running. version: ${process.env.npm_package_version}`)
);
