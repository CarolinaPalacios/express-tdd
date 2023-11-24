export const database = {
  database: 'hoaxify',
  username: 'db-user',
  password: 'db-p4ss',
  dialect: 'sqlite',
  storage: './prod-db.sqlite',
  logging: false,
};
export const mail = {
  host: 'smtp.ethereal.email',
  port: 587,
  auth: {
    user: 'esteban4@ethereal.email',
    pass: 'vsF9rh9xTKC5176De7',
  },
};
export const uploadDir = 'uploads-production';
export const profileDir = 'profile';
export const attachmentDir = 'attachment';
