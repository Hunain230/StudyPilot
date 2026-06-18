import { Router } from 'express';
import { authGuard } from '../../middleware/authGuard';
import { groqRateLimiter } from '../../middleware/rateLimiter';
import { askTutor, getTutorHistory } from '../../controllers/tutor.controller';

const router = Router();

router.use(authGuard);
router.use(groqRateLimiter);

router.post('/ask', askTutor);
router.get('/history', getTutorHistory);

export default router;
