import { fileTypeFromBuffer } from 'file-type';
import { Op } from 'sequelize';
import fs from 'fs';
import path from 'path';
import {
  uploadDirConfigs,
  profileDirConfigs,
  attachmentDirConfigs,
} from '../../database/config.js';
import { randomString } from '../shared/generator.js';
import FileAttachment from '../models/FileAttachment.js';
import Hoax from '../models/Hoax.js';

const activeProfile = 'development';

const uploadDir = uploadDirConfigs[activeProfile];
const profileDir = profileDirConfigs[activeProfile];
const attachmentDir = attachmentDirConfigs[activeProfile];

const profileFolder = path.join('.', uploadDir, profileDir);
const attachmentFolder = path.join('.', uploadDir, attachmentDir);

export const createFolders = () => {
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
  if (!fs.existsSync(profileFolder)) fs.mkdirSync(profileFolder);
  if (!fs.existsSync(attachmentFolder)) fs.mkdirSync(attachmentFolder);
};

export const saveProfileImage = async (base64File) => {
  const filename = randomString(32);
  const filePath = path.join(profileFolder, filename);
  await fs.promises.writeFile(filePath, base64File, 'base64');
  return filename;
};

export const deleteProfileImage = async (filename) => {
  const filePath = path.join(profileFolder, filename);
  await fs.promises.unlink(filePath);
};

export const isLessThan2MB = (buffer) => {
  return buffer.length < 2 * 1024 * 1024;
};

export const isSupportedFileType = async (buffer) => {
  const type = await fileTypeFromBuffer(buffer);
  return !type
    ? false
    : type.mime === 'image/png' || type.mime === 'image/jpeg';
};

export const saveAttachment = async (file) => {
  const type = await fileTypeFromBuffer(file.buffer);
  let fileType;
  let filename = randomString(32);
  if (type) {
    fileType = type.mime;
    filename += `.${type.ext}`;
  }
  await fs.promises.writeFile(
    path.join(attachmentFolder, filename),
    file.buffer
  );
  const savedAttachment = await FileAttachment.create({
    filename,
    fileType,
    uploadDate: new Date(),
  });
  return {
    id: savedAttachment.id,
  };
};

export const associateFileToHoax = async (attachmentId, hoaxId) => {
  const attachment = await FileAttachment.findByPk(attachmentId);
  if (!attachment) return;
  if (attachment.hoaxId) return;
  await attachment.update({ hoaxId });
};

export const removeUnusedAttachments = async () => {
  const ONE_DAY = 24 * 60 * 60 * 1000;
  setInterval(async () => {
    const oneDayOld = new Date(Date.now() - ONE_DAY);
    const attachments = await FileAttachment.findAll({
      where: {
        uploadDate: {
          [Op.lt]: oneDayOld,
        },
        hoaxId: {
          [Op.is]: null,
        },
      },
    });
    for (const attachment of attachments) {
      const { filename } = attachment.get({ plain: true });
      await fs.promises.unlink(path.join(attachmentFolder, filename));
      await attachment.destroy();
    }
  }, ONE_DAY);
};

export const deleteAttachment = async (filename) => {
  const filePath = path.join(attachmentFolder, filename);
  try {
    await fs.promises.access(filePath);
    await fs.promises.unlink(filePath);
  } catch (error) {
    console.error(error);
  }
};

export const deleteUserFiles = async (user) => {
  if (user.image) await deleteProfileImage(user.image);
  const attachments = await FileAttachment.findAll({
    attributes: ['filename'],
    include: {
      model: Hoax,
      where: {
        userId: user.id,
      },
    },
  });
  if (attachments.length === 0) return;
  for (const attachment of attachments) {
    await deleteAttachment(attachment.getDataValue('filename'));
  }
};
