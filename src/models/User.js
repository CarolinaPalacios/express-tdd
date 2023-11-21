const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Token = require('./Token');
const Hoax = require('./Hoax');

class User extends Model {}

User.init(
  {
    username: {
      type: DataTypes.STRING,
    },
    email: {
      type: DataTypes.STRING,
    },
    password: {
      type: DataTypes.STRING,
    },
    inactive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    activationToken: {
      type: DataTypes.STRING,
    },
    passwordResetToken: {
      type: DataTypes.STRING,
    },
    image: {
      type: DataTypes.STRING,
    },
  },
  {
    sequelize,
    modelName: 'user',
  }
);

User.hasMany(Token, { onDelete: 'cascade', foreignKey: 'userId' });
User.hasMany(Hoax, { onDelete: 'cascade', foreignKey: 'userId' });

Hoax.belongsTo(User);

module.exports = User;
