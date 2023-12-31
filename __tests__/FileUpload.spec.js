import request from 'supertest';
import path from 'path';
import fs from 'fs';
import app from '../src/app.js';
import FileAttachment from '../src/models/FileAttachment.js';
import en from '../locales/en/translation.json';
import es from '../locales/es/translation.json';
import { uploadDirConfigs, attachmentDirConfigs } from '../database/config.js';

const uploadDir = uploadDirConfigs.development;
const attachmentDir = attachmentDirConfigs.development;

beforeEach(async () => {
  await FileAttachment.destroy({ truncate: true });
});

const uploadFile = (file = 'test-png.png', options = {}) => {
  const agent = request(app).post('/api/1.0/hoaxes/attachments');
  if (options.language) {
    agent.set('Accept-Language', options.language);
  }
  return agent.attach('file', path.join('.', '__tests__', 'resources', file));
};

describe('Upload File for Hoax', () => {
  it('returns 200 OK after successful upload', async () => {
    const response = await uploadFile();
    expect(response.status).toBe(200);
  });

  it('saves dynamicFilename, uploadDate as attachment object in database', async () => {
    const beforeSubmit = Date.now();
    await uploadFile();
    const attachments = await FileAttachment.findAll();
    const attachment = attachments[0];
    expect(attachment.filename).not.toBe('test-png.png');
    expect(attachment.uploadDate.getTime()).not.toBeGreaterThan(beforeSubmit);
  });

  it('saves file to attachment folder', async () => {
    await uploadFile();
    const attachments = await FileAttachment.findAll();
    const attachment = attachments[0];
    const filePath = path.join(
      '.',
      uploadDir,
      attachmentDir,
      attachment.filename
    );
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it.each`
    file              | fileType
    ${'test-png.png'} | ${'image/png'}
    ${'test-png'}     | ${'image/png'}
    ${'test-gif.gif'} | ${'image/gif'}
    ${'test-jpg.jpg'} | ${'image/jpeg'}
    ${'test-pdf.pdf'} | ${'application/pdf'}
    ${'test-txt.txt'} | ${null}
  `(
    'saves fileType as $fileType in attachment object when $file is uploaded',
    async ({ fileType, file }) => {
      await uploadFile(file);
      const attachments = await FileAttachment.findAll();
      const attachment = attachments[0];
      expect(attachment.fileType).toBe(fileType);
    }
  );

  it.each`
    file              | fileExtension
    ${'test-png.png'} | ${'png'}
    ${'test-png'}     | ${'png'}
    ${'test-gif.gif'} | ${'gif'}
    ${'test-jpg.jpg'} | ${'jpg'}
    ${'test-pdf.pdf'} | ${'pdf'}
    ${'test-txt.txt'} | ${null}
  `(
    'saves filename with extension $fileExtension in attachment object and stored object when $file is uploaded',
    async ({ fileExtension, file }) => {
      await uploadFile(file);
      const attachments = await FileAttachment.findAll();
      const attachment = attachments[0];
      if (file === 'test-txt.txt') {
        expect(attachment.filename.endsWith('.txt')).toBe(false);
      } else {
        expect(attachment.filename.endsWith(fileExtension)).toBe(true);
      }
      const filePath = path.join(
        '.',
        uploadDir,
        attachmentDir,
        attachment.filename
      );
      expect(fs.existsSync(filePath)).toBe(true);
      // expect(attachment.filename.split('.').pop()).toBe(fileExtension);
    }
  );

  it('returns 400 when uploaded file size is bigger than 5mb', async () => {
    const fiveMB = 5 * 1024 * 1024;
    const filePath = path.join('.', '__tests__', 'resources', 'random-file');
    fs.writeFileSync(filePath, 'a'.repeat(fiveMB) + 'a');
    const response = await uploadFile('random-file');
    expect(response.status).toBe(400);
    fs.unlinkSync(filePath);
  });

  it('returns 200 OK when uploaded file is 5mb', async () => {
    const fiveMB = 5 * 1024 * 1024;
    const filePath = path.join('.', '__tests__', 'resources', 'random-file');
    fs.writeFileSync(filePath, 'a'.repeat(fiveMB));
    const response = await uploadFile('random-file');
    expect(response.status).toBe(200);
    fs.unlinkSync(filePath);
  });

  it.each`
    language | message
    ${'es'}  | ${es.attachment_size_limit}
    ${'en'}  | ${en.attachment_size_limit}
  `(
    'returns $message when attachment size is bigger than 5mb',
    async ({ language, message }) => {
      const fiveMB = 5 * 1024 * 1024;
      const filePath = path.join('.', '__tests__', 'resources', 'random-file');
      fs.writeFileSync(filePath, 'a'.repeat(fiveMB) + 'a');
      const nowInMillis = Date.now();
      const response = await uploadFile('random-file', { language });
      const error = response.body;
      expect(error.path).toBe('/api/1.0/hoaxes/attachments');
      expect(error.timestamp).toBeGreaterThan(nowInMillis);
      expect(error.message).toBe(message);
      fs.unlinkSync(filePath);
    }
  );

  it('returns attachment id in response', async () => {
    const response = await uploadFile();
    expect(Object.keys(response.body)).toEqual(['id']);
  });
});
