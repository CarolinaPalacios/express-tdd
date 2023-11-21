const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

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

module.exports = FileAttachment;
