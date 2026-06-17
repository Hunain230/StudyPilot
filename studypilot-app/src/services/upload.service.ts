import { api } from '../lib/axios';

export const uploadService = {
  async uploadFile(file: File, guideId?: string) {
    const formData = new FormData();
    formData.append('file', file);
    if (guideId) formData.append('guideId', guideId);

    const { data } = await api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data;
  },
};
