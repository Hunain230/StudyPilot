import { api } from '../lib/axios';

export const userService = {
  async getProfile() {
    const { data } = await api.get('/users/profile');
    return data.data;
  },

  async updateProfile(payload: { name?: string; avatarUrl?: string }) {
    const { data } = await api.put('/users/profile', payload);
    return data.data;
  }
};
