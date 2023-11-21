const { check, validationResult } = require('express-validator');
const hoaxRouter = require('express').Router();
const hoaxService = require('../service/hoaxService');
const { pagination } = require('../middlewares/pagination');
const { AuthenticationException } = require('../error/AuthenticationException');
const { ForbiddenException } = require('../error/ForbiddenException');
const { ValidationException } = require('../error/ValidationException');

hoaxRouter.post(
  '/hoaxes',
  check('content')
    .isLength({ min: 10, max: 5000 })
    .withMessage('hoax_content_size'),
  async (req, res, next) => {
    if (!req.authenticatedUser) {
      return next(new AuthenticationException('unauthorized_hoax_submit'));
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ValidationException(errors.array()));
    }

    await hoaxService.saveHoax(req.body, req.authenticatedUser);
    return res.json({ message: req.t('hoax_submit_success') });
  }
);

hoaxRouter.get(
  ['/hoaxes', 'users/:userId/hoaxes'],
  pagination,
  async (req, res, next) => {
    const { page, size, nextPage, prevPage } = req.pagination;
    try {
      const hoaxes = await hoaxService.getHoaxes(
        page,
        size,
        nextPage,
        prevPage,
        req.params.userId
      );
      return res.json(hoaxes);
    } catch (error) {
      next(error);
    }
  }
);

hoaxRouter.delete('/hoaxes/:id', async (req, res, next) => {
  if (!req.authenticatedUser) {
    return next(new ForbiddenException('unauthorized_hoax_delete'));
  }
  try {
    await hoaxService.deleteHoax(req.params.id, req.authenticatedUser.id);
    return res.send();
  } catch (error) {
    return next(error);
  }
});

module.exports = hoaxRouter;
