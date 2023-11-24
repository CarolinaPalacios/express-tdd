import request from 'supertest';
import bcrypt from 'bcrypt';
import path from 'path';
import fs from 'fs';

import User from '../src/models/User.js';
import Token from '../src/models/Token.js';
import FileAttachment from '../src/models/FileAttachment.js';
import Hoax from '../src/models/Hoax.js';

import app from '../src/app.js';

import en from '../locales/en/translation.json';
import es from '../locales/es/translation.json';

import {
  uploadDirConfigs,
  profileDirConfigs,
  attachmentDirConfigs,
} from '../database/config.js';

const uploadDir = uploadDirConfigs.development;
const profileDir = profileDirConfigs.development;
const attachmentDir = attachmentDirConfigs.development;

const profileFolder = path.join('.', uploadDir, profileDir);
const attachmentFolder = path.join('.', uploadDir, attachmentDir);

beforeEach(async () => {
  await User.destroy({ truncate: { cascade: true } });
});

const activeUser = {
  username: 'user1',
  email: 'user1@mail.com',
  password: 'P4ssword',
  inactive: false,
};

const credentials = { email: 'user1@mail.com', password: 'P4ssword' };

const addUser = async (user = { ...activeUser }) => {
  const hash = bcrypt.hash(user.password, 10);
  user.password = hash;
  return await User.create(user);
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

const deleteUser = async (id = 5, options = {}) => {
  const agent = request(app).delete(`/api/1.0/users/${id}`);
  if (options.language) {
    agent.set('Accept-Language', options.language);
  }
  if (options.token) {
    agent.set('Authorization', `Bearer ${options.token}`);
  }
  return agent.send();
};

describe('User Delete', () => {
  it('returns forbidden when request sent unauthorized', async () => {
    const response = await deleteUser();
    expect(response.status).toBe(403);
  });

  it.each`
    language | message
    ${'es'}  | ${es.unauthorized_user_delete}
    ${'en'}  | ${en.unauthorized_user_delete}
  `(
    'returns error body with $message for unauthorized request when language is $language',
    async ({ language, message }) => {
      const nowInMillis = new Date().getTime();
      const response = await deleteUser(5, { language });
      expect(response.body.path).toBe('/api/1.0/users/5');
      expect(response.body.timestamps).toBeGreaterThan(nowInMillis);
      expect(response.body.message).toBe(message);
    }
  );

  it('returns forbidden when delete request is sent with correct credentials but for different user', async () => {
    await addUser();
    const userToBeDeleted = await addUser({
      ...activeUser,
      username: 'user2',
      email: 'user2@mail.com',
    });
    const token = await auth({ auth: credentials });
    const response = await deleteUser(userToBeDeleted.id, { token });
    expect(response.status).toBe(403);
  });

  it('returns 403 when token is not valid', async () => {
    const response = await deleteUser(5, { token: 'not-valid' });
    expect(response.status).toBe(403);
  });

  it('returns 200 OK when delete request sent from authorized user', async () => {
    const savedUser = await addUser();
    const token = await auth({ auth: credentials });
    const response = await deleteUser(savedUser.id, { token });
    expect(response.status).toBe(200);
  });

  it('deletes user from database when request sent from authorized user', async () => {
    const savedUser = await addUser();
    const token = await auth({ auth: credentials });
    await deleteUser(savedUser.id, { token });

    const inDBUser = await User.findByPk(savedUser.id);
    expect(inDBUser).toBeNull();
  });

  it('deletes token from database when delete user request is sent from authorized user', async () => {
    const savedUser = await addUser();
    const token = await auth({ auth: credentials });
    await deleteUser(savedUser.id, { token });

    const tokenInDB = await Token.findOne({ where: { token } });
    expect(tokenInDB).toBeNull();
  });

  it('deletes all tokens from database when delete user request is sent from authorized user', async () => {
    const savedUser = await addUser();
    const token1 = await auth({ auth: credentials });
    const token2 = await auth({ auth: credentials });
    await deleteUser(savedUser.id, { token: token1 });

    const tokenInDB = await Token.findOne({ where: { token: token2 } });
    expect(tokenInDB).toBeNull();
  });

  it('deletes hoax from database when delete user request is sent from authorized user', async () => {
    const savedUser = await addUser();
    const token = await auth({ auth: credentials });

    await request(app)
      .post('/api/1.0/hoaxes')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Hoax content' });

    await deleteUser(savedUser.id, { token });

    const hoaxes = await Hoax.findAll();
    expect(hoaxes.length).toBe(0);
  });

  it('removes profile image when user is deleted', async () => {
    const user = await addUser();
    const token = await auth({ auth: credentials });
    const storedFileName = 'profile-image-user1';
    const testFilePath = path.join(
      '.',
      '__tests__',
      'resources',
      'test-png.png'
    );
    const targetPath = path.join(profileFolder, storedFileName);
    fs.copyFileSync(testFilePath, targetPath);
    user.image = storedFileName;
    await user.save();
    await deleteUser(user.id, { token });
    expect(fs.existsSync(targetPath)).toBe(false);
  });

  it('deletes hoax attachment from storage and database when delete user request is sent from authorized user', async () => {
    const savedUser = await addUser();
    const token = await auth({ auth: credentials });

    const storedFileName = 'hoax-attachment-user1';
    const testFilePath = path.join(
      '.',
      '__tests__',
      'resources',
      'test-png.png'
    );
    const targetPath = path.join(attachmentFolder, storedFileName);
    fs.copyFileSync(testFilePath, targetPath);

    const storedAttachment = await FileAttachment.create({
      filename: storedFileName,
    });

    await request(app)
      .post('/api/1.0/hoaxes')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Hoax content', fileAttachmentId: storedAttachment.id });

    await deleteUser(savedUser.id, { token });

    const storedAttachmentAfterDelete = await FileAttachment.findOne({
      where: { id: storedAttachment.id },
    });

    expect(storedAttachmentAfterDelete).toBeNull();
    expect(fs.existsSync(targetPath)).toBe(false);
  });
});
