export const database = {
  database: 'hoaxify',
  username: 'db-user',
  password: 'db-p4ss',
  dialect: 'sqlite',
  storage: './dev.sqlite3',
  logging: false,
};
export const mail = {
  host: 'smtp.ethereal.email',
  port: 587,
  auth: {
    user: 'eldred.king79@ethereal.email',
    pass: 'P9QAMk7pkzpSJUyquh',
  },
  logger: false,
  debug: false,
};
export const uploadDir = 'uploads-dev';
export const profileDir = 'profile';
export const attachmentDir = 'attachment';
