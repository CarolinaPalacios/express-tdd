import { ForbiddenException } from '../error/ForbiddenException.js';
import { findByPasswordResetToken } from '../service/userService.js';

export const passwordResetTokenValidator = async (req, res, next) => {
  const user = await findByPasswordResetToken(req.body.passwordResetToken);
  if (!user) {
    return next(new ForbiddenException('unauthorized_password_reset'));
  }
  next();
};
