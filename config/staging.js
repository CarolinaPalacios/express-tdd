module.exports = {
  database: {
    database: 'hoaxify',
    username: 'db-user',
    password: 'db-p4ss',
    dialect: 'sqlite',
    storage: './staging.sqlite3',
    logging: false,
  },
  mail: {
    host: 'localhost',
    port: Math.floor(Math.random() * 2000) + 10000,
    tls: {
      rejectUnauthorized: false,
    },
  },
  uploadDir: 'uploads-staging',
  profileDir: 'profile',
  attachmentDir: 'attachment',
};
