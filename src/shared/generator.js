const crypto = require('crypto');

const randomString = (length) => {
  return crypto
    .randomBytes(length)
    .toString('hex') // convert to hexadecimal format
    .slice(0, length); // return required number of characters
};

module.exports = { randomString };
