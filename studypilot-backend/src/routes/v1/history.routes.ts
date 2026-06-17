import { Router } from 'express';
import { authGuard } from '../../middleware/authGuard';
import {
  getActivityLog,
  getStudySessions,
  getHistoryQuizAttempts,
  getHistoryFlashcardReviews,
  clearAllHistory,
} from '../../controllers/history.controller';

const router = Router();
router.use(authGuard);

router.get('/', getActivityLog);
router.get('/sessions', getStudySessions);
router.get('/quiz-attempts', getHistoryQuizAttempts);
router.get('/flashcard-reviews', getHistoryFlashcardReviews);
router.delete('/clear', clearAllHistory);

export default router;
