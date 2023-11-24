export class InvalidTokenException {
  constructor() {
    this.status = 401;
    this.message = 'account_activation_failure';
  }
}
