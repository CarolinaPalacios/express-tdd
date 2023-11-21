module.exports = {
  database: {
    database: 'hoaxify',
    username: 'db-user',
    password: 'db-p4ss',
    dialect: 'sqlite',
    storage: ':memory:',
    logging: false,
  },
  mail: {
    host: 'localhost',
    port: Math.floor(Math.random() * 2000) + 1000,
    tls: {
      rejectUnauthorized: false,
    },
  },
  uploadDir: 'uploads-test',
  profileDir: 'profile',
  attachmentDir: 'attachment',
};
