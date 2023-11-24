import request from 'supertest';
import bcrypt from 'bcrypt';
import path from 'path';
import app from '../src/app.js';
import es from '../locales/es/translation.json';
import en from '../locales/en/translation.json';
import User from '../src/models/User.js';
import Hoax from '../src/models/Hoax.js';
import FileAttachment from '../src/models/FileAttachment.js';

beforeEach(async () => {
  await FileAttachment.destroy({ truncate: true });
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
  const hash = await bcrypt.hash(user.password, 10);
  user.password = hash;
  return await User.create(user);
};

const postHoax = async (body = null, options = {}) => {
  let agent = request(app);
  let token;
  if (options.auth) {
    const response = await agent.post('/api/1.0/auth').send(options.auth);
    token = response.body.token;
  }
  agent = request(app).post('/api/1.0/hoaxes');
  if (options.language) {
    agent.set('Accept-Language', options.language);
  }
  if (token) {
    agent.set('Authorization', `Bearer ${token}`);
  }
  if (options.token) {
    agent.set('Authorization', `Bearer ${options.token}`);
  }
  return agent.send(body);
};

const uploadFile = (file = 'test-png.png', options = {}) => {
  const agent = request(app).post('/api/1.0/hoaxes/attachments');
  if (options.language) {
    agent.set('Accept-Language', options.language);
  }
  return agent.attach('file', path.join('.', '__tests__', 'resources', file));
};

describe('Post Hoax', () => {
  it('returns 401 when hoax post request has no authentication', async () => {
    const response = await postHoax();
    expect(response.status).toBe(401);
  });

  it.each`
    language | message
    ${'es'}  | ${es.unauthorized_hoax_submit}
    ${'en'}  | ${en.unauthorized_hoax_submit}
  `(
    'returns error body with $message when unauthorized request is sent with language $language',
    async ({ language, message }) => {
      const nowInMillis = Date.now();
      const response = await postHoax(null, { language });
      const error = response.body;
      expect(error.path).toBe('/api/1.0/hoaxes');
      expect(error.message).toBe(message);
      expect(error.timestamps).toBeGreaterThanOrEqual(nowInMillis);
    }
  );

  it('returns 200 OK when valid hoax is submitted with authorized user', async () => {
    await addUser();
    const response = await postHoax(
      { content: 'hoax content' },
      { auth: credentials }
    );
    expect(response.status).toBe(200);
  });

  it('saves the hoax to database when authorized user sends valid request', async () => {
    await addUser();
    await postHoax({ content: 'hoax content' }, { auth: credentials });
    const hoaxes = await Hoax.findAll();
    expect(hoaxes.length).toBe(1);
  });

  it('saves the hoax content and timestamps to database', async () => {
    await addUser();
    const beforeSubmit = Date.now();
    await postHoax({ content: 'hoax-content' }, { auth: credentials });
    const hoaxes = await Hoax.findAll();
    const savedHoax = hoaxes[0];
    expect(savedHoax.content).toBe('hoax-content');
    expect(savedHoax.timestamps).toBeGreaterThan(beforeSubmit);
    expect(savedHoax.timestamps).toBeLessThan(Date.now());
  });

  it.each`
    language | message
    ${'es'}  | ${es.hoax_submit_success}
    ${'en'}  | ${en.hoax_submit_success}
  `(
    'returns $message to success submit when language is $language',
    async ({ language, message }) => {
      await addUser();
      const response = await postHoax(
        { content: 'hoax-content' },
        { auth: credentials, language }
      );
      expect(response.body.message).toBe(message);
    }
  );

  it.each`
    language | message
    ${'es'}  | ${es.validation_failure}
    ${'en'}  | ${en.validation_failure}
  `(
    'returns 400 and $message when hoax content is less than 10 characters and language is $language',
    async ({ language, message }) => {
      await addUser();
      const response = await postHoax(
        { content: 'hoax' },
        { auth: credentials, language }
      );
      expect(response.status).toBe(400);
      expect(response.body.message).toBe(message);
    }
  );

  it('returns validation error body when an invalid hoax post by authorized user', async () => {
    await addUser();
    const nowInMillis = Date.now();
    const response = await postHoax({ content: 'hoax' }, { auth: credentials });
    const error = response.body;
    expect(error.path).toBe('/api/1.0/hoaxes');
    expect(error.timestamps).toBeGreaterThan(nowInMillis);
    expect(Object.keys(error)).toEqual([
      'message',
      'timestamps',
      'path',
      'validationErrors',
    ]);
  });

  it.each`
    language | content             | contentForDescription | message
    ${'es'}  | ${null}             | ${'null'}             | ${es.hoax_content_size}
    ${'es'}  | ${'a'.repeat(9)}    | ${'short'}            | ${es.hoax_content_size}
    ${'es'}  | ${'a'.repeat(5001)} | ${'very long'}        | ${es.hoax_content_size}
    ${'en'}  | ${null}             | ${'null'}             | ${en.hoax_content_size}
    ${'en'}  | ${'a'.repeat(9)}    | ${'short'}            | ${en.hoax_content_size}
    ${'en'}  | ${'a'.repeat(5001)} | ${'very long '}       | ${en.hoax_content_size}
  `(
    'returns $message when the content is $contentForDescription and language is $language',
    async ({ language, content, message }) => {
      await addUser();
      const response = await postHoax(
        { content },
        { auth: credentials, language }
      );
      expect(response.body.validationErrors.content).toBe(message);
    }
  );

  it('stores hoax owner id in database', async () => {
    const user = await addUser();
    await postHoax({ content: 'hoax content' }, { auth: credentials });
    const hoaxes = await Hoax.findAll();
    const savedHoax = hoaxes[0];
    expect(savedHoax.userId).toBe(user.id);
  });

  it('associates hoax with attachment in database', async () => {
    const uploadResponse = await uploadFile();
    const uploadedFileId = uploadResponse.body.id;
    await addUser();
    await postHoax(
      {
        content: 'hoax content',
        fileAttachment: uploadedFileId,
      },
      {
        auth: credentials,
      }
    );
    const hoaxes = await Hoax.findAll();
    const hoax = hoaxes[0];
    const attachmentInDB = await FileAttachment.findByPk(uploadedFileId);
    expect(attachmentInDB.hoaxId).toBe(hoax.id);
  });

  it('returns 200 OK even the attachment does not exist', async () => {
    await addUser();
    const response = await postHoax(
      { content: 'hoax content', fileAttachment: 1000 },
      { auth: credentials }
    );
    expect(response.status).toBe(200);
  });

  it('keeps the old associated hoax when new hoax is submitted with old attachment id', async () => {
    const uploadResponse = await uploadFile();
    const uploadedFileId = uploadResponse.body.id;
    await addUser();
    await postHoax(
      {
        content: 'hoax content',
        fileAttachment: uploadedFileId,
      },
      { auth: credentials }
    );
    const attachment = await FileAttachment.findByPk(uploadedFileId);
    await postHoax(
      {
        content: 'hoax content 2',
        fileAttachment: uploadedFileId,
      },
      { auth: credentials }
    );

    const attachmentAfterSecondPost = await FileAttachment.findByPk(
      uploadedFileId
    );
    expect(attachment.hoaxId).toBe(attachmentAfterSecondPost.hoaxId);
  });
});
