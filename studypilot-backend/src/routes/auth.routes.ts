import { Router } from 'express';
import { signup, login, getMe } from '../controllers/auth.controller';
import { authGuard } from '../middleware/authGuard';

const router = Router();

router.post('/signup', signup);
router.post('/login', login);
router.get('/me', authGuard, getMe);

export default router;
