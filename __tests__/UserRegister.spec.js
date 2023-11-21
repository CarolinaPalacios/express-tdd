const request = require('supertest');
const SMTPServer = require('smtp-server').SMTPServer;
const config = require('config');
const en = require('../locales/en/translation.json');
const es = require('../locales/es/translation.json');
const sequelize = require('../src/database/database');
const app = require('../src/app');
const User = require('../src/models/User');

let lastMail, server;
let simulateSmtpFailure = false;

beforeAll(async () => {
  server = new SMTPServer({
    authOptional: true,
    onData(stream, session, callback) {
      let mailBody;
      stream.on('data', (data) => {
        mailBody += data.toString();
      });
      stream.on('end', () => {
        if (simulateSmtpFailure) {
          const error = new Error('Invalid mailbox');
          error.responseCode = 553;
          return callback(error);
        }
        lastMail = mailBody;
        callback();
      });
    },
  });

  await server.listen(config.mail.port, 'localhost');

  jest.setTimeout(20000);
});

beforeEach(async () => {
  simulateSmtpFailure = false;
  await User.destroy({ truncate: { cascade: true } });
});

afterAll(async () => {
  await server.close();
  jest.setTimeout(5000);
});

const validUser = {
  username: 'user1',
  email: 'user1@mail.com',
  password: 'P4ssword',
};
const postUser = (user = validUser, options = {}) => {
  const agent = request(app).post('/api/1.0/users');
  if (options.language) {
    agent.set('Accept-Language', options.language);
  }
  return agent.send(user);
};

describe('User registration', () => {
  it('returns 200 OK when signup request is valid', async () => {
    const response = await postUser();
    expect(response.status).toBe(200);
  });

  it('return success message when signup request is valid', async () => {
    const response = await postUser();
    expect(response.body.message).toBe(en.user_created);
  });

  it('saves the user to the database', async () => {
    await postUser();
    const userList = await User.findAll();
    expect(userList.length).toBe(1);
  });

  it('saves the username and email to the database', async () => {
    await postUser();
    const userList = await User.findAll();
    const savedUser = userList[0];
    expect(savedUser.username).toBe('user1');
    expect(savedUser.email).toBe('user1@mail.com');
  });

  it('hashes the password before saving it to the database', async () => {
    await postUser();
    const userList = await User.findAll();
    const savedUser = userList[0];
    expect(savedUser.password).not.toBe('P4ssword');
  });

  it('returns 400 when username is missing', async () => {
    const response = await postUser({
      username: null,
      email: 'user1@mail.com',
      password: 'P4ssword',
    });
    expect(response.status).toBe(400);
  });

  it('returns validationsErrors field in response body when validation error occurs', async () => {
    const response = await postUser({
      username: null,
      email: 'user1@mail.com',
      password: 'P4ssword',
    });
    const validationErrors = response.body.validationErrors;
    expect(validationErrors).not.toBeUndefined();
  });

  it('returns errors when both username and email are missing', async () => {
    const response = await postUser({
      username: null,
      email: null,
      password: 'P4ssword',
    });
    const validationErrors = response.body.validationErrors;
    // Object.keys in this case is working because the obj contains only strings, with numbers it will sort them 👀.
    expect(Object.keys(validationErrors)).toEqual(['username', 'email']);
  });

  it.each`
    field         | value               | expectedMessage
    ${'username'} | ${null}             | ${en.username_null}
    ${'username'} | ${'usr'}            | ${en.username_size}
    ${'username'} | ${'a'.repeat(21)}   | ${en.username_size}
    ${'email'}    | ${null}             | ${en.email_null}
    ${'email'}    | ${'mail.com'}       | ${en.email_invalid}
    ${'email'}    | ${'user.mail.com'}  | ${en.email_invalid}
    ${'email'}    | ${'user@mail'}      | ${en.email_invalid}
    ${'password'} | ${null}             | ${en.password_null}
    ${'password'} | ${'P4ssw'}          | ${en.password_size}
    ${'password'} | ${'allowercase'}    | ${en.password_pattern}
    ${'password'} | ${'ALLUPERCASE'}    | ${en.password_pattern}
    ${'password'} | ${'1234567890'}     | ${en.password_pattern}
    ${'password'} | ${'lowerandUPPER'}  | ${en.password_pattern}
    ${'password'} | ${'lowerand123456'} | ${en.password_pattern}
    ${'password'} | ${'UPPERAND123456'} | ${en.password_pattern}
  `(
    'returns $expectedMessage when $field is $value',
    async ({ field, expectedMessage, value }) => {
      const user = {
        username: 'user1',
        email: 'user1@mail.com',
        password: 'P4ssword',
      };
      user[field] = value;
      const response = await postUser(user);
      const validationErrors = response.body.validationErrors;
      expect(validationErrors[field]).toBe(expectedMessage);
    }
  );

  it(`returns ${en.email_inuse} when same email is already in use`, async () => {
    await User.create({ ...validUser });
    const response = await postUser();
    const validationErrors = response.body.validationErrors;
    expect(validationErrors.email).toBe(en.email_inuse);
  });

  it('return errors for both username is null and email is in use', async () => {
    await User.create({ ...validUser });
    const response = await postUser({
      username: null,
      email: validUser.email,
      password: 'P4ssword',
    });
    const validationErrors = response.body.validationErrors;
    expect(Object.keys(validationErrors)).toEqual(['username', 'email']);
  });

  it('creates user in inactive mode', async () => {
    await postUser();
    const userList = await User.findAll();
    const savedUser = userList[0];
    expect(savedUser.inactive).toBe(false);
  });
});
