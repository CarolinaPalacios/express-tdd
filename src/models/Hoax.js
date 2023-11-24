import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import FileAttachment from './FileAttachment.js';

class Hoax extends Model {}

Hoax.init(
  {
    content: {
      type: DataTypes.TEXT,
    },
    timestamp: {
      type: DataTypes.BIGINT,
    },
  },
  {
    sequelize,
    modelName: 'hoax',
    timestamps: false,
  }
);

Hoax.hasOne(FileAttachment, { foreignKey: 'hoaxId', onDelete: 'cascade' });
FileAttachment.belongsTo(Hoax);

export default Hoax;
