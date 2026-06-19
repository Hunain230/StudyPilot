import { api } from '../lib/axios';

export const uploadService = {
  /**
   * Upload a file with real progress tracking.
   * @param file - The file to upload
   * @param guideId - Optional guide ID to associate the upload with
   * @param selectedComponents - Optional list of components to generate
   * @param onProgress - Optional callback receiving upload progress (0-100)
   */
  async uploadFile(
    file: File,
    guideId?: string,
    selectedComponents?: string[],
    onProgress?: (percent: number) => void
  ) {
    const formData = new FormData();
    formData.append('file', file);
    if (guideId) formData.append('guideId', guideId);
    if (selectedComponents && selectedComponents.length > 0) {
      formData.append('selectedComponents', JSON.stringify(selectedComponents));
    }

    const { data } = await api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(Math.min(percent, 99)); // cap at 99 until server confirms
        }
      },
    });
    return data.data;
  },
};
