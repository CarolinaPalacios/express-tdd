const { ForbiddenException } = require('../error/ForbiddenException');
const userService = require('../service/userService');

const passwordResetTokenValidator = async (req, res, next) => {
  const user = await userService.findByPasswordResetToken(
    req.body.passwordResetToken
  );
  if (!user) {
    return next(new ForbiddenException('unauthorized_password_reset'));
  }
  next();
};
module.exports = { passwordResetTokenValidator };
