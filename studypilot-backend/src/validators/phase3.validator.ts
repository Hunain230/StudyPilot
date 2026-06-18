import { z } from 'zod';

export const reviewSchema = z.object({
  quality: z.number().int().min(0).max(5),
});

export const quizAttemptSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string().uuid(),
      selectedOption: z.union([z.string(), z.number()]).optional(),
      writtenAnswer: z.string().max(2000).optional(),
    })
  ).min(1),
  timeTakenSeconds: z.number().int().positive().optional(),
});

export const doubtSchema = z.object({
  guideId: z.string().uuid(),
  question: z.string().min(5).max(500),
});

export const tutorAskSchema = z.object({
  question: z.string().min(3).max(1000),
  guideId: z.string().uuid().optional().nullable(),
  mode: z.enum(['simple', 'web']).optional(),
});

export const plannerSchema = z.object({
  guideId: z.string().uuid().optional().nullable(),
  topic: z.string().max(255).optional(),
  scheduledAt: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid ISO date-time string',
  }),
  durationMinutes: z.number().int().positive().optional(),
  type: z.enum(['STUDY', 'REVIEW', 'QUIZ', 'FLASHCARDS', 'DOUBT']).optional(),
  notes: z.string().max(2000).optional(),
  status: z.enum(['PENDING', 'COMPLETED', 'SKIPPED']).optional(),
});

export const resourceSchema = z.object({
  title: z.string().min(1).max(500),
  url: z.string().url().or(z.literal('')).optional().nullable(),
  type: z.enum(['VIDEO', 'ARTICLE', 'PAPER', 'BOOK', 'COURSE', 'TOOL', 'OTHER']).optional(),
  topic: z.string().max(255).optional(),
  guideId: z.string().uuid().optional().nullable(),
  notes: z.string().max(2000).optional(),
});
