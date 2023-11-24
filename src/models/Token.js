import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

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

export default Token;
