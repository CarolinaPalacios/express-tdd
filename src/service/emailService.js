import { getTestMessageUrl } from 'nodemailer';
import transporter from '../config/emailTransporter.js';
import logger from '../shared/logger.js';

export const sendAccountActivation = async (email, token) => {
  const message = {
    from: 'My app <info@my-app.com>',
    to: email,
    subject: 'Account activation',
    html: `
    <div>
      <p>Please, click on the link below to activate your account</p>
      </div>
      <div>
      <a href="http://localhost:8080/#/account-activation=${token}">Activate</a>
      </div>
    `,
  };
  const info = transporter.sendMail(message);

  logger.info(`url: ${getTestMessageUrl(info)}`);
  return info;
};

export const sendPasswordReset = async (email, token) => {
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
  logger.info(`url: ${getTestMessageUrl(info)}`);
};
