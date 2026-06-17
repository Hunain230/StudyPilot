import { Router } from 'express';
import { authGuard } from '../../middleware/authGuard';
import {
  submitQuizAttempt,
  getQuizAttempts,
  getQuizAttemptDetails,
  getBestAttempt,
  getRecentAttempts,
} from '../../controllers/quiz.controller';

const router = Router();
router.use(authGuard);

router.get('/recent', getRecentAttempts);
router.get('/attempt/:attemptId', getQuizAttemptDetails);
router.post('/:quizId/attempt', submitQuizAttempt);
router.get('/:quizId/attempts', getQuizAttempts);
router.get('/:quizId/best', getBestAttempt);

export default router;
