import { prisma } from '../config/db';
import { getQuestionTopic } from './weakTopic.service';

export async function computeReadiness(userId: string, guideId: string): Promise<number> {
  const W = { quiz: 0.40, cards: 0.25, consistency: 0.20, coverage: 0.15 };

  // 1. Quiz accuracy (last 5 attempts for this guide)
  const recentAttempts = await prisma.quizAttempt.findMany({
    where: { userId, quizId: guideId },
    orderBy: { attemptedAt: 'desc' },
    take: 5,
  });
  
  // score is stored as Decimal, we parse it to number
  const quizAccuracy = recentAttempts.length
    ? recentAttempts.reduce((s, a) => s + Number(a.score), 0) / recentAttempts.length
    : 0;

  // 2. Card mastery
  const totalCards = await prisma.flashcard.count({
    where: { guideId },
  });
  
  const reviews = await prisma.flashcardReview.findMany({
    where: { 
      userId, 
      card: { guideId },
      repetitions: { gte: 2 },
    },
  });
  
  const cardMastery = totalCards > 0 ? (reviews.length / totalCards) * 100 : 0;

  // 3. Study consistency (activity logs past 14 days)
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const activitySessions = await prisma.studySession.findMany({
    where: { 
      userId, 
      guideId, 
      startedAt: { gte: twoWeeksAgo },
    },
    select: { startedAt: true },
  });
  
  const uniqueDays = new Set(
    activitySessions.map(s => new Date(s.startedAt).toDateString())
  ).size;
  const studyConsistency = (uniqueDays / 14) * 100;

  // 4. Topic coverage
  const guide = await prisma.guide.findUnique({
    where: { id: guideId },
    include: { content: { select: { topics: true } } },
  });

  let guideTopics: string[] = [];
  if (guide?.content?.topics) {
    try {
      const parsed = typeof guide.content.topics === 'string'
        ? JSON.parse(guide.content.topics)
        : guide.content.topics;
      if (Array.isArray(parsed)) {
        guideTopics = parsed.map(String);
      }
    } catch (e) {
      // ignore
    }
  }

  // Get all quiz results by this user for this guide
  const quizAttempts = await prisma.quizAttempt.findMany({
    where: { userId, quizId: guideId },
    include: { results: { include: { question: true } } },
  });

  const attemptedTopics = new Set<string>();
  for (const attempt of quizAttempts) {
    for (const res of attempt.results) {
      const topic = getQuestionTopic(res.question.question, guideTopics);
      if (topic !== 'General') {
        attemptedTopics.add(topic);
      }
    }
  }

  const coveragePercent = guideTopics.length > 0
    ? (attemptedTopics.size / guideTopics.length) * 100
    : 0;

  // Compute weighted composite score
  const score = (
    W.quiz * quizAccuracy +
    W.cards * cardMastery +
    W.consistency * studyConsistency +
    W.coverage * coveragePercent
  );

  return Math.round(Math.min(100, Math.max(0, score)));
}

export function getReadinessStatus(score: number): { status: string; color: string } {
  if (score >= 85) return { status: 'Ready', color: '#10b981' }; // green
  if (score >= 70) return { status: 'On Track', color: '#6366f1' }; // blue/indigo
  if (score >= 50) return { status: 'Needs Work', color: '#f59e0b' }; // orange
  return { status: 'At Risk', color: '#ef4444' }; // red
}
