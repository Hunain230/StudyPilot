import express from 'express';
import cors from 'cors';
import { ENV } from './config/env';
import { errorHandler } from './middleware/errorHandler';

import authRoutes  from './routes/auth.routes';
import guideRoutes from './routes/guide.routes';
import uploadRoutes from './routes/upload.routes';
import userRoutes from './routes/user.routes';
import flashcardRoutes from './routes/flashcard.routes';
import quizRoutes from './routes/quiz.routes';
import studyplanRoutes from './routes/studyplan.routes';
import chatRoutes from './routes/chat.routes';
import v1Router from './routes/v1';

const app = express();

// ── Middleware ────────────────────────────────────
app.use(cors({ origin: ENV.FRONTEND_ORIGIN, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Static file serving for uploads ──────────────
app.use('/uploads', express.static(ENV.UPLOAD_DIR));

// ── Routes ───────────────────────────────────────
app.use('/api/auth',    authRoutes);
app.use('/api/guides',  guideRoutes);
app.use('/api/upload',  uploadRoutes);
app.use('/api/users',   userRoutes);
app.use('/api/flashcards', flashcardRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/study-plan', studyplanRoutes);
app.use('/api/chat',    chatRoutes);
app.use('/api/v1',      v1Router);

// ── Health Check ─────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Global Error Handler ─────────────────────────
app.use(errorHandler);

export default app;
