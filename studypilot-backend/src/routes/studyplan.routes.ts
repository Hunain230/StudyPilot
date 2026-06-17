import { Router } from 'express';
import { authGuard } from '../middleware/authGuard';
import { ApiResponse } from '../utils/response';

const router = Router();
router.use(authGuard);

router.post('/:guideId/study-plan', (req, res) => {
  res.json(ApiResponse.success(null, 'Stub: Generate study plan (Phase 5)'));
});

router.get('/:guideId/study-plan', (req, res) => {
  res.json(ApiResponse.success(null, 'Stub: Get study plan (Phase 5)'));
});

router.patch('/:id', (req, res) => {
  res.json(ApiResponse.success(null, 'Stub: Update study plan (Phase 5)'));
});

export default router;
