import { Router } from 'express';
import { authGuard } from '../middleware/authGuard';
import { ApiResponse } from '../utils/response';

const router = Router();
router.use(authGuard);

router.post('/', (req, res) => {
  res.json(ApiResponse.success({ role: 'assistant', content: 'Stub: AI answer (Phase 6)' }, 'Stub: Send message'));
});

router.get('/', (req, res) => {
  res.json(ApiResponse.success([], 'Stub: Get chat history (Phase 6)'));
});

export default router;
