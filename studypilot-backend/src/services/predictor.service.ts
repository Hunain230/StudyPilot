import { prisma } from '../config/db';
import { computeReadiness } from './readiness.service';

export async function predictExamScore(userId: string, guideId: string, examDate: string) {
  const examDateTime = new Date(examDate).getTime();
  const nowTime = Date.now();
  const daysLeft = Math.ceil((examDateTime - nowTime) / (1000 * 60 * 60 * 24));

  // Pull all attempts sorted chronologically (ascending)
  const attempts = await prisma.quizAttempt.findMany({
    where: { userId, quizId: guideId },
    orderBy: { attemptedAt: 'asc' },
    select: { score: true, attemptedAt: true },
  });

  if (attempts.length < 2) {
    return {
      projectedScore: null,
      currentScore: attempts.length === 1 ? Math.round(Number(attempts[0].score)) : null,
      scoreSlope: 0,
      daysLeft: Math.max(0, daysLeft),
      confidence: 'low',
      trend: 'stable',
      reason: 'Not enough data (need 2+ quiz attempts to forecast trends).',
    };
  }

  // Linear regression calculations
  const n = attempts.length;
  const xVals = attempts.map((_, i) => i);
  const yVals = attempts.map(a => Number(a.score));

  const xMean = xVals.reduce((s, x) => s + x, 0) / n;
  const yMean = yVals.reduce((s, y) => s + y, 0) / n;

  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    numerator += (xVals[i] - xMean) * (yVals[i] - yMean);
    denominator += (xVals[i] - xMean) ** 2;
  }

  // Slope of the trend line (grade points per attempt)
  const slope = denominator !== 0 ? numerator / denominator : 0;

  // Project future score: final score + trend line projection over remaining time
  const currentScore = yVals[yVals.length - 1];
  const projectedRaw = currentScore + slope * Math.max(0, daysLeft);

  // Blend projected score with readiness index (70% regression trend, 30% readiness index)
  const readiness = await computeReadiness(userId, guideId);
  const adjustedScore = projectedRaw * 0.7 + readiness * 0.3;
  const finalProjected = Math.round(Math.min(100, Math.max(0, adjustedScore)));

  const confidence = n >= 5 ? 'high' : n >= 3 ? 'medium' : 'low';
  const trend = slope > 0.5 ? 'improving' : slope < -0.5 ? 'declining' : 'stable';

  return {
    projectedScore: finalProjected,
    currentScore: Math.round(currentScore),
    scoreSlope: parseFloat(slope.toFixed(2)),
    daysLeft: Math.max(0, daysLeft),
    confidence,
    trend,
  };
}
