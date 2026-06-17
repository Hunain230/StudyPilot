import { api } from '../lib/axios';

export const authService = {
  async signup(name: string, email: string, password: string) {
    const { data } = await api.post('/auth/signup', { name, email, password });
    localStorage.setItem('studypilot_token', data.data.token);
    return data.data;
  },

  async login(email: string, password: string) {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('studypilot_token', data.data.token);
    return data.data;
  },

  async getMe() {
    const { data } = await api.get('/auth/me');
    return data.data;
  },

  logout() {
    localStorage.removeItem('studypilot_token');
    window.location.href = '/login';
  },
};
