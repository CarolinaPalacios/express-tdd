module.exports = {
  EmailException: class EmailException {
    constructor() {
      this.status = 502;
      this.message = 'email_failure';
    }
  },
};
