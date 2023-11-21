const Hoax = require('../models/Hoax');
const User = require('../models/User');
const FileAttachment = require('../models/FileAttachment');
const fileService = require('./fileService');
const { NotFoundException } = require('../error/NotFoundException');
const { ForbiddenException } = require('../error/ForbiddenException');

const saveHoax = async (body, user) => {
  const hoax = {
    content: body.content,
    timestamps: Date.now(),
    userId: user.id,
  };
  const { id } = await Hoax.create(hoax);
  if (body.fileAttachment) {
    await fileService.associateFileToHoax(body.fileAttachment, id);
  }
};

const getHoaxes = async (page, size, nextPage, prevPage, userId) => {
  let where = {};
  if (userId) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new NotFoundException('user_not_found');
    }
    where = { id: userId };
  }
  const hoaxesWithCount = await Hoax.findAndCountAll({
    attributes: ['id', 'content', 'timestamps'],
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'email', 'image'],
        where,
      },
      {
        model: FileAttachment,
        as: 'fileAttachment',
        attributes: ['filename', 'fileType'],
      },
    ],
    order: [['id', 'DESC']],
    limit: size,
    offset: page * size,
  });
  return {
    content: hoaxesWithCount.rows.map((hoaxSequelize) => {
      const hoaxAsJSON = hoaxSequelize.get({ plain: true });
      if (!hoaxAsJSON.fileAttachment) {
        delete hoaxAsJSON.fileAttachment;
      }
      return hoaxAsJSON;
    }),
    page,
    size,
    totalPages: Math.ceil(hoaxesWithCount.count / size),
    nextPage,
    prevPage,
  };
};

const deleteHoax = async (hoaxId, userId) => {
  const hoaxToBeDeleted = await Hoax.findOne({
    where: { id: hoaxId, userId },
    include: { model: FileAttachment },
  });
  if (!hoaxToBeDeleted) {
    throw new ForbiddenException('unauthorized_hoax_delete');
  }
  const hoaxJSON = hoaxToBeDeleted.get({ plain: true });
  if (hoaxJSON.fileAttachment !== null) {
    await fileService.deleteAttachment(hoaxJSON.fileAttachment.filename);
  }
  await hoaxToBeDeleted.destroy();
};

module.exports = {
  saveHoax,
  getHoaxes,
  deleteHoax,
};
