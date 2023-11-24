import bcrypt from 'bcrypt';
import { findByEmail } from '../service/userService.js';
export const basicAuthentication = async (req, res, next) => {
  const { authorization } = req.headers;
  if (authorization && authorization.length > 6) {
    const encoded = authorization.substring(6);
    const decoded = Buffer.from(encoded, 'base64').toString('ascii');
    const [email, password] = decoded.split(':');
    const authenticatedUser = await findByEmail(email);
    if (authenticatedUser && !authenticatedUser.inactive) {
      const validPassword = await bcrypt.compare(
        password,
        authenticatedUser.password
      );
      if (validPassword) {
        req.authenticatedUser = authenticatedUser;
      }
    }
  }
  next();
};
