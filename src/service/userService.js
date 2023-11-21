const bcrypt = require('bcrypt');
const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const User = require('../models/User');
const { randomString } = require('../shared/generator');
const tokenService = require('../service/tokenService');
const fileService = require('../service/fileService');
const emailService = require('../service/emailService');
const { NotFoundException } = require('../error/NotFoundException');
const { EmailException } = require('../error/EmailException');
const { InvalidTokenException } = require('../error/InvalidTokenException');

const saveUser = async (body) => {
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
    await emailService.sendAccountActivation(email, user.activationToken);
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

const activateUser = async (token) => {
  const user = await User.findOne({ where: { activationToken: token } });
  if (!user) throw new InvalidTokenException();
  user.update({
    activationToken: null,
    inactive: false,
  });
};

const getAllUsers = async (
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
        [Sequelize.Op.not]: authenticatedUser ? authenticatedUser.id : 0,
      },
    },
    attributes: ['id', 'username', 'email'],
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

const getUser = async (id) => {
  const user = await User.findByPk(id, {
    where: {
      inactive: false,
    },
    attributes: ['id', 'username', 'email'],
  });
  if (!user) throw new NotFoundException('user_not_found');
  return user;
};

const findByEmail = async (email) => {
  return await User.findOne({ where: { email } });
};

const updateUser = async (id, body) => {
  const user = await User.findByPk(id);
  user.username = body.username;
  if (body.image) {
    if (user.image) {
      await fileService.deleteProfileImage(user.image);
    }
    user.image = await fileService.saveProfileImage(body.image);
  }
  await user.save();

  return {
    id,
    username: user.username,
    email: user.email,
    image: user.image,
  };
};

const deleteUser = async (id) => {
  const user = await User.findByPk(id);
  await fileService.deleteUserFiles(user);
  await user.destroy();
};

const passwordResetRequest = async (email) => {
  const user = await findByEmail(email);
  if (!user) throw new NotFoundException('email_not_inuse');
  user.passwordResetToken = randomString(16);
  await user.save();
  try {
    await emailService.sendPasswordReset(email, user.passwordResetToken);
  } catch (error) {
    throw new EmailException();
  }
};

const updatePassword = async (updateRequest) => {
  const user = await findByPasswordResetToken(updateRequest.passwordResetToken);
  const hash = await bcrypt.hash(updateRequest.password, 10);
  user.password = hash;
  user.passwordResetToken = null;
  user.inactive = false;
  user.activationToken = null;
  await user.save();
  await tokenService.clearTokens(user.id);
};

const findByPasswordResetToken = (token) => {
  return User.findOne({ where: { passwordResetToken: token } });
};

module.exports = {
  saveUser,
  getAllUsers,
  getUser,
  updateUser,
  deleteUser,
  findByEmail,
  activateUser,
  passwordResetRequest,
  updatePassword,
  findByPasswordResetToken,
};
