import { api } from '../lib/axios';

export interface Resource {
  id: string;
  title: string;
  url: string | null;
  type: string;
  topic: string | null;
  guideId: string | null;
  guideTitle: string | null;
  notes: string | null;
  savedAt: string;
}

export interface AISuggestion {
  title: string;
  url: string;
  type: string;
  reason: string;
}

export const resourceService = {
  async getAll(guideId?: string): Promise<Resource[]> {
    const params = new URLSearchParams();
    if (guideId) params.append('guideId', guideId);
    const { data } = await api.get(`/v1/resources?${params.toString()}`);
    return data.resources || [];
  },

  async create(payload: {
    title: string;
    url?: string;
    type?: string;
    topic?: string;
    guideId?: string;
    notes?: string;
  }): Promise<Resource> {
    const { data } = await api.post('/v1/resources', payload);
    return data.resource;
  },

  async delete(resourceId: string): Promise<void> {
    await api.delete(`/v1/resources/${resourceId}`);
  },

  async suggest(topic: string, guideId?: string, type?: string): Promise<{ topic: string; suggestions: AISuggestion[] }> {
    const { data } = await api.post('/v1/resources/suggest', { topic, guideId, type });
    return { topic: data.topic, suggestions: data.suggestions || [] };
  },
};
