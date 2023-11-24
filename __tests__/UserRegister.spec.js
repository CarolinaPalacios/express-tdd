import request from 'supertest';
import { SMTPServer } from 'smtp-server';
import { jest } from '@jest/globals';
import { mailConfigs } from '../database/config.js';

import en from '../locales/en/translation.json';
import es from '../locales/es/translation.json';
import app from '../src/app.js';
import User from '../src/models/User.js';

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

  server.listen(mailConfigs.test.port, 'localhost');

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
    expect(response.body.message).toBe(en.user_create_success);
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
    expect(savedUser.inactive).toBe(true);
  });

  it('creates user in inactive mode even the request body contains inactive as false', async () => {
    const newUser = { ...validUser, inactive: false };
    await postUser(newUser);
    const users = await User.findAll();
    const savedUser = users[0];
    expect(savedUser.inactive).toBe(true);
  });

  it('creates an activationToken for user', async () => {
    await postUser();
    const userList = await User.findAll();
    const savedUser = userList[0];
    expect(savedUser.activationToken).toBeTruthy();
  });

  it('sends an account activation email with activationToken', async () => {
    await postUser();
    const userList = await User.findAll();
    const savedUser = userList[0];
    expect(lastMail).toContain('user1@mail.com');
    expect(lastMail).toContain(savedUser.activationToken);
  });

  it('returns 502 bad gateway when sending email fails', async () => {
    simulateSmtpFailure = true;
    const response = await postUser();
    expect(response.status).toBe(502);
  });

  it('returns email failure message when sending email fails', async () => {
    simulateSmtpFailure = true;
    const response = await postUser();
    expect(response.body.message).toBe(en.email_failure);
  });

  it('does not save user to database if activation email fails', async () => {
    simulateSmtpFailure = true;
    await postUser();
    const userList = await User.findAll();
    expect(userList.length).toBe(0);
  });

  it('returns Validation Failure message in error response body when validation fails', async () => {
    const response = await postUser({
      username: null,
      email: validUser.email,
      password: 'P4ssword',
    });
    expect(response.body.message).toBe(en.validation_failure);
  });
});

describe('Internationalization', () => {
  it.each`
    field         | value               | expectedMessage
    ${'username'} | ${null}             | ${es.username_null}
    ${'username'} | ${'usr'}            | ${es.username_size}
    ${'username'} | ${'a'.repeat(33)}   | ${es.username_size}
    ${'email'}    | ${null}             | ${es.email_null}
    ${'email'}    | ${'mail.com'}       | ${es.email_invalid}
    ${'email'}    | ${'user.mail.com'}  | ${es.email_invalid}
    ${'email'}    | ${'user@mail'}      | ${es.email_invalid}
    ${'password'} | ${null}             | ${es.password_null}
    ${'password'} | ${'P4ssw'}          | ${es.password_size}
    ${'password'} | ${'allowercase'}    | ${es.password_pattern}
    ${'password'} | ${'ALLUPERCASE'}    | ${es.password_pattern}
    ${'password'} | ${'1234567890'}     | ${es.password_pattern}
    ${'password'} | ${'lowerandUPPER'}  | ${es.password_pattern}
    ${'password'} | ${'lowerand123456'} | ${es.password_pattern}
    ${'password'} | ${'UPPERAND123456'} | ${es.password_pattern}
  `(
    'returns $expectedMessage when $field is $value when language is set as spanish',
    async ({ field, expectedMessage, value }) => {
      const user = {
        username: 'user1',
        email: 'user1@mail',
        password: 'P4ssword',
      };
      user[field] = value;
      const response = await postUser(user, { language: 'es' });
      const validationErrors = response.body.validationErrors;
      expect(validationErrors[field]).toBe(expectedMessage);
    }
  );

  it(`returns ${es.email_inuse} when same email is already in use and language is set as spanish`, async () => {
    await User.create(validUser);
    const response = await postUser(validUser, { language: 'es' });
    const validationErrors = response.body.validationErrors;
    expect(validationErrors.email).toBe(es.email_inuse);
  });

  it(`returns success message of ${es.user_create_success} when signup request is valid and language is set as spanish`, async () => {
    const response = await postUser({ ...validUser }, { language: 'es' });
    expect(response.body.message).toBe(es.user_create_success);
  });

  it(`returns ${es.email_failure} when sending email fails and language is set as spanish`, async () => {
    simulateSmtpFailure = true;
    const response = await postUser({ ...validUser }, { language: 'es' });
    expect(response.body.message).toBe(es.email_failure);
  });

  it(`returns ${es.validation_failure} message in error response body when validation fails and language is set as spanish`, async () => {
    const response = await postUser(
      {
        username: null,
        email: validUser.email,
        password: 'P4ssword',
      },
      { language: 'es' }
    );
    expect(response.body.message).toBe(es.validation_failure);
  });
});

describe('Account activation', () => {
  it('activates the account when correct token is sent', async () => {
    await postUser();
    let users = await User.findAll();
    const token = users[0].activationToken;

    await request(app).post(`/api/1.0/users/token/${token}`).send();

    users = await User.findAll();
    expect(users[0].inactive).toBe(false);
  });

  it('removes the token from user table after successful activation', async () => {
    await postUser();
    let users = await User.findAll();
    const token = users[0].activationToken;

    await request(app).post(`/api/1.0/users/token/${token}`).send();

    users = await User.findAll();
    expect(users[0].activationToken).toBeFalsy();
  });

  it('does not activate the account when token is wrong', async () => {
    await postUser();
    const token = 'this-is-not-a-valid-token';
    await request(app).post(`/api/1.0/users/token/${token}`).send();
    const users = await User.findAll();
    expect(users[0].inactive).toBe(true);
  });

  it('returns bad request when token is wrong', async () => {
    await postUser();
    const token = 'this-is-not-a-valid-token';
    const response = await request(app)
      .post(`/api/1.0/users/token/${token}`)
      .send();
    expect(response.status).toBe(401);
  });

  it.each`
    language | tokenStatus  | message
    ${'es'}  | ${'wrong'}   | ${es.account_activation_failure}
    ${'en'}  | ${'wrong'}   | ${en.account_activation_failure}
    ${'es'}  | ${'correct'} | ${es.account_activation_success}
    ${'en'}  | ${'correct'} | ${en.account_activation_success}
  `(
    'returns $message when token is $tokenStatus and language is $language',
    async ({ language, tokenStatus, message }) => {
      await postUser();
      let token = 'this-token-does-not-exist';
      if (tokenStatus === 'correct') {
        const users = await User.findAll();
        token = users[0].activationToken;
      }
      const response = await request(app)
        .post('/api/1.0/users/token/' + token)
        .set('Accept-Language', language)
        .send();
      expect(response.body.message).toBe(message);
    }
  );
});

describe('Error Model', () => {
  it('returns message, timestamps, path and validationErrors in response when validation failure', async () => {
    const response = await postUser({ ...validUser, username: null });
    const body = response.body;
    expect(Object.keys(body)).toEqual([
      'message',
      'timestamps',
      'path',
      'validationErrors',
    ]);
  });

  it('returns  message, timestamps and path in response when request fails other than validation error', async () => {
    const token = 'this-token-does-not-exist';
    const response = await request(app)
      .post(`/api/1.0/users/token/${token}`)
      .send();
    const body = response.body;
    expect(Object.keys(body)).toEqual(['message', 'timestamps', 'path']);
  });

  it('returns path in error body', async () => {
    const token = 'this-token-does-not-exist';
    const response = await request(app)
      .post(`/api/1.0/users/token/${token}`)
      .send();
    const body = response.body;
    expect(body.path).toEqual(`/api/1.0/users/token/${token}`);
  });

  it('returns timestamp in miliseconds within 5 seconds value in error body', async () => {
    const nowInMillis = new Date().getTime();
    const fiveSecondsLater = nowInMillis + 5 * 1000;
    const token = 'this-token-does-not-exist';
    const response = await request(app)
      .post(`/api/1.0/users/token/${token}`)
      .send();
    const body = response.body;
    expect(body.timestamps).toBeGreaterThan(nowInMillis);
    expect(body.timestamps).toBeLessThan(fiveSecondsLater);
  });
});
