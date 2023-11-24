import { Sequelize } from 'sequelize';
import { dbConfigs } from '../../database/config.js';

const dbConfig = dbConfigs.development;

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    dialect: dbConfig.dialect,
    storage: dbConfig.storage,
    logging: dbConfig.logging,
  }
);

export default sequelize;
