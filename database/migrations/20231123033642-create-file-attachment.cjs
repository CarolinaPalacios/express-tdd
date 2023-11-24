'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('fileAttachments', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      filename: {
        type: Sequelize.STRING,
      },
      uploadData: {
        type: Sequelize.DATE,
      },
      fileType: {
        type: Sequelize.INTEGER,
      },
      hoaxId: {
        type: Sequelize.INTEGER,
        references: {
          model: 'hoaxes',
          key: 'id',
        },
      },
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('fileAttachments');
  },
};
