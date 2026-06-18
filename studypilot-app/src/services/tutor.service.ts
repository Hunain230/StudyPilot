import { api } from '../lib/axios';

export type TutorMode = 'web' | 'web_with_guide';

export interface TutorSource {
  title: string;
  url?: string;
  type: 'web' | 'guide';
}

export interface TutorAskResponse {
  answer: string;
  mode: TutorMode;
  sources: TutorSource[];
}

export interface TutorHistoryMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  guideId: string | null;
  createdAt: string;
}

export const tutorService = {
  async askTutor(payload: { question: string; guideId?: string | null }): Promise<TutorAskResponse> {
    const { data } = await api.post('/v1/tutor/ask', {
      question: payload.question,
      guideId: payload.guideId || null,
    });
    return data.data;
  },

  async getTutorHistory(payload: { guideId?: string | null } = {}): Promise<TutorHistoryMessage[]> {
    const params = payload.guideId ? { guideId: payload.guideId } : undefined;
    const { data } = await api.get('/v1/tutor/history', { params });
    return data.data;
  },
};
