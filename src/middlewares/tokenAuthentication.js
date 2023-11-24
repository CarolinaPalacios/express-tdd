import { verify } from '../service/tokenService.js';

export const tokenAuthentication = async (req, res, next) => {
  const { authorization } = req.headers;
  console.log(authorization);
  if (authorization) {
    const token = authorization.substring(6);
    try {
      const user = await verify(token);
      console.log(user);
      req.authenticatedUser = user;
    } catch (error) {
      console.error(error);
    }
  }
  next();
};
