import { Router } from 'express';
import { authGuard } from '../middleware/authGuard';
import {
  createGuide,
  getGuides,
  getGuideById,
  updateGuide,
  deleteGuide,
} from '../controllers/guide.controller';

const router = Router();

// All guide routes are protected
router.use(authGuard);

router.get('/', getGuides);
router.post('/', createGuide);
router.get('/:id', getGuideById);
router.put('/:id', updateGuide);
router.delete('/:id', deleteGuide);

export default router;
