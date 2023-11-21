const bcrypt = require('bcrypt');
const userService = require('../service/userService');
const basicAuthentication = async (req, res, next) => {
  const { authorization } = req.headers;
  if (authorization.length > 6) {
    const encoded = authorization.substring(6);
    const decoded = Buffer.from(encoded, 'base64').toString('ascii');
    const [email, password] = decoded.split(':');
    const authenticatedUser = await userService.findByEmail(email);
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

module.exports = {
  basicAuthentication,
};
