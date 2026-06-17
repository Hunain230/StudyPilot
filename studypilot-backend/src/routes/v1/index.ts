import { Router } from 'express';
import flashcardRoutes from './flashcard.routes';
import quizRoutes from './quiz.routes';
import plannerRoutes from './planner.routes';
import analyticsRoutes from './analytics.routes';
import historyRoutes from './history.routes';
import resourcesRoutes from './resources.routes';
import doubtRoutes from './doubt.routes';
import exportRoutes from './export.routes';

const router = Router();

router.use('/flashcards', flashcardRoutes);
router.use('/quiz', quizRoutes);
router.use('/planner', plannerRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/history', historyRoutes);
router.use('/resources', resourcesRoutes);
router.use('/doubt', doubtRoutes);
router.use('/export', exportRoutes);

export default router;
