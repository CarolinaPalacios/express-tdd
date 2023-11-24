import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import Token from './Token.js';
import Hoax from './Hoax.js';

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

export default User;
