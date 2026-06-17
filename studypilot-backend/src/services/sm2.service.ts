export interface SM2Card {
  easeFactor: number;   // starts at 2.5
  interval: number;     // days until next review, starts at 1
  repetitions: number;  // correct streak count
  nextReviewAt: Date;
}

/**
 * Recalculates card interval and ease factor based on review quality (0-5).
 * 
 * quality:
 *   0-1 = forgot / wrong
 *   2   = recalled with serious difficulty
 *   3   = recalled with difficulty
 *   4   = recalled correctly
 *   5   = recalled perfectly
 */
export function sm2Update(card: Omit<SM2Card, 'nextReviewAt'>, quality: number): SM2Card {
  const q = Math.max(0, Math.min(5, quality));
  let easeFactor = Number(card.easeFactor);
  let interval = card.interval;
  let repetitions = card.repetitions;

  if (q < 3) {
    repetitions = 0;
    interval = 1;
  } else {
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions += 1;
  }

  // Calculate ease factor adjustment
  easeFactor = easeFactor + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02);
  
  // Ease factor must never drop below 1.3
  if (easeFactor < 1.3) {
    easeFactor = 1.3;
  }

  const nextReviewAt = new Date();
  nextReviewAt.setHours(0, 0, 0, 0); // Normalize to start of day
  nextReviewAt.setDate(nextReviewAt.getDate() + interval);

  return {
    easeFactor: parseFloat(easeFactor.toFixed(2)),
    interval,
    repetitions,
    nextReviewAt,
  };
}
