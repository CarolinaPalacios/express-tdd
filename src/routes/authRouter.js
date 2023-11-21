const bcrypt = require('bcrypt');
const { check, validationResult } = require('express-validator');

const authRouter = require('express').Router();
const userService = require('../service/userService');
const tokenService = require('../service/tokenService');

const { AuthenticationException } = require('../error/AuthenticationException');
const { ForbiddenException } = require('../error/ForbiddenException');

authRouter.post('/', check('email').isEmail(), async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AuthenticationException());
  }

  const { email, password } = req.body;
  const user = await userService.findByEmail(email);
  if (!user) {
    return next(new AuthenticationException());
  }
  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) {
    return next(new AuthenticationException());
  }
  if (user.inactive) {
    return next(new ForbiddenException());
  }

  const token = await tokenService.createToken(user);
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
    await tokenService.deleteToken(token);
  }
  return res.send();
});

module.exports = authRouter;
