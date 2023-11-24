import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

class FileAttachment extends Model {}

FileAttachment.init(
  {
    filename: {
      type: DataTypes.STRING,
    },
    uploadDate: {
      type: DataTypes.DATE,
    },
    fileType: {
      type: DataTypes.STRING,
    },
  },
  {
    sequelize,
    modelName: 'fileAttachment',
    timestamps: false,
  }
);

export default FileAttachment;
