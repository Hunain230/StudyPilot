import { Router } from 'express';
import { authGuard } from '../../middleware/authGuard';
import {
  getOverviewStats,
  getQuizTrend,
  getTopicHeatmap,
  getWeakTopics,
  getActivityCalendar,
  getProjectedScore,
  getGuideSummary,
} from '../../controllers/analytics.controller';

const router = Router();
router.use(authGuard);

router.get('/overview', getOverviewStats);
router.get('/quiz-trend', getQuizTrend);
router.get('/topic-heatmap', getTopicHeatmap);
router.get('/weak-topics', getWeakTopics);
router.get('/activity-calendar', getActivityCalendar);
router.get('/predict', getProjectedScore);
router.get('/guide-summary/:guideId', getGuideSummary);

export default router;
