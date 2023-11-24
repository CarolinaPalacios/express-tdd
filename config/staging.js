export const database = {
  database: 'hoaxify',
  username: 'db-user',
  password: 'db-p4ss',
  dialect: 'sqlite',
  storage: './staging.sqlite3',
  logging: false,
};
export const mail = {
  host: 'localhost',
  port: Math.floor(Math.random() * 2000) + 10000,
  tls: {
    rejectUnauthorized: false,
  },
};
export const uploadDir = 'uploads-staging';
export const profileDir = 'profile';
export const attachmentDir = 'attachment';
