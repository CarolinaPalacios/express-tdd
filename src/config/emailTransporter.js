import { createTransport } from 'nodemailer';
import { mailConfigs } from '../../database/config.js';

const mailConfig = mailConfigs.development;

const transporter = createTransport({ ...mailConfig });

export default transporter;
