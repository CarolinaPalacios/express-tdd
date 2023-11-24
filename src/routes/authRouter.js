import { compare } from 'bcrypt';
import { check, validationResult } from 'express-validator';
import { Router } from 'express';
import { findByEmail } from '../service/userService.js';
import { createToken, deleteToken } from '../service/tokenService.js';
import { AuthenticationException } from '../error/AuthenticationException.js';
import { ForbiddenException } from '../error/ForbiddenException.js';

const authRouter = Router();

authRouter.post('/', check('email').isEmail(), async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AuthenticationException());
  }

  const { email, password } = req.body;
  const user = await findByEmail(email);
  if (!user) {
    return next(new AuthenticationException());
  }
  const validPassword = await compare(password, user.password);
  if (!validPassword) {
    return next(new AuthenticationException());
  }
  if (user.inactive) {
    return next(new ForbiddenException());
  }

  const token = await createToken(user);

  return res.json({
    id: user.id,
    username: user.username,
    image: user.image,
    token,
  });
});

authRouter.post('/logout', async (req, res) => {
  const { authorization } = req.headers;
  if (authorization) {
    const token = authorization.substring(7);
    await deleteToken(token);
  }
  return res.send();
});

export default authRouter;
