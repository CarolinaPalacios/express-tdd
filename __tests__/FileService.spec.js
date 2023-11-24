import { jest } from '@jest/globals';
import path from 'path';
import fs from 'fs';

import {
  createFolders,
  removeUnusedAttachments,
} from '../src/service/fileService.js';
import User from '../src/models/User.js';
import FileAttachment from '../src/models/FileAttachment.js';
import Hoax from '../src/models/Hoax.js';
import {
  uploadDirConfigs,
  attachmentDirConfigs,
  profileDirConfigs,
} from '../database/config.js';

const uploadDir = uploadDirConfigs.development;
const attachmentDir = attachmentDirConfigs.development;
const profileDir = profileDirConfigs.development;

const profileFolder = path.join('.', uploadDir, profileDir);
const attachmentFolder = path.join('.', uploadDir, attachmentDir);

describe('createFolders', () => {
  it('creates upload folder', () => {
    createFolders();
    expect(fs.existsSync(uploadDir)).toBe(true);
  });

  it('creates profile folder under upload folder', () => {
    createFolders();
    expect(fs.existsSync(profileFolder)).toBe(true);
  });

  it('creates attachment folder under upload folder', () => {
    createFolders();
    expect(fs.existsSync(attachmentFolder)).toBe(true);
  });
});

describe('Scheduled unused file clean up', () => {
  const filename = `test-file-${Date.now()}`;
  const testFile = path.join('.', '__tests__', 'resources', 'test-png.png');
  const targetPath = path.join(attachmentFolder, filename);

  beforeEach(async () => {
    await FileAttachment.destroy({ truncate: true });
    await User.destroy({ truncate: { cascade: true } });
    if (fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath);
    }
  });

  const addHoax = async () => {
    const user = await User.create({
      username: 'user1',
      email: 'user1@user1.com',
      password: 'P4ssword',
    });
    const hoax = await Hoax.create({
      content: 'Hoax content 1',
      timestamps: Date.now(),
      userId: user.id,
    });
    return hoax.id;
  };

  it('removes the 24 hours old file with attachment entry if not used in hoax', async (done) => {
    jest.useFakeTimers();

    fs.copyFileSync(testFile, targetPath);
    const uploadDate = new Date(Date.now() - 24 * 60 * 60 * 1000 - 1);
    const attachment = await FileAttachment.create({
      filename,
      uploadDate,
    });
    await removeUnusedAttachments();
    jest.advanceTimersByTime(24 * 60 * 60 * 1000 + 5000);
    jest.useRealTimers();
    setTimeout(async () => {
      const attachmentAfterRemove = await FileAttachment.findByPk(
        attachment.id
      );
      expect(attachmentAfterRemove).toBeNull();
      expect(fs.existsSync(targetPath)).toBe(false);
      done();
    }, 1000);
  });

  it('keeps the files younger than 24 hours and their database entry even not associated with hoax', async (done) => {
    jest.useFakeTimers();
    fs.copyFileSync(testFile, targetPath);
    const uploadDate = new Date(Date.now() - 23 * 60 * 60 * 1000);
    const attachment = await FileAttachment.create({
      filename,
      uploadDate,
    });
    await removeUnusedAttachments();
    jest.advanceTimersByTime(24 * 60 * 60 * 1000 + 5000);
    jest.useRealTimers();
    setTimeout(async () => {
      const attachmentAfterRemove = await FileAttachment.findByPk(
        attachment.id
      );
      expect(attachmentAfterRemove).not.toBeNull();
      expect(fs.existsSync(targetPath)).toBe(true);
      done();
    }, 1000);
  });

  it('keeps the files older than 24 hours and their database entry if associated with hoax', async (done) => {
    jest.useFakeTimers();
    fs.copyFileSync(testFile, targetPath);
    const id = await addHoax();
    const uploadDate = new Date(Date.now() - 25 * 60 * 60 * 1000);
    const attachment = await FileAttachment.create({
      filename,
      uploadDate,
      hoaxId: id,
    });
    await removeUnusedAttachments();
    jest.advanceTimersByTime(24 * 60 * 60 * 1000 + 5000);
    jest.useRealTimers();
    setTimeout(async () => {
      const attachmentAfterRemove = await FileAttachment.findByPk(
        attachment.id
      );
      expect(attachmentAfterRemove).not.toBeNull();
      expect(fs.existsSync(targetPath)).toBe(true);
      done();
    }, 1000);
  });
});