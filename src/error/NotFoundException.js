export class NotFoundException {
  constructor(message) {
    this.status = 404;
    this.message = message;
  }
}
