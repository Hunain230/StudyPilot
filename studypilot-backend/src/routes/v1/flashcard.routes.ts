import { Router } from 'express';
import { authGuard } from '../../middleware/authGuard';
import {
  getFlashcardsByGuideId,
  getDueFlashcards,
  submitFlashcardReview,
  getFlashcardStats,
  resetFlashcardReviews,
} from '../../controllers/flashcard.controller';

const router = Router();
router.use(authGuard);

router.get('/due', getDueFlashcards);
router.get('/:guideId', getFlashcardsByGuideId);
router.post('/:cardId/review', submitFlashcardReview);
router.get('/:guideId/stats', getFlashcardStats);
router.post('/:guideId/reset', resetFlashcardReviews);

export default router;
