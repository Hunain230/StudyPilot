import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { ApiResponse } from '../utils/response';
import { evaluateAttempt, QuestionRecord } from '../services/evaluator.service';
import { quizAttemptSchema } from '../validators/phase3.validator';
import { computeWeakTopics, getQuestionTopic } from '../services/weakTopic.service';

// POST /api/v1/quiz/:quizId/attempt
export async function submitQuizAttempt(req: Request, res: Response, next: NextFunction) {
  try {
    const { quizId } = req.params; // quizId maps to guideId
    const userId = req.user!.userId;

    const validated = quizAttemptSchema.parse(req.body);

    const guide = await prisma.guide.findUnique({
      where: { id: quizId },
      include: {
        quizQuestions: true,
        content: { select: { topics: true } },
      },
    });

    if (!guide) {
      return res.status(404).json(ApiResponse.error('Guide/Quiz not found.', 404));
    }

    if (guide.quizQuestions.length === 0) {
      return res.status(400).json(ApiResponse.error('This guide does not have any quiz questions generated.', 400));
    }

    // Extract guide topics
    let guideTopicsList: string[] = [];
    if (guide.content?.topics) {
      try {
        const parsed = typeof guide.content.topics === 'string'
          ? JSON.parse(guide.content.topics)
          : guide.content.topics;
        if (Array.isArray(parsed)) {
          guideTopicsList = parsed.map(String);
        }
      } catch (e) {
        // ignore
      }
    }

    // Format questions for evaluation
    const questions: QuestionRecord[] = guide.quizQuestions.map(q => ({
      id: q.id,
      question: q.question,
      options: Array.isArray(q.options) ? q.options as string[] : [],
      correctAnswerIndex: q.correctAnswerIndex,
      explanation: q.explanation || '',
    }));

    // Evaluate
    const evaluation = await evaluateAttempt(validated.answers, questions, guideTopicsList);

    // Save attempt
    const attempt = await prisma.quizAttempt.create({
      data: {
        userId,
        quizId, // maps to guideId
        score: evaluation.scorePercent,
        totalQuestions: questions.length,
        correct: evaluation.correct,
        incorrect: evaluation.incorrect,
        skipped: evaluation.skipped,
        timeTakenSec: validated.timeTakenSeconds || null,
        results: {
          create: evaluation.results.map(r => {
            const answer = validated.answers.find(a => a.questionId === r.questionId);
            return {
              questionId: r.questionId,
              selectedOpt: answer?.selectedOption !== undefined ? String(answer.selectedOption) : null,
              writtenAns: answer?.writtenAnswer || null,
              isCorrect: r.isCorrect,
            };
          }),
        },
      },
      include: {
        results: true,
      },
    });

    // Write activity log
    await prisma.activityLog.create({
      data: {
        userId,
        guideId: quizId,
        type: 'QUIZ_ATTEMPT',
        description: `Scored ${evaluation.scorePercent}% on "${guide.title}" Quiz`,
        meta: { attemptId: attempt.id, score: evaluation.scorePercent },
      },
    });

    // Write study session (activity_type is lowercase enum)
    await prisma.studySession.create({
      data: {
        userId,
        guideId: quizId,
        activityType: 'quiz',
        durationSecs: validated.timeTakenSeconds || 300,
      },
    });

    // Compute rolling weak topics for the user & update the weak_topics table for this guide
    const rollingWeakTopics = await computeWeakTopics(userId, quizId);
    
    // Clear and update guide-specific weak topics
    await prisma.weakTopic.deleteMany({
      where: { guideId: quizId },
    });

    if (rollingWeakTopics.length > 0) {
      await prisma.weakTopic.createMany({
        data: rollingWeakTopics.map(wt => ({
          guideId: quizId,
          topicName: wt.topic,
          score: wt.accuracy,
          recommendation: `Focus on ${wt.topic} - your accuracy is ${wt.accuracy.toFixed(1)}%. Review the guide section and practice flashcards.`,
        })),
      });
    }

    return res.status(201).json({
      success: true,
      attemptId: attempt.id,
      quizId,
      score: evaluation.scorePercent,
      totalQuestions: questions.length,
      correct: evaluation.correct,
      incorrect: evaluation.incorrect,
      skipped: evaluation.skipped,
      timeTakenSeconds: validated.timeTakenSeconds || 0,
      topicBreakdown: Object.entries(evaluation.topicMap).map(([topic, stats]) => ({
        topic,
        correct: stats.correct,
        total: stats.total,
        scorePercent: parseFloat(stats.scorePercent.toFixed(1)),
      })),
      weakTopicsDetected: evaluation.weakTopics,
      attemptedAt: attempt.attemptedAt,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/quiz/:quizId/attempts
export async function getQuizAttempts(req: Request, res: Response, next: NextFunction) {
  try {
    const { quizId } = req.params;
    const userId = req.user!.userId;

    const attempts = await prisma.quizAttempt.findMany({
      where: { userId, quizId },
      orderBy: { attemptedAt: 'desc' },
    });

    return res.json({
      success: true,
      attempts: attempts.map(a => ({
        id: a.id,
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

// GET /api/v1/quiz/attempt/:attemptId
export async function getQuizAttemptDetails(req: Request, res: Response, next: NextFunction) {
  try {
    const { attemptId } = req.params;
    const userId = req.user!.userId;

    const attempt = await prisma.quizAttempt.findFirst({
      where: { id: attemptId, userId },
      include: {
        guide: {
          select: {
            title: true,
            content: { select: { topics: true } },
          },
        },
        results: {
          include: {
            question: true,
          },
        },
      },
    });

    if (!attempt) {
      return res.status(404).json(ApiResponse.error('Quiz attempt not found.', 404));
    }

    // Extract guide topics for question-topic mapping
    let guideTopicsList: string[] = [];
    if (attempt.guide?.content?.topics) {
      try {
        const parsed = typeof attempt.guide.content.topics === 'string'
          ? JSON.parse(attempt.guide.content.topics)
          : attempt.guide.content.topics;
        if (Array.isArray(parsed)) {
          guideTopicsList = parsed.map(String);
        }
      } catch (e) {
        // ignore
      }
    }

    const questions = attempt.results.map(r => {
      // Find question's topic
      const topic = r.question.question ? getQuestionTopic(r.question.question, guideTopicsList) : 'General';

      return {
        questionId: r.questionId,
        questionText: r.question.question,
        options: Array.isArray(r.question.options) ? r.question.options as string[] : [],
        selectedOption: r.selectedOpt,
        correctOptionIndex: r.question.correctAnswerIndex,
        isCorrect: r.isCorrect,
        explanation: r.question.explanation || '',
        topic,
      };
    });

    return res.json({
      success: true,
      attemptId: attempt.id,
      quizId: attempt.quizId,
      guideTitle: attempt.guide.title,
      score: Number(attempt.score),
      totalQuestions: attempt.totalQuestions,
      correct: attempt.correct,
      incorrect: attempt.incorrect,
      skipped: attempt.skipped,
      timeTakenSec: attempt.timeTakenSec,
      attemptedAt: attempt.attemptedAt,
      questions,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/quiz/:quizId/best
export async function getBestAttempt(req: Request, res: Response, next: NextFunction) {
  try {
    const { quizId } = req.params;
    const userId = req.user!.userId;

    const bestAttempt = await prisma.quizAttempt.findFirst({
      where: { userId, quizId },
      orderBy: { score: 'desc' },
    });

    return res.json({
      success: true,
      quizId,
      bestScore: bestAttempt ? Number(bestAttempt.score) : null,
      attemptedAt: bestAttempt ? bestAttempt.attemptedAt : null,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/quiz/recent
export async function getRecentAttempts(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;

    const recent = await prisma.quizAttempt.findMany({
      where: { userId },
      orderBy: { attemptedAt: 'desc' },
      take: 10,
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
      attempts: recent.map(a => ({
        id: a.id,
        quizId: a.quizId,
        guideTitle: a.guide?.title || 'Unknown Guide',
        score: Number(a.score),
        totalQuestions: a.totalQuestions,
        correct: a.correct,
        incorrect: a.incorrect,
        skipped: a.skipped,
        attemptedAt: a.attemptedAt,
      })),
    });
  } catch (err) {
    next(err);
  }
}
