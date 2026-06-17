import { Router } from 'express';
import { authGuard } from '../middleware/authGuard';
import { ApiResponse } from '../utils/response';

const router = Router();
router.use(authGuard);

router.get('/:guideId/flashcards', (req, res) => {
  res.json(ApiResponse.success([], 'Stub: Get flashcards (Phase 4)'));
});

router.patch('/:id/review', (req, res) => {
  res.json(ApiResponse.success(null, 'Stub: Mark reviewed (Phase 4)'));
});

export default router;
