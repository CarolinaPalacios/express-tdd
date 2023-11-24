import request from 'supertest';
import path from 'path';
import fs from 'fs';

import app from '../src/app.js';

import {
  uploadDirConfigs,
  profileDirConfigs,
  attachmentDirConfigs,
} from '../database/config.js';

const uploadDir = uploadDirConfigs.development;
const profileDir = profileDirConfigs.development;
const attachmentDir = attachmentDirConfigs.development;

const profileFolder = path.join('.', uploadDir, profileDir);
const attachmentFolder = path.join('.', uploadDir, attachmentDir);

describe('Profile Images', () => {
  const copyFile = () => {
    const filePath = path.join('.', '__tests__', 'resources', 'test-png.png');
    const storedFileName = 'test-file';
    const targetPath = path.join(profileFolder, storedFileName);
    fs.copyFileSync(filePath, targetPath);
    return storedFileName;
  };

  it('returns 404 when file not found', async () => {
    const response = await request(app).get('/images/123456');
    expect(response.status).toBe(404);
  });

  it('returns 200 OK when file exists', async () => {
    const storedFileName = copyFile();
    const response = await request(app).get(`/images/${storedFileName}`);
    expect(response.status).toBe(200);
  });

  it('returns cache for 1 year in response', async () => {
    const storedFileName = copyFile();
    const response = await request(app).get(`/images/${storedFileName}`);
    const oneYearInSeconds = 365 * 24 * 60 * 60;
    expect(response.header['cache-control']).toContain(
      `max-age=${oneYearInSeconds}`
    );
  });
});

describe('Attachments', () => {
  const copyFile = () => {
    const filePath = path.join('.', '__tests__', 'resources', 'test-png.png');
    const storedFileName = 'test-attachment-file';
    const targetPath = path.join(attachmentFolder, storedFileName);
    fs.copyFileSync(filePath, targetPath);
    return storedFileName;
  };

  it('returns 404 when file not found', async () => {
    const response = await request(app).get('/attachments/123456');
    expect(response.status).toBe(404);
  });

  it('returns 200 OK when file exists', async () => {
    const storedFileName = copyFile();
    const response = await request(app).get(`/attachments/${storedFileName}`);
    expect(response.status).toBe(200);
  });

  it('returns cache for 1 year in response', async () => {
    const storedFileName = copyFile();
    const response = await request(app).get(`/attachments/${storedFileName}`);
    const oneYearInSeconds = 365 * 24 * 60 * 60;
    expect(response.header['cache-control']).toContain(
      `max-age=${oneYearInSeconds}`
    );
  });
});
