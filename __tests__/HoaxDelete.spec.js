import request from 'supertest';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Hoax from '../src/models/Hoax.js';
import FileAttachment from '../src/models/FileAttachment.js';
import en from '../locales/en/translation.json';
import es from '../locales/es/translation.json';
import { uploadDirConfigs, attachmentDirConfigs } from '../database/config.js';

const uploadDir = uploadDirConfigs.development;
const attachmentDir = attachmentDirConfigs.development;

const attachmentFolder = path.join('.', uploadDir, attachmentDir);

const filename = `test-file-hoax-delete${Date.now()}`;
const targetPath = path.join(attachmentFolder, filename);
const testFilePath = path.join('.', '__tests__', 'resources', 'test-png.png');

beforeEach(async () => {
  await User.destroy({ truncate: { cascade: true } });
  if (fs.existsSync(targetPath)) {
    fs.unlinkSync(targetPath);
  }
});

const activeUser = {
  username: 'user1',
  email: 'user1@mail.com',
  password: 'P4ssword',
  inactive: false,
};

const credentials = { email: 'user1@mail.com', password: 'P4ssword' };

const addUser = async (user = { ...activeUser }) => {
  const hash = await bcrypt.hash(user.password, 10);
  user.password = hash;
  return await User.create(user);
};

const addHoax = async (userId) => {
  return await Hoax.create({
    content: 'Hoax for user',
    timestamps: Date.now(),
    userId,
  });
};

const addFileAttachment = async (hoaxId) => {
  fs.copyFileSync(testFilePath, targetPath);
  return await FileAttachment.create({
    filename,
    uploadDate: new Date(),
    hoaxId,
  });
};

const auth = async (options = {}) => {
  let token;
  if (options.auth) {
    const response = await request(app)
      .post('/api/1.0/auth')
      .send(options.auth);
    token = response.body.token;
  }
  return token;
};

const deleteHoax = async (id = 5, options = {}) => {
  const agent = request(app).delete(`/api/1.0/hoaxes/${id}`);
  if (options.language) {
    agent.set('Accept-Language', options.language);
  }
  if (options.token) {
    agent.set('Authorization', `Bearer ${options.token}`);
  }
  return agent.send();
};

describe('Delete Hoax', () => {
  it('returns 403 when request is unauthorized', async () => {
    const response = await deleteHoax();
    expect(response.status).toBe(403);
  });

  it('returns 403 when token is invalid', async () => {
    const response = await deleteHoax(5, { token: 'invalid' });
    expect(response.status).toBe(403);
  });

  it.each`
    language | message
    ${'es'}  | ${es.unauthorized_hoax_delete}
    ${'en'}  | ${en.unauthorized_hoax_delete}
  `(
    'retuns error body with $message for unauthorized request when language is $language',
    async ({ language, message }) => {
      const nowInMillis = Date.now();
      const response = await deleteHoax(5, { language });
      expect(response.body.path).toBe('/api/1.0/hoaxes/5');
      expect(response.body.timestamps).toBeGreaterThan(nowInMillis);
      expect(response.body.message).toBe(message);
    }
  );

  it('returns 403 when user tries to delete another users hoax', async () => {
    const user = await addUser();
    const hoax = await addHoax(user.id);
    const user2 = await addUser({
      ...activeUser,
      username: 'user2',
      email: 'user2@mail.com',
    });
    const token = await auth({
      auth: { email: user2.email, password: 'P4ssword' },
    });
    const response = await deleteHoax(hoax.id, { token });
    expect(response.status).toBe(403);
  });

  it('returns 200 OK when user deletes their hoax', async () => {
    const user = await addUser();
    const hoax = await addHoax(user.id);
    const token = await auth({ auth: credentials });
    const response = await deleteHoax(hoax.id, { token });
    expect(response.status).toBe(200);
  });

  it('removes the hoax from the databse when user deletes their hoax', async () => {
    const user = await addUser();
    const hoax = await addHoax(user.id);
    const token = await auth({ auth: credentials });
    await deleteHoax(hoax.id, { token });
    const deletedHoax = await Hoax.findByPk(hoax.id);
    expect(deletedHoax).toBeNull();
  });

  it('removes the fileAttachment from database when user deletes their hoax', async () => {
    const user = await addUser();
    const hoax = await addHoax(user.id);
    const attachment = await addFileAttachment(hoax.id);
    const token = await auth({ auth: credentials });
    await deleteHoax(hoax.id, { token });
    const attachmentInDb = await FileAttachment.findByPk(attachment.id);
    expect(attachmentInDb).toBeNull();
  });

  it('removes the file from storage when user deletes their hoax', async () => {
    const user = await addUser();
    const hoax = await addHoax(user.id);
    await addFileAttachment(hoax.id);
    const token = await auth({ auth: credentials });
    await deleteHoax(hoax.id, { token });
    expect(fs.existsSync(targetPath)).toBe(false);
  });
});
