const nodemailer = require('nodemailer');
const transporter = require('../config/emailTransporter');
const logger = require('../shared/logger');

const sendAccountActivation = async (email, token) => {
  const info = await transporter.sendMail({
    from: 'My app <info@my-app.com>',
    to: email,
    subject: 'Account activation',
    html: `
    <div>
      <p>Please, click on the link below to activate your account</p>
      </div>
      <div>
      <a href="http://localhost:8080/#/login=${token}">Activate</a>
      </div>
    `,
  });
  logger.info(`url: ${nodemailer.getTestMessageUrl(info)}`);
};

const sendPasswordReset = async (email, token) => {
  const info = await transporter.sendMail({
    from: 'My app <info@my-app.com>',
    to: email,
    subject: 'Password reset',
    html: `
    <div>
      <p>Please, click on the link below to reset your password</p>
      </div>
      <div>
      <a href="http://localhost:8080/#/password-reset=${token}">Reset</a>
      </div>
    `,
  });
  logger.info(`url: ${nodemailer.getTestMessageUrl(info)}`);
};

module.exports = {
  sendAccountActivation,
  sendPasswordReset,
};
