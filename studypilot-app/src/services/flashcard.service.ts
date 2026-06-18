import { api } from '../lib/axios';

export interface FlashcardReviewPayload {
  quality: number; // 0 to 5
}

export const flashcardService = {
  async getCards(guideId: string) {
    const { data } = await api.get(`/v1/flashcards/${guideId}`);
    return data;
  },

  async getDueCards() {
    const { data } = await api.get('/v1/flashcards/due');
    return data.cards || [];
  },

  async submitReview(cardId: string, quality: number) {
    const { data } = await api.post(`/v1/flashcards/${cardId}/review`, { quality });
    return data;
  },

  async getStats(guideId: string) {
    const { data } = await api.get(`/v1/flashcards/${guideId}/stats`);
    return data;
  },

  async resetProgress(guideId: string) {
    const { data } = await api.post(`/v1/flashcards/${guideId}/reset`);
    return data;
  }
};
