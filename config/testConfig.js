export const database = {
  database: 'hoaxify',
  username: 'db-user',
  password: 'db-p4ss',
  dialect: 'sqlite',
  storage: ':memory:',
  logging: false,
};
export const mail = {
  host: 'localhost',
  port: Math.floor(Math.random() * 2000) + 1000,
  tls: {
    rejectUnauthorized: false,
  },
};
export const uploadDir = 'uploads-test';
export const profileDir = 'profile';
export const attachmentDir = 'attachment';
