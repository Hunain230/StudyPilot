import { Router } from 'express';
import { authGuard } from '../middleware/authGuard';
import { ApiResponse } from '../utils/response';

const router = Router();
router.use(authGuard);

router.get('/:guideId/quiz', (req, res) => {
  res.json(ApiResponse.success(null, 'Stub: Get quiz (Phase 4)'));
});

router.post('/:guideId/quiz/submit', (req, res) => {
  res.json(ApiResponse.success({ score: 0 }, 'Stub: Submit answers (Phase 4)'));
});

export default router;
