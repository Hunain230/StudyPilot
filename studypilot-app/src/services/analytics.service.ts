import { api } from '../lib/axios';

export interface OverviewStats {
  success: boolean;
  totalGuidesStudied: number;
  totalQuizAttempts: number;
  averageQuizScore: number;
  totalFlashcardsReviewed: number;
  masteredCards: number;
  currentStudyStreak: number;
  longestStreak: number;
  totalStudyMinutes: number;
  lastActiveAt: string | null;
}

export interface QuizTrendDataset {
  label: string;
  data: number[];
  color: string;
}

export interface QuizTrendData {
  success: boolean;
  chartType: string;
  labels: string[];
  datasets: QuizTrendDataset[];
}

export interface WeakTopicItem {
  topic: string;
  accuracy: number;
  totalAttempted: number;
  isWeak: boolean;
}

export interface WeakTopicsData {
  success: boolean;
  weakTopics: WeakTopicItem[];
}

export interface ScorePrediction {
  success: boolean;
  projectedScore: number | null;
  trend: 'improving' | 'declining' | 'stable' | 'insufficient_data';
  confidence: 'high' | 'medium' | 'low';
}

export interface ActivityCalendarItem {
  date: string;
  count: number;
  minutesStudied: number;
}

export interface ActivityCalendarData {
  success: boolean;
  chartType: string;
  year: number;
  data: ActivityCalendarItem[];
}

export const analyticsService = {
  async getOverview(): Promise<OverviewStats> {
    const { data } = await api.get('/v1/analytics/overview');
    return data;
  },

  async getQuizTrend(guideId?: string, days?: number): Promise<QuizTrendData> {
    const params = new URLSearchParams();
    if (guideId) params.append('guideId', guideId);
    if (days) params.append('days', days.toString());
    const { data } = await api.get(`/v1/analytics/quiz-trend?${params.toString()}`);
    return data;
  },

  async getWeakTopics(guideId?: string): Promise<WeakTopicsData> {
    const params = new URLSearchParams();
    if (guideId) params.append('guideId', guideId);
    const { data } = await api.get(`/v1/analytics/weak-topics?${params.toString()}`);
    return data;
  },

  async getPredict(guideId: string, examDate: string): Promise<ScorePrediction> {
    const params = new URLSearchParams();
    params.append('guideId', guideId);
    params.append('examDate', examDate);
    const { data } = await api.get(`/v1/analytics/predict?${params.toString()}`);
    return data;
  },

  async getActivityCalendar(year?: number): Promise<ActivityCalendarData> {
    const params = new URLSearchParams();
    if (year) params.append('year', year.toString());
    const { data } = await api.get(`/v1/analytics/activity-calendar?${params.toString()}`);
    return data;
  }
};
