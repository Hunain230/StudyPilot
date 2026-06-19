import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { ApiResponse } from '../utils/response';
import { computeWeakTopics } from '../services/weakTopic.service';
import { computeReadiness, getReadinessStatus } from '../services/readiness.service';
import { predictExamScore } from '../services/predictor.service';
import { getQuestionTopic } from '../services/weakTopic.service';

// Helper to calculate study streaks
function calculateStreak(dates: Date[]): { currentStreak: number; longestStreak: number } {
  if (dates.length === 0) return { currentStreak: 0, longestStreak: 0 };
  
  // Normalize dates to YYYY-MM-DD local unique strings, sorted descending
  const uniqueDates = Array.from(new Set(
    dates.map(d => {
      const date = new Date(d);
      // Format as YYYY-MM-DD local
      const offset = date.getTimezoneOffset();
      const localDate = new Date(date.getTime() - (offset * 60 * 1000));
      return localDate.toISOString().split('T')[0];
    })
  )).sort((a, b) => b.localeCompare(a));

  if (uniqueDates.length === 0) return { currentStreak: 0, longestStreak: 0 };

  const todayStr = new Date().toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  let currentStreak = 0;
  const hasCurrentStreakActive = uniqueDates[0] === todayStr || uniqueDates[0] === yesterdayStr;

  if (hasCurrentStreakActive) {
    currentStreak = 1;
    let prevDate = new Date(uniqueDates[0]);
    for (let i = 1; i < uniqueDates.length; i++) {
      const currDate = new Date(uniqueDates[i]);
      const diffTime = Math.abs(prevDate.getTime() - currDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        currentStreak++;
        prevDate = currDate;
      } else {
        break;
      }
    }
  }

  let longestStreak = 0;
  let tempStreak = 0;
  let prevDate: Date | null = null;

  for (let i = uniqueDates.length - 1; i >= 0; i--) {
    const currDate = new Date(uniqueDates[i]);
    if (prevDate === null) {
      tempStreak = 1;
    } else {
      const diffTime = Math.abs(currDate.getTime() - prevDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        tempStreak++;
      } else {
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak;
        }
        tempStreak = 1;
      }
    }
    prevDate = currDate;
  }
  if (tempStreak > longestStreak) {
    longestStreak = tempStreak;
  }

  return { currentStreak, longestStreak };
}

// GET /api/v1/analytics/overview
export async function getOverviewStats(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;

    // Ensure the user has at least one study session today to keep streak active on login/dashboard visit
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const sessionToday = await prisma.studySession.findFirst({
      where: {
        userId,
        startedAt: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    });

    if (!sessionToday) {
      await prisma.studySession.create({
        data: {
          userId,
          activityType: 'reading',
          durationSecs: 60,
        },
      });
    }

    const totalGuides = await prisma.guide.count({ where: { userId } });
    const quizAttempts = await prisma.quizAttempt.findMany({
      where: { userId },
      select: { score: true },
    });

    const averageQuizScore = quizAttempts.length > 0
      ? quizAttempts.reduce((sum, a) => sum + Number(a.score), 0) / quizAttempts.length
      : 0;

    const totalFlashcardsReviewed = await prisma.flashcardReview.count({ where: { userId } });
    const masteredCards = await prisma.flashcardReview.count({
      where: { userId, repetitions: { gte: 2 } },
    });

    // Streak and study minutes from study sessions
    const studySessions = await prisma.studySession.findMany({
      where: { userId },
      select: { startedAt: true, durationSecs: true },
    });

    const totalStudyMinutes = studySessions.reduce((sum, s) => sum + Math.round(s.durationSecs / 60), 0);
    const activityDates = studySessions.map(s => s.startedAt);

    const { currentStreak, longestStreak } = calculateStreak(activityDates);

    const lastActiveSession = await prisma.studySession.findFirst({
      where: { userId },
      orderBy: { startedAt: 'desc' },
      select: { startedAt: true },
    });

    return res.json({
      success: true,
      userId,
      totalGuidesStudied: totalGuides,
      totalQuizAttempts: quizAttempts.length,
      averageQuizScore: parseFloat(averageQuizScore.toFixed(1)),
      totalFlashcardsReviewed,
      masteredCards,
      currentStudyStreak: currentStreak,
      longestStreak,
      totalStudyMinutes,
      lastActiveAt: lastActiveSession ? lastActiveSession.startedAt : null,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/analytics/quiz-trend
export async function getQuizTrend(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const { guideId, days } = req.query;

    const pastDays = days ? Number(days) : 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - pastDays);

    const attempts = await prisma.quizAttempt.findMany({
      where: {
        userId,
        ...(guideId ? { quizId: String(guideId) } : {}),
        attemptedAt: { gte: cutoffDate },
      },
      orderBy: { attemptedAt: 'asc' },
    });

    const labels = attempts.map(a => {
      const date = new Date(a.attemptedAt);
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    });

    const data = attempts.map(a => Number(a.score));

    return res.json({
      success: true,
      chartType: 'line',
      labels,
      datasets: [
        {
          label: 'Quiz Score (%)',
          data,
          color: '#6366f1',
        },
      ],
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/analytics/topic-heatmap
export async function getTopicHeatmap(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const { guideId } = req.query;

    if (!guideId || typeof guideId !== 'string') {
      return res.status(400).json(ApiResponse.error('guideId query parameter is required', 400));
    }

    const guide = await prisma.guide.findUnique({
      where: { id: guideId },
      include: { content: { select: { topics: true } } },
    });

    if (!guide) {
      return res.status(404).json(ApiResponse.error('Guide not found', 404));
    }

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

    const attempts = await prisma.quizAttempt.findMany({
      where: { userId, quizId: guideId },
      include: {
        results: {
          include: {
            question: true,
          },
        },
      },
    });

    const topicStats: Record<string, { correct: number; total: number }> = {};
    // Pre-initialize stats for all guide topics
    for (const t of guideTopicsList) {
      topicStats[t] = { correct: 0, total: 0 };
    }

    for (const attempt of attempts) {
      for (const res of attempt.results) {
        const topic = getQuestionTopic(res.question.question, guideTopicsList);
        if (!topicStats[topic]) {
          topicStats[topic] = { correct: 0, total: 0 };
        }
        topicStats[topic].total += 1;
        if (res.isCorrect) {
          topicStats[topic].correct += 1;
        }
      }
    }

    const topicsData = Object.entries(topicStats).map(([topic, stats]) => {
      const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
      let level = 'average';
      if (stats.total === 0) level = 'new';
      else if (accuracy >= 80) level = 'strong';
      else if (accuracy < 60) level = 'weak';

      return {
        topic,
        accuracy,
        attempts: stats.total,
        level,
      };
    });

    return res.json({
      success: true,
      chartType: 'heatmap',
      topics: topicsData,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/analytics/weak-topics
export async function getWeakTopics(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const { guideId } = req.query;

    const weakTopics = await computeWeakTopics(userId, guideId ? String(guideId) : undefined);

    return res.json({
      success: true,
      weakTopics: weakTopics.map(wt => ({
        topic: wt.topic,
        accuracy: parseFloat(wt.accuracy.toFixed(1)),
        totalAttempted: wt.totalAttempted,
        isWeak: wt.isWeak,
      })),
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/analytics/activity-calendar
export async function getActivityCalendar(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const { year } = req.query;

    const searchYear = year ? Number(year) : new Date().getFullYear();
    const startDate = new Date(searchYear, 0, 1);
    const endDate = new Date(searchYear, 11, 31, 23, 59, 59);

    const sessions = await prisma.studySession.findMany({
      where: {
        userId,
        startedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: { startedAt: true, durationSecs: true },
    });

    // Group sessions by local date string YYYY-MM-DD
    const dateMap: Record<string, { count: number; minutesStudied: number }> = {};

    for (const session of sessions) {
      const date = new Date(session.startedAt);
      const offset = date.getTimezoneOffset();
      const localDate = new Date(date.getTime() - (offset * 60 * 1000));
      const dateStr = localDate.toISOString().split('T')[0];

      if (!dateMap[dateStr]) {
        dateMap[dateStr] = { count: 0, minutesStudied: 0 };
      }
      dateMap[dateStr].count += 1;
      dateMap[dateStr].minutesStudied += Math.round(session.durationSecs / 60);
    }

    const calendarData = Object.entries(dateMap).map(([date, stats]) => ({
      date,
      count: stats.count,
      minutesStudied: stats.minutesStudied,
    }));

    return res.json({
      success: true,
      chartType: 'calendar_heatmap',
      year: searchYear,
      data: calendarData,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/analytics/predict
export async function getProjectedScore(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const { guideId, examDate } = req.query;

    if (!guideId || typeof guideId !== 'string') {
      return res.status(400).json(ApiResponse.error('guideId query parameter is required', 400));
    }

    if (!examDate || typeof examDate !== 'string') {
      return res.status(400).json(ApiResponse.error('examDate query parameter is required', 400));
    }

    const prediction = await predictExamScore(userId, guideId, examDate);

    return res.json({
      success: true,
      ...prediction,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/analytics/guide-summary/:guideId
export async function getGuideSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const { guideId } = req.params;

    const guide = await prisma.guide.findUnique({
      where: { id: guideId },
      include: {
        studyPlan: true,
        content: { select: { topics: true } },
      },
    });

    if (!guide) {
      return res.status(404).json(ApiResponse.error('Guide not found', 404));
    }

    const readinessScore = await computeReadiness(userId, guideId);
    const readinessInfo = getReadinessStatus(readinessScore);

    const weakTopics = await computeWeakTopics(userId, guideId);

    // Card stats
    const totalCards = await prisma.flashcard.count({ where: { guideId } });
    const reviews = await prisma.flashcardReview.findMany({
      where: { userId, card: { guideId } },
    });
    const mastered = reviews.filter(r => r.repetitions >= 2).length;
    const learning = reviews.filter(r => r.repetitions > 0 && r.repetitions < 2).length;
    const newCards = totalCards - reviews.length;

    // Quiz Trend (last 10 attempts)
    const attempts = await prisma.quizAttempt.findMany({
      where: { userId, quizId: guideId },
      orderBy: { attemptedAt: 'asc' },
      take: 10,
    });

    const labels = attempts.map(a => new Date(a.attemptedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
    const trendData = attempts.map(a => Number(a.score));

    // Predictor (Use date from studyPlan if available, otherwise default to 30 days from now)
    let examDateStr = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    if (guide.studyPlan) {
      try {
        const plan = typeof guide.studyPlan.planJson === 'string'
          ? JSON.parse(guide.studyPlan.planJson)
          : guide.studyPlan.planJson;
        if (plan?.examDate) {
          examDateStr = plan.examDate;
        }
      } catch (e) {
        // ignore
      }
    }

    const predictor = await predictExamScore(userId, guideId, examDateStr);

    return res.json({
      success: true,
      guideId,
      readiness: {
        score: readinessScore,
        status: readinessInfo.status,
        color: readinessInfo.color,
      },
      weakTopics: weakTopics.map(wt => ({
        topic: wt.topic,
        accuracy: parseFloat(wt.accuracy.toFixed(1)),
      })),
      cardMastery: {
        mastered,
        learning,
        new: newCards,
        masteryPercent: totalCards > 0 ? parseFloat(((mastered / totalCards) * 100).toFixed(1)) : 0,
      },
      quizTrend: {
        labels,
        data: trendData,
      },
      predictor: {
        projectedScore: predictor.projectedScore,
        trend: predictor.trend,
        confidence: predictor.confidence,
      },
    });
  } catch (err) {
    next(err);
  }
}
