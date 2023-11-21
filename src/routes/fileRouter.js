const multer = require('multer');
const fileRouter = require('express').Router();
const fileService = require('../service/fileService');
const FileSizeException = require('../error/FileSizeException');

const FIVE_MB = 5 * 1024 * 1024;

const upload = multer({ limits: { fileSize: FIVE_MB } }).single('file');

fileRouter.post('/', (req, res, next) => {
  upload(req, res, async (err) => {
    if (err) return next(new FileSizeException());
    const attachment = await fileService.saveAttachment(req.file);
    return res.json({ attachment });
  });
});

module.exports = fileRouter;
