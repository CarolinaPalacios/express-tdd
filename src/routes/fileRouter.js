import multer from 'multer';
import { Router } from 'express';
import { saveAttachment } from '../service/fileService.js';
import { FileSizeException } from '../error/FileSizeException.js';

const fileRouter = Router();

const FIVE_MB = 5 * 1024 * 1024;

const upload = multer({ limits: { fileSize: FIVE_MB } }).single('file');

fileRouter.post('/', (req, res, next) => {
  upload(req, res, async (err) => {
    if (err) return next(new FileSizeException());
    const attachment = await saveAttachment(req.file);
    return res.json({ attachment });
  });
});

export default fileRouter;
