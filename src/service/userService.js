import bcrypt from 'bcrypt';
import { Op } from 'sequelize';
import sequelize from '../config/database.js';
import User from '../models/User.js';
import { randomString } from '../shared/generator.js';
import { clearTokens } from '../service/tokenService.js';
import {
  deleteProfileImage,
  deleteUserFiles,
  saveProfileImage,
} from './fileService.js';
import {
  sendAccountActivation,
  sendPasswordReset,
} from '../service/emailService.js';
import { NotFoundException } from '../error/NotFoundException.js';
import { EmailException } from '../error/EmailException.js';
import { InvalidTokenException } from '../error/InvalidTokenException.js';

export const saveUser = async (body) => {
  const { username, email, password } = body;

  const hash = await bcrypt.hash(password, 10);

  const user = {
    // ...body, //* with spread operator
    username,
    email,
    password: hash,
    activationToken: randomString(16),
  };

  const transaction = await sequelize.transaction();
  await User.create(user, { transaction });

  try {
    await sendAccountActivation(email, user.activationToken);
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw new EmailException();
  }

  // const user = Object.assign({}, req.body, { password: hash }); //* with Object.assign

  // const user = { //* normal object
  //   username: req.body.username,
  //   email: req.body.email,
  //   password: hash,
  // };
};

export const activateUser = async (token) => {
  const user = await User.findOne({ where: { activationToken: token } });
  if (!user) throw new InvalidTokenException();
  user.update({
    activationToken: null,
    inactive: false,
  });
};

export const getAllUsers = async (
  page,
  size,
  nextPage,
  prevPage,
  authenticatedUser
) => {
  const usersWithCount = await User.findAndCountAll({
    where: {
      inactive: false,
      id: {
        [Op.not]: authenticatedUser ? authenticatedUser.id : 0,
      },
    },
    attributes: ['id', 'username', 'email', 'image'],
    limit: size,
    offset: page * size,
  });
  return {
    content: usersWithCount.rows,
    totalPages: Math.ceil(usersWithCount.count / size),
    nextPage,
    prevPage,
  };
};

export const getUser = async (id) => {
  const user = await User.findByPk(id, {
    where: {
      inactive: false,
    },
    attributes: ['id', 'username', 'email', 'image'],
  });
  if (!user) throw new NotFoundException('user_not_found');
  return user;
};

export const findByEmail = async (email) => {
  return await User.findOne({ where: { email } });
};

export const updateUser = async (id, body) => {
  const user = await User.findByPk(id);
  console.log('user', user);
  user.username = body.username;
  if (body.image) {
    if (user.image) {
      await deleteProfileImage(user.image);
    }
    user.image = await saveProfileImage(body.image);
  }
  await user.save();
  console.log(user);
  return {
    id,
    username: user.username,
    email: user.email,
    image: user.image,
  };
};

export const deleteUser = async (id) => {
  const user = await User.findByPk(id);
  await deleteUserFiles(user);
  await user.destroy();
};

export const passwordResetRequest = async (email) => {
  const user = await findByEmail(email);
  if (!user) throw new NotFoundException('email_not_inuse');
  user.passwordResetToken = randomString(16);
  await user.save();
  try {
    await sendPasswordReset(email, user.passwordResetToken);
  } catch (error) {
    throw new EmailException();
  }
};

export const updatePassword = async (updateRequest) => {
  const user = await findByPasswordResetToken(updateRequest.passwordResetToken);
  const hash = await bcrypt.hash(updateRequest.password, 10);
  user.password = hash;
  user.passwordResetToken = null;
  user.inactive = false;
  user.activationToken = null;
  await user.save();
  await clearTokens(user.id);
};

export const findByPasswordResetToken = (token) => {
  return User.findOne({ where: { passwordResetToken: token } });
};
