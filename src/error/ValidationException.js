module.exports = {
  ValidationException: class ValidationException {
    constructor(errors) {
      this.status = 400;
      this.message = 'validation_failure';
      this.errors = errors;
    }
  },
};
