const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

class Token extends Model {}

Token.init(
  {
    token: {
      type: DataTypes.STRING,
    },
    lastUsedAt: {
      type: DataTypes.DATE,
    },
  },
  {
    sequelize,
    modelName: 'token',
    timestamps: false,
  }
);

module.exports = Token;
