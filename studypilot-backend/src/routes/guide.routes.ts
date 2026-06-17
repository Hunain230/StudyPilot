import { Router } from 'express';
import { authGuard } from '../middleware/authGuard';
import { pdfUpload } from '../middleware/upload';
import { groqRateLimiter } from '../middleware/rateLimiter';
import {
  createGuide,
  getGuides,
  getGuideById,
  updateGuide,
  deleteGuide,
  generateFromPDF,
  generateFromNotes,
  generateFromYouTube,
  getFlashcards,
  getQuizQuestions,
  getRevisionSheet,
} from '../controllers/guide.controller';

const router = Router();

// All guide routes require authGuard
router.use(authGuard);

// Standard CRUD (compatible with Phase 1)
router.get('/', getGuides);
router.post('/', createGuide);
router.get('/:id', getGuideById);
router.put('/:id', updateGuide);
router.delete('/:id', deleteGuide);

// Phase 2: AI Generation endpoints (rate-limited)
router.post('/generate/pdf', groqRateLimiter, pdfUpload.single('pdf'), generateFromPDF);
router.post('/generate/notes', groqRateLimiter, generateFromNotes);
router.post('/generate/youtube', groqRateLimiter, generateFromYouTube);

// Phase 2: Guide Sub-resource retrieval
router.get('/:id/flashcards', getFlashcards);
router.get('/:id/quiz', getQuizQuestions);
router.get('/:id/revision', getRevisionSheet);

export default router;
