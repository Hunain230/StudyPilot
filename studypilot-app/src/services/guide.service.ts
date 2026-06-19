import { api } from '../lib/axios';

export const guideService = {
  async getAll() {
    const { data } = await api.get('/guides');
    return data.data;
  },

  async create(payload: {
    title: string;
    description?: string;
    subject?: string;
    sourceType?: string;
    notesText?: string;
    youtubeUrl?: string;
    selectedComponents?: string[];
  }) {
    const { data } = await api.post('/guides', payload);
    return data.data;
  },

  async getById(id: string) {
    const { data } = await api.get(`/guides/${id}`);
    return data.data;
  },

  async getStatus(id: string): Promise<{ status: string; id: string }> {
    const { data } = await api.get(`/guides/${id}`);
    const guide = data.data;
    return { status: guide.status, id: guide.id };
  },

  async delete(id: string) {
    const { data } = await api.delete(`/guides/${id}`);
    return data.data;
  },

  async exportPdf(id: string) {
    const { data } = await api.get(`/v1/export/guide/${id}/content`, {
      responseType: 'blob',
    });
    return data as Blob;
  },
};
