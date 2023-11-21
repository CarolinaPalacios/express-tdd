const router = require('express').Router();
const userRouter = require('./userRouter');
const authRouter = require('./authRouter');
const fileRouter = require('./fileRouter');
const hoaxRouter = require('./hoaxRouter');

router.use('/auth', authRouter);
router.use('/users', userRouter);
router.use('/hoaxes/attachments', fileRouter);
router.use('/', hoaxRouter);

module.exports = router;
