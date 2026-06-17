import { Router } from 'express';
import { authGuard } from '../../middleware/authGuard';
import {
  exportGuideReport,
  exportQuizAttemptReport,
  exportAnalyticsReport,
} from '../../controllers/export.controller';

const router = Router();
router.use(authGuard);

router.get('/guide/:guideId', exportGuideReport);
router.get('/quiz/:attemptId', exportQuizAttemptReport);
router.get('/analytics', exportAnalyticsReport);

export default router;
