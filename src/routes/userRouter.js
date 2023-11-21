const { check, validationResult } = require('express-validator');
const { ValidationException } = require('../error/ValidationException');
const { ForbiddenException } = require('../error/ForbiddenException');
const userService = require('../service/userService');
const fileService = require('../service/fileService');
const { pagination } = require('../middlewares/pagination');
const { basicAuthentication } = require('../middlewares/basicAuthentication');
const {
  passwordResetTokenValidator,
} = require('../middlewares/passwordResetTokenValidator');
const userRouter = require('express').Router();

userRouter.get('/', pagination, async (req, res) => {
  const { page, size, nextPage, prevPage } = req.pagination;
  const authenticatedUser = req.authenticatedUser;
  const users = await userService.getAllUsers(
    page,
    size,
    nextPage,
    prevPage,
    authenticatedUser
  );
  return res.json(users);
});

userRouter.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await userService.getUser(id);
    return res.json(user);
  } catch (error) {
    next(error);
  }
});

userRouter.put(
  '/:id',
  check('username')
    .notEmpty()
    .withMessage('username_null')
    .bail()
    .isLength({ min: 4, max: 32 })
    .withMessage('username_size'),
  check('iamge').custom(async (imageAsBase64String) => {
    if (!imageAsBase64String) return true;
    const buffer = Buffer.from(imageAsBase64String, 'base64');
    if (!fileService.isLessThan2MB(buffer)) {
      throw new Error('profile_image_size');
    }
    const supportedType = await fileService.isSupportedFileType(buffer);
    if (!supportedType) throw new Error('unsupported_image_file_type');
    return true;
  }),
  async (req, res, next) => {
    const authenticatedUser = req.authenticatedUser;
    const { id } = req.params;

    if (!authenticatedUser || authenticatedUser.id !== Number(id)) {
      return next(new ForbiddenException('unauthroized_user_update'));
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationException(errors.array());
    }

    const user = await userService.updateUser(id, req.body);
    return res.json(user);
  }
);

userRouter.post(
  '/',
  check('username')
    .notEmpty()
    .withMessage('username_null')
    .bail()
    .isLength({ min: 4, max: 32 })
    .withMessage('username_size'),
  check('email')
    .notEmpty()
    .withMessage('email_null')
    .bail()
    .isEmail()
    .withMessage('email_invalid')
    .bail()
    .custom(async (email) => {
      const user = await userService.findByEmail(email);
      if (user) {
        throw new Error('email_inuse');
      }
    }),
  check('password')
    .notEmpty()
    .withMessage('password_null')
    .bail()
    .isLength({ min: 6 })
    .withMessage('password_size')
    .bail()
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/)
    .withMessage('password_pattern'),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ValidationException(errors.array()));
    }

    try {
      await userService.saveUser(req.body);
      return res.json({ message: req.t('user_create_success') });
    } catch (error) {
      next(error);
    }
  }
);

userRouter.post('/token/:token', async (req, res, next) => {
  const { token } = req.params;
  try {
    await userService.activateUser(token);
    return res.json({ message: req.t('account_activation_success') });
  } catch (error) {
    next(error);
  }
});

userRouter.delete('/:id', basicAuthentication, async (req, res, next) => {
  const authenticatedUser = req.authenticatedUser;
  const { id } = req.params;
  if (!authenticatedUser || authenticatedUser.id !== Number(id)) {
    return next(new ForbiddenException('unauthorized_user_delete'));
  }
  await userService.deleteUser(id);
  return res.json({ success: true, msg: 'User deleted' });
});

userRouter.post(
  '/password',
  check('email').isEmail().withMessage('email_invalid'),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ValidationException(errors.array()));
    }
    try {
      await userService.passwordResetRequest(req.body.email);
      return res.json({ message: req.t('password_reset_request_success') });
    } catch (error) {
      next(error);
    }
  }
);

userRouter.put(
  '/password',
  passwordResetTokenValidator,
  check('password')
    .notEmpty()
    .withMessage('password_null')
    .bail()
    .isLength({ min: 6 })
    .withMessage('password_size')
    .bail()
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/)
    .withMessage('password_pattern'),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ValidationException(errors.array()));
    }
    await userService.updatePassword(req.body);
    return res.json({ message: 'Password updated' });
  }
);

module.exports = userRouter;
