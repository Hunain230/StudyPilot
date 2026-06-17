import { Router } from 'express';
import { authGuard } from '../middleware/authGuard';
import { getProfile, updateProfile } from '../controllers/profile.controller';

const router = Router();

router.use(authGuard);

router.get('/profile', getProfile);
router.put('/profile', updateProfile);

export default router;
