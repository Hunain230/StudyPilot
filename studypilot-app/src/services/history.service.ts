import { api } from '../lib/axios';

export interface ActivityEvent {
  id: string;
  type: string;
  description: string;
  guideId: string | null;
  guideName: string | null;
  meta: any;
  occurredAt: string;
}

export interface StudySession {
  id: string;
  guideId: string | null;
  guideTitle: string | null;
  durationMinutes: number;
  durationSecs: number;
  startedAt: string;
  endedAt: string | null;
  activityType: string | null;
}

export interface QuizAttemptHistory {
  id: string;
  quizId: string;
  guideTitle: string;
  score: number;
  totalQuestions: number;
  correct: number;
  incorrect: number;
  skipped: number;
  timeTakenSec: number | null;
  attemptedAt: string;
}

export interface FlashcardReviewHistory {
  id: string;
  cardId: string;
  question: string;
  guideTitle: string;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  lastReviewedAt: string;
  nextReviewAt: string | null;
}

export interface ActivityCalendarItem {
  date: string;
  count: number;
  minutesStudied: number;
}

export const historyService = {
  async getActivityLog(page = 1, limit = 20): Promise<{
    events: ActivityEvent[];
    total: number;
    totalPages: number;
    page: number;
  }> {
    const { data } = await api.get(`/v1/history?page=${page}&limit=${limit}`);
    return {
      events: data.events || [],
      total: data.total || 0,
      totalPages: data.totalPages || 0,
      page: data.page || 1,
    };
  },

  async getStudySessions(): Promise<StudySession[]> {
    const { data } = await api.get('/v1/history/sessions');
    return data.sessions || [];
  },

  async getQuizAttempts(page = 1, limit = 20): Promise<{
    attempts: QuizAttemptHistory[];
    total: number;
    totalPages: number;
  }> {
    const { data } = await api.get(`/v1/history/quiz-attempts?page=${page}&limit=${limit}`);
    return {
      attempts: data.attempts || [],
      total: data.total || 0,
      totalPages: data.totalPages || 0,
    };
  },

  async getFlashcardReviews(): Promise<FlashcardReviewHistory[]> {
    const { data } = await api.get('/v1/history/flashcard-reviews');
    return data.reviews || [];
  },

  async getActivityCalendar(year?: number): Promise<ActivityCalendarItem[]> {
    const params = year ? `?year=${year}` : '';
    const { data } = await api.get(`/v1/analytics/activity-calendar${params}`);
    return data.data || [];
  },
};
