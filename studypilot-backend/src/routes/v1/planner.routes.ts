import { Router } from 'express';
import { authGuard } from '../../middleware/authGuard';
import {
  getPlannerSessions,
  createPlannerSession,
  updatePlannerSession,
  deletePlannerSession,
  getUpcomingSessions,
  suggestPlannerSchedule,
} from '../../controllers/planner.controller';

const router = Router();
router.use(authGuard);

router.get('/', getPlannerSessions);
router.post('/', createPlannerSession);
router.get('/upcoming', getUpcomingSessions);
router.get('/suggest', suggestPlannerSchedule);
router.put('/:sessionId', updatePlannerSession);
router.delete('/:sessionId', deletePlannerSession);

export default router;
