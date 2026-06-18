import { api } from '../lib/axios';

export interface QuizAnswerPayload {
  questionId: string;
  selectedOption?: number | string;
  writtenAnswer?: string;
}

export interface QuizAttemptPayload {
  answers: QuizAnswerPayload[];
  timeTakenSeconds?: number;
}

export const quizService = {
  async submitAttempt(quizId: string, payload: QuizAttemptPayload) {
    const { data } = await api.post(`/v1/quiz/${quizId}/attempt`, payload);
    return data;
  },

  async getAttempts(quizId: string) {
    const { data } = await api.get(`/v1/quiz/${quizId}/attempts`);
    return data.attempts || [];
  },

  async getAttemptDetails(attemptId: string) {
    const { data } = await api.get(`/v1/quiz/attempt/${attemptId}`);
    return data;
  },

  async getBestAttempt(quizId: string) {
    const { data } = await api.get(`/v1/quiz/${quizId}/best`);
    return data;
  },

  async getRecentAttempts() {
    const { data } = await api.get('/v1/quiz/recent');
    return data.attempts || [];
  }
};
