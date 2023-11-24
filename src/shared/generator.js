import { randomBytes } from 'crypto';

export const randomString = (length) => {
  return randomBytes(length)
    .toString('hex') // convert to hexadecimal format
    .slice(0, length); // return required number of characters
};
