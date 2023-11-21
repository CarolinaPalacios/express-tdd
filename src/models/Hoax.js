const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const FileAttachment = require('./FileAttachment');

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

module.exports = Hoax;
