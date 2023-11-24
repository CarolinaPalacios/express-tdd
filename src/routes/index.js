import { Router } from 'express';
import userRouter from './userRouter.js';
import authRouter from './authRouter.js';
import fileRouter from './fileRouter.js';
import hoaxRouter from './hoaxRouter.js';

const router = Router();

router.use('/auth', authRouter);
router.use('/users', userRouter);
router.use('/hoaxes/attachments', fileRouter);
router.use('/', hoaxRouter);

export default router;
