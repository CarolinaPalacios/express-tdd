module.exports = {
  AuthenticationException: class AuthenticationException {
    constructor(message) {
      this.status = 401;
      this.message = message || 'authentication_failure';
    }
  },
};
