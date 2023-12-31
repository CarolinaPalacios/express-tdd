import request from 'supertest';
import bcrypt from 'bcrypt';
import app from '../src/app.js';
import en from '../locales/en/translation.json';
import es from '../locales/es/translation.json';
import User from '../src/models/User.js';

beforeEach(async () => {
  await User.destroy({ truncate: { cascade: true } });
});

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

const getUsers = (options = {}) => {
  const agent = request(app).get('/api/1.0/users');
  if (options.token) {
    agent.set('Authorization', `Bearer ${options.token}`);
  }
  return agent;
};

const addUsers = async (activeUserCount, inactiveUserCount = 0) => {
  const hash = await bcrypt.hash('P4ssword', 10);
  for (let i = 0; i < activeUserCount + inactiveUserCount; i++) {
    await User.create({
      username: `user${i + 1}`,
      email: `user${i + 1}@mail.com`,
      inactive: i >= activeUserCount,
      password: hash,
    });
  }
};

describe('Listing Users', () => {
  it('returns 200 OK when rhere are no user in database', async () => {
    const response = await getUsers();
    expect(response.status).toBe(200);
  });

  it('returns page object as response body', async () => {
    const response = await getUsers();
    expect(response.body).toEqual({
      content: [],
      totalPages: 0,
      nextPage: 1,
      prevPage: null,
    });
  });

  it('returns 10 users in page content when there are 11 users in database', async () => {
    await addUsers(11);
    const response = await getUsers();
    expect(response.body.content).toHaveLength(10);
  });

  it('returns 6 user in page content when there are 6 active users and 5 inactive users in database', async () => {
    await addUsers(6, 5);
    const response = await getUsers();
    expect(response.body.content).toHaveLength(6);
  });

  it('returns only id, username, email and image in contetn array for each user', async () => {
    await addUsers(11);
    const response = await getUsers();
    const user = response.body.content[0];
    expect([Object.keys(user)]).toEqual([['id', 'username', 'email', 'image']]);
  });

  it('returns 2 as totalPages when there are 15 active and 7 inactive users', async () => {
    await addUsers(15, 7);
    const response = await getUsers();
    expect(response.body.totalPages).toBe(2);
  });

  it('returns second page users and page indicator when page is set as 1 in request parameter', async () => {
    await addUsers(11);
    const response = await getUsers().query({ page: 1 });
    expect(response.body.content[0].username).toBe('user11');
    expect(response.body.page).toBe(1);
  });

  it('returns 5 users and corresponding size indicator when size is set as 5 in request parameter', async () => {
    await addUsers(11);
    const response = await getUsers().query({ size: 5 });
    expect(response.body.content.length).toBe(5);
    expect(response.body.size).toBe(5);
  });

  it('returns 10 users and corresponding size indicator when size is set as 1000', async () => {
    await addUsers(11);
    const response = await getUsers().query({ size: 1000 });
    expect(response.body.content.length).toBe(10);
    expect(response.body.size).toBe(10);
  });

  it('returns 10 users and corresponding size indicator when size is set as 0', async () => {
    await addUsers();
    const response = await getUsers().query({ size: 0 });
    expect(response.body.content.length).toBe(10);
    expect(response.body.size).toBe(10);
  });

  it('return page as 0 and size as 10 when non numeric query params provided for both', async () => {
    await addUsers();
    const response = await getUsers().query({ size: 'size', page: 'page' });
    expect(response.body.size).toBe(10);
    expect(response.body.page).toBe(0);
  });

  it('returns user page without logged in user when reques has valid authorization', async () => {
    await addUsers(11);
    const token = await auth({
      auth: { email: 'user1@mail.com', password: 'P4ssword' },
    });
    const response = await getUsers({ token });
    expect(response.body.totalPages).toBe(1);
  });
});

describe('Get User', () => {
  const getUser = (id = 5) => {
    return request(app).get(`/api/1.0/users/${id}`);
  };

  it('returns 404 when user not found', async () => {
    const response = await getUser();
    expect(response.status).toBe(404);
  });

  it.each`
    language | message
    ${'es'}  | ${es.user_not_found}
    ${'en'}  | ${en.user_not_found}
  `(
    'returns $message for unknown user when language is set as $language',
    async ({ language, message }) => {
      const response = await getUser().set('Accept-Language', language);
      expect(response.body.message).toBe(message);
    }
  );

  it('returns proper error body when user not found', async () => {
    const nowInMillis = new Date().getTime();
    const response = await getUser();
    const error = response.body;
    expect(error.path).toBe('/api/1.0/users/5');
    expect(error.timestamps).toBeGreaterThan(nowInMillis);
    expect(Object.keys(error)).toEqual(['message', 'timestamps', 'path']);
  });

  it('returns 200 OK when an active user exist', async () => {
    const user = await User.create({
      username: 'user1',
      email: 'user1@mail',
      inactive: false,
    });
    const response = await getUser(user.id);
    expect(response.status).toBe(200);
  });

  it('returns id, username, email and image in response body when an active user exist', async () => {
    const user = await User.create({
      username: 'user1',
      email: 'user1@mail',
      inactive: false,
    });
    const response = await getUser(user.id);
    expect(Object.keys(response.body)).toEqual([
      'id',
      'username',
      'email',
      'image',
    ]);
  });

  it('returns 404 when the user is inactive', async () => {
    const user = await User.create({
      username: 'user1',
      email: 'user1@mail',
      inactive: true,
    });
    const response = await getUser(user.id);
    expect(response.status).toBe(404);
  });
});
