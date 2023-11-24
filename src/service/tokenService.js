import { Op } from 'sequelize';
import { randomString } from '../shared/generator.js';
import Token from '../models/Token.js';

const ONE_WEEK_IN_MILLIS = 7 * 24 * 60 * 60 * 1000;

export const createToken = async (user) => {
  const token = randomString(32);
  await Token.create({
    token,
    userId: user.id,
    lastUsedAt: new Date(),
  });
  return token;
};

export const verify = async (token) => {
  const oneWeekAgo = new Date(Date.now() - ONE_WEEK_IN_MILLIS);
  const tokenInDB = await Token.findOne({
    where: {
      token,
      lastUsedAt: {
        [Op.gte]: oneWeekAgo,
      },
    },
  });
  await tokenInDB.update({
    lastUsedAt: new Date(),
  });
  const userId = tokenInDB.userId;
  return { id: userId };
};

export const deleteToken = async (token) => {
  await Token.destroy({
    where: {
      token,
    },
  });
};

export const scheduleCleanup = () => {
  setInterval(async () => {
    const oneWeekAgo = new Date(Date.now() - ONE_WEEK_IN_MILLIS);
    await Token.destroy({
      where: {
        lastUsedAt: {
          [Op.lt]: oneWeekAgo,
        },
      },
    });
  }, 60 * 60 * 1000);
};

export const clearTokens = async (userId) => {
  await Token.destroy({
    where: {
      userId,
    },
  });
};
