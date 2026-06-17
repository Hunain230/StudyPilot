import { prisma } from '../config/db';

export function getQuestionTopic(questionText: string, guideTopics: string[]): string {
  if (!guideTopics || guideTopics.length === 0) return 'General';
  const text = questionText.toLowerCase();
  
  // Try to find a topic name contained in the question text
  for (const topic of guideTopics) {
    if (text.includes(topic.toLowerCase())) {
      return topic;
    }
  }
  
  // Fallback to a hash or orderIndex representation, or just return the first topic
  return guideTopics[0] || 'General';
}

export async function computeWeakTopics(userId: string, guideId?: string) {
  // Pull last 50 question results for quiz attempts by this user
  const attempts = await prisma.quizAttempt.findMany({
    where: {
      userId,
      ...(guideId ? { quizId: guideId } : {}),
    },
    orderBy: { attemptedAt: 'desc' },
    take: 10, // Pull last 10 attempts
    include: {
      results: {
        include: {
          question: true,
        },
      },
    },
  });

  const topicStats: Record<string, { correct: number; total: number }> = {};

  for (const attempt of attempts) {
    // Get guide topics for question-topic mapping
    const guide = await prisma.guide.findUnique({
      where: { id: attempt.quizId },
      include: { content: { select: { topics: true } } },
    });
    
    let guideTopicsList: string[] = [];
    if (guide?.content?.topics) {
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

    for (const result of attempt.results) {
      const topic = getQuestionTopic(result.question.question, guideTopicsList);
      if (!topicStats[topic]) {
        topicStats[topic] = { correct: 0, total: 0 };
      }
      topicStats[topic].total += 1;
      if (result.isCorrect) {
        topicStats[topic].correct += 1;
      }
    }
  }

  const weakTopics = Object.entries(topicStats)
    .map(([topic, stats]) => ({
      topic,
      accuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0,
      totalAttempted: stats.total,
      isWeak: stats.total >= 3 && (stats.correct / stats.total) < 0.6,
    }))
    .filter(t => t.isWeak)
    .sort((a, b) => a.accuracy - b.accuracy); // Worst first

  return weakTopics;
}
