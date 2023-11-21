const tokenService = require('../service/tokenService');

const tokenAuthentication = async (req, res, next) => {
  const { authorization } = req.headers;
  if (authorization) {
    const token = authorization.substring(7);
    try {
      const user = await tokenService.verify(token);
      req.authenticatedUser = user;
    } catch (error) {
      console.error(error);
    }
  }
  next();
};

module.exports = { tokenAuthentication };
