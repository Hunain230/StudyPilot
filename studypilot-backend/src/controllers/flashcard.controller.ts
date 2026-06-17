import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { ApiResponse } from '../utils/response';
import { sm2Update } from '../services/sm2.service';
import { reviewSchema } from '../validators/phase3.validator';

// GET /api/v1/flashcards/:guideId
export async function getFlashcardsByGuideId(req: Request, res: Response, next: NextFunction) {
  try {
    const { guideId } = req.params;
    const userId = req.user!.userId;

    const cards = await prisma.flashcard.findMany({
      where: { guideId },
      orderBy: { orderIndex: 'asc' },
    });

    const reviews = await prisma.flashcardReview.findMany({
      where: { userId, card: { guideId } },
    });

    const mappedCards = cards.map(card => {
      const review = reviews.find(r => r.cardId === card.id);
      return {
        id: card.id,
        front: card.question,
        back: card.answer,
        difficulty: card.difficulty,
        sm2: {
          easeFactor: review ? Number(review.easeFactor) : 2.50,
          interval: review ? review.intervalDays : 1,
          repetitions: review ? review.repetitions : 0,
          nextReviewAt: review ? review.nextReviewAt : new Date(),
          isDue: review ? new Date(review.nextReviewAt) <= new Date() : true,
        },
      };
    });

    return res.json({
      success: true,
      guideId,
      total: cards.length,
      cards: mappedCards,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/flashcards/due
export async function getDueFlashcards(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const now = new Date();

    const dueReviews = await prisma.flashcardReview.findMany({
      where: {
        userId,
        nextReviewAt: { lte: now },
      },
      include: { card: true },
    });

    const mappedCards = dueReviews.map(r => ({
      id: r.card.id,
      front: r.card.question,
      back: r.card.answer,
      guideId: r.card.guideId,
      difficulty: r.card.difficulty,
      sm2: {
        easeFactor: Number(r.easeFactor),
        interval: r.intervalDays,
        repetitions: r.repetitions,
        nextReviewAt: r.nextReviewAt,
        isDue: true,
      },
    }));

    return res.json({
      success: true,
      dueCount: mappedCards.length,
      cards: mappedCards,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/flashcards/:cardId/review
export async function submitFlashcardReview(req: Request, res: Response, next: NextFunction) {
  try {
    const { cardId } = req.params;
    const userId = req.user!.userId;

    const validated = reviewSchema.parse(req.body);

    const card = await prisma.flashcard.findUnique({
      where: { id: cardId },
      include: { guide: true },
    });

    if (!card) {
      return res.status(404).json(ApiResponse.error('Flashcard not found.', 404));
    }

    // Get or initialize review state
    const existingReview = await prisma.flashcardReview.findUnique({
      where: { userId_cardId: { userId, cardId } },
    });

    const currentSM2State = {
      easeFactor: existingReview ? Number(existingReview.easeFactor) : 2.50,
      interval: existingReview ? existingReview.intervalDays : 1,
      repetitions: existingReview ? existingReview.repetitions : 0,
    };

    // Calculate new SM-2 scheduling
    const updated = sm2Update(currentSM2State, validated.quality);

    // Upsert review record
    const saved = await prisma.flashcardReview.upsert({
      where: { userId_cardId: { userId, cardId } },
      create: {
        userId,
        cardId,
        easeFactor: updated.easeFactor,
        intervalDays: updated.interval,
        repetitions: updated.repetitions,
        nextReviewAt: updated.nextReviewAt,
        lastReviewedAt: new Date(),
      },
      update: {
        easeFactor: updated.easeFactor,
        intervalDays: updated.interval,
        repetitions: updated.repetitions,
        nextReviewAt: updated.nextReviewAt,
        lastReviewedAt: new Date(),
      },
    });

    // Write activity log
    await prisma.activityLog.create({
      data: {
        userId,
        guideId: card.guideId,
        type: 'FLASHCARD_REVIEW',
        description: `Reviewed card on "${card.guide.title}" (Score: ${validated.quality}/5)`,
        meta: { cardId, quality: validated.quality },
      },
    });

    // Write to StudySession if not present
    await prisma.studySession.create({
      data: {
        userId,
        guideId: card.guideId,
        activityType: 'flashcards',
        durationSecs: 30, // average review time estimation
      },
    });

    return res.json({
      success: true,
      cardId,
      updated: {
        easeFactor: Number(saved.easeFactor),
        interval: saved.intervalDays,
        repetitions: saved.repetitions,
        nextReviewAt: saved.nextReviewAt,
      },
      message: `Card scheduled for review in ${saved.intervalDays} day(s).`,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/flashcards/:guideId/stats
export async function getFlashcardStats(req: Request, res: Response, next: NextFunction) {
  try {
    const { guideId } = req.params;
    const userId = req.user!.userId;

    const totalCards = await prisma.flashcard.count({
      where: { guideId },
    });

    const reviews = await prisma.flashcardReview.findMany({
      where: { userId, card: { guideId } },
    });

    const mastered = reviews.filter(r => r.repetitions >= 2).length;
    const learning = reviews.filter(r => r.repetitions > 0 && r.repetitions < 2).length;
    const newCards = totalCards - reviews.length;

    const averageEaseFactor = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + Number(r.easeFactor), 0) / reviews.length
      : 2.50;

    return res.json({
      success: true,
      guideId,
      mastered,
      learning,
      new: newCards,
      averageEaseFactor: parseFloat(averageEaseFactor.toFixed(2)),
      masteryPercent: totalCards > 0 ? parseFloat(((mastered / totalCards) * 100).toFixed(1)) : 0,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/flashcards/:guideId/reset
export async function resetFlashcardReviews(req: Request, res: Response, next: NextFunction) {
  try {
    const { guideId } = req.params;
    const userId = req.user!.userId;

    const cardIds = await prisma.flashcard.findMany({
      where: { guideId },
      select: { id: true },
    }).then(cards => cards.map(c => c.id));

    await prisma.flashcardReview.deleteMany({
      where: {
        userId,
        cardId: { in: cardIds },
      },
    });

    return res.json({
      success: true,
      message: 'Flashcard progress has been reset for this study guide.',
    });
  } catch (err) {
    next(err);
  }
}
