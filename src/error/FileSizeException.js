module.exports = {
  FileSizeException: class FileSizeException {
    constructor() {
      this.status = 413;
      this.message = 'attachment_size_limit';
    }
  },
};
