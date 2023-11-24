import request from 'supertest';
import bcrypt from 'bcrypt';
import app from '../src/app';
import User from '../src/models/User';
import Token from '../src/models/Token';
import en from '../locales/en/translation.json';
import es from '../locales/es/translation.json';

beforeEach(async () => {
  await User.destroy({ truncate: { cascade: true } });
});

const activeUser = {
  username: 'user1',
  email: 'user1@mail.com',
  password: 'P4ssword',
  inactive: false,
};

const credentials = {
  email: 'user1@mail.com',
  password: 'P4ssword',
};

const addUser = async (user = { ...activeUser }) => {
  const hash = await bcrypt.hash(user.password, 10);
  user.password = hash;
  return await User.create(user);
};

const postAuthentication = async (credentials, options = {}) => {
  const agent = request(app).post('/api/1.0/auth');
  if (options.language) {
    agent.set('Accept-Language', options.language);
  }
  return await agent.send(credentials);
};

const postLogout = (options = {}) => {
  const agent = request(app).post('/api/1.0/auth/logout');
  if (options.token) {
    agent.set('Authorization', `Bearer ${options.token}`);
  }
  return agent.send();
};

describe('Authentication', () => {
  it('returns 200 OK when credentials are correct', async () => {
    await addUser();
    const response = await postAuthentication(credentials);
    expect(response.status).toBe(200);
  });

  it('returns user id, username, image and token when login success', async () => {
    const user = await addUser();
    const response = await postAuthentication(credentials);
    expect(response.body.id).toBe(user.id);
    expect(response.body.username).toBe(user.username);
    expect(Object.keys(response.body)).toEqual([
      'id',
      'username',
      'image',
      'token',
    ]);
  });

  it('returns 401 when user does not exist', async () => {
    const response = await postAuthentication(credentials);
    expect(response.status).toBe(401);
  });

  it('returns proper error body when authentication fails', async () => {
    const nowInMillis = new Date().getTime();
    const response = await postAuthentication(credentials);
    const error = response.body;
    expect(error.path).toBe('/api/1.0/auth');
    expect(error.timestamps).toBeGreaterThan(nowInMillis);
    expect(Object.keys(error)).toEqual(['message', 'timestamps', 'path']);
  });

  it.each`
    language | message
    ${'es'}  | ${es.authentication_failure}
    ${'en'}  | ${en.authentication_failure}
  `(
    'returns $message when authentication fails and language is set as $language',
    async ({ language, message }) => {
      const response = await postAuthentication(credentials, { language });
      expect(response.body.message).toBe(message);
    }
  );

  it('returns 401 when password is wrong', async () => {
    await addUser();
    const response = await postAuthentication({
      ...credentials,
      password: 'wrong',
    });
    expect(response.status).toBe(401);
  });

  it('returns 403 when logging in with an inactive account', async () => {
    await addUser({ ...activeUser, inactive: true });
    const response = await postAuthentication(credentials);
    expect(response.status).toBe(403);
  });

  it('returns proper error body when inactive authentication fails', async () => {
    await addUser({ ...activeUser, inactive: true });
    const nowInMillis = new Date().getTime();
    const response = await postAuthentication(credentials);
    const error = response.body;
    expect(error.path).toBe('api/1.0/auth');
    expect(error.timestamps).toBeGreaterThan(nowInMillis);
    expect(Object.keys(error)).toEqual(['message', 'timestamps', 'path']);
  });

  it.each`
    language | message
    ${'es'}  | ${es.inactive_authentication_failure}
    ${'en'}  | ${en.inactive_authentication_failure}
  `(
    'returns $message when authenticaion fails for an inactive account and language is set as $language',
    async ({ language, message }) => {
      await addUser({ ...activeUser, inactive: true });
      const response = await postAuthentication(credentials, { language });
      expect(response.body.message).toBe(message);
    }
  );

  it('returns 401 when e-mail is not valid', async () => {
    const response = await postAuthentication({ password: 'P4ssword' });
    expect(response.status).toBe(401);
  });

  it('returns 401 when password is not valid', async () => {
    const response = await postAuthentication({ email: 'user1@mail.com' });
    expect(response.status).toBe(401);
  });

  it('returns token in response body when credentials are correct', async () => {
    await addUser();
    const response = await postAuthentication(credentials);
    expect(response.body.token).not.toBeUndefined();
  });
});

describe('Logout', () => {
  it('returns 200 OK when unauthorized request is sent for logout', async () => {
    const response = await postLogout();
    expect(response.status).toBe(200);
  });

  it('removes the token from database', async () => {
    await addUser();
    const response = await postAuthentication(credentials);
    const token = response.body.token;
    await postLogout({ token });
    const storedToken = await Token.findOne({ where: { token } });
    expect(storedToken).toBeNull();
  });
});

describe('Token Expiration', () => {
  const putUser = async (id = 5, body = null, options = {}) => {
    let agent = request(app);
    agent = request(app).put(`/api/1.0/users/${id}`);
    if (options.token) {
      agent.set('Authorization', `Bearer ${options.token}`);
    }
    return agent.send(body);
  };

  it('returns 403 when token is older than 1 week', async () => {
    const savedUser = await addUser();
    const token = 'test-token';
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 - 1);
    await Token.create({
      token,
      userId: savedUser.id,
      lastUsedAt: oneWeekAgo,
    });
    const validUpdate = { username: 'user1-updated' };
    const response = await putUser(savedUser.id, validUpdate, { token });
    expect(response.status).toBe(403);
  });

  it('refreshes lastUsedAt when unexpired token is used', async () => {
    const savedUser = await addUser();
    const token = 'test-token';
    const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
    await Token.create({
      token,
      userId: savedUser.id,
      lastUsedAt: fourDaysAgo,
    });
    const validUpdate = { username: 'user1-updated' };
    const rightBeforeSendingRequest = new Date();
    await putUser(savedUser.id, validUpdate, { token });
    const tokenInDB = await Token.findOne({ where: { token } });
    expect(tokenInDB.lastUsedAt.getTime()).toBeGreaterThan(
      rightBeforeSendingRequest.getTime()
    );
  });

  it('refreshes lastUsedAt when unexpired token is used for unauthenticated endpoint', async () => {
    const savedUser = await addUser();
    const token = 'test-token';
    const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
    await Token.create({
      token,
      userId: savedUser.id,
      lastUsedAt: fourDaysAgo,
    });
    const rightBeforeSendingRequest = new Date();
    await request(app)
      .get('api/1.0/users/5')
      .set('Authorization', `Bearer ${token}`);
    const tokenInDB = await Token.findOne({ where: { token } });
    expect(tokenInDB.lastUsedAt.getTime()).toBeGreaterThan(
      rightBeforeSendingRequest.getTime()
    );
  });
});
