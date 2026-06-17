import { Router } from 'express';
import { authGuard } from '../middleware/authGuard';
import { upload } from '../services/upload.service';
import { uploadFile, getFiles } from '../controllers/upload.controller';

const router = Router();

// All upload routes are protected
router.use(authGuard);

router.post('/', upload.single('file'), uploadFile);
router.get('/', getFiles);

export default router;
