import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { ApiResponse } from '../utils/response';

// GET /api/v1/history
export async function getActivityLog(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.max(1, Number(req.query.limit || 20));
    const type = req.query.type as string | undefined;

    const whereClause: any = { userId };
    if (type) {
      whereClause.type = type;
    }

    const total = await prisma.activityLog.count({ where: whereClause });
    const totalPages = Math.ceil(total / limit);

    const logs = await prisma.activityLog.findMany({
      where: whereClause,
      orderBy: { occurredAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Fetch guides to map guide names
    const guideIds = Array.from(new Set(logs.map(l => l.guideId).filter(Boolean))) as string[];
    const guides = await prisma.guide.findMany({
      where: { id: { in: guideIds } },
      select: { id: true, title: true },
    });

    const events = logs.map(l => {
      const guide = guides.find(g => g.id === l.guideId);
      return {
        id: l.id,
        type: l.type,
        description: l.description,
        guideId: l.guideId,
        guideName: guide ? guide.title : null,
        meta: l.meta,
        occurredAt: l.occurredAt,
      };
    });

    return res.json({
      success: true,
      page,
      totalPages,
      total,
      events,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/history/sessions
export async function getStudySessions(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;

    const sessions = await prisma.studySession.findMany({
      where: { userId },
      orderBy: { startedAt: 'desc' },
      include: {
        guide: {
          select: {
            title: true,
          },
        },
      },
    });

    return res.json({
      success: true,
      sessions: sessions.map(s => ({
        id: s.id,
        guideId: s.guideId,
        guideTitle: s.guide?.title || null,
        durationMinutes: Math.round(s.durationSecs / 60),
        durationSecs: s.durationSecs,
        startedAt: s.startedAt,
        endedAt: s.endedAt,
        activityType: s.activityType,
      })),
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/history/quiz-attempts
export async function getHistoryQuizAttempts(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.max(1, Number(req.query.limit || 20));

    const total = await prisma.quizAttempt.count({ where: { userId } });
    const totalPages = Math.ceil(total / limit);

    const attempts = await prisma.quizAttempt.findMany({
      where: { userId },
      orderBy: { attemptedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        guide: {
          select: {
            title: true,
          },
        },
      },
    });

    return res.json({
      success: true,
      page,
      totalPages,
      total,
      attempts: attempts.map(a => ({
        id: a.id,
        quizId: a.quizId,
        guideTitle: a.guide?.title || 'Unknown Guide',
        score: Number(a.score),
        totalQuestions: a.totalQuestions,
        correct: a.correct,
        incorrect: a.incorrect,
        skipped: a.skipped,
        timeTakenSec: a.timeTakenSec,
        attemptedAt: a.attemptedAt,
      })),
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/history/flashcard-reviews
export async function getHistoryFlashcardReviews(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;

    const reviews = await prisma.flashcardReview.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        card: {
          select: {
            question: true,
            guide: {
              select: {
                title: true,
              },
            },
          },
        },
      },
    });

    return res.json({
      success: true,
      totalReviews: reviews.length,
      reviews: reviews.map(r => ({
        id: r.id,
        cardId: r.cardId,
        question: r.card.question,
        guideTitle: r.card.guide.title,
        easeFactor: Number(r.easeFactor),
        intervalDays: r.intervalDays,
        repetitions: r.repetitions,
        lastReviewedAt: r.lastReviewedAt,
        nextReviewAt: r.nextReviewAt,
      })),
    });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/v1/history/clear
export async function clearAllHistory(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const { confirm } = req.query;

    if (confirm !== 'true') {
      return res.status(400).json(ApiResponse.error('Confirmation is required to clear all history. Pass ?confirm=true in query.', 400));
    }

    // Delete in sequence to avoid conflicts (cascade relations are defined but let's be explicit and clean)
    await prisma.$transaction([
      prisma.activityLog.deleteMany({ where: { userId } }),
      prisma.studySession.deleteMany({ where: { userId } }),
      prisma.quizAttempt.deleteMany({ where: { userId } }),
      prisma.flashcardReview.deleteMany({ where: { userId } }),
      prisma.doubtSession.deleteMany({ where: { userId } }),
      prisma.plannerSession.deleteMany({ where: { userId } }),
      prisma.weakTopic.deleteMany({ where: { guide: { userId } } }),
    ]);

    return res.json({
      success: true,
      message: 'All study history, quiz attempts, flashcard reviews, planner sessions, and doubt logs have been cleared.',
    });
  } catch (err) {
    next(err);
  }
}
