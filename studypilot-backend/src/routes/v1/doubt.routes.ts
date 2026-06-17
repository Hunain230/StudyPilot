import { Router } from 'express';
import { authGuard } from '../../middleware/authGuard';
import {
  askDoubt,
  getDoubtHistory,
  reindexGuideContent,
} from '../../controllers/doubt.controller';

const router = Router();
router.use(authGuard);

router.post('/ask', askDoubt);
router.get('/history/:guideId', getDoubtHistory);
router.post('/index/:guideId', reindexGuideContent);

export default router;
