module.exports = {
  database: {
    database: 'hoaxify',
    username: 'db-user',
    password: 'db-p4ss',
    dialect: 'sqlite',
    storage: './database.sqlite3',
    logging: false,
  },
  mail: {
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
      user: 'esteban4@ethereal.email',
      pass: 'vsF9rh9xTKC5176De7',
    },
  },
  uploadDir: 'uploads-dev',
  profileDir: 'profile',
  attachmentDir: 'attachment',
};
