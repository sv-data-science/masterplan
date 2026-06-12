import axios from 'axios';
import Cookies from 'js-cookie';

// Calls go to /api/v1/... on the same origin — Next.js rewrites proxy them to the backend
export const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = Cookies.get('wc_access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      Cookies.remove('wc_access_token');
      if (typeof window !== 'undefined') window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authApi = {
  register: (data: { username: string; email: string; password: string; display_name: string }) =>
    api.post('/auth/register', data),
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
};

export const matchesApi = {
  list: (params?: { group?: string; matchday?: number }) =>
    api.get('/matches', { params }),
  get: (id: string) => api.get(`/matches/${id}`),
  updateScore: (id: string, home_score: number, away_score: number, status = 'completed') =>
    api.put(`/matches/${id}/score`, { home_score, away_score, status }),
};

export const predictionsApi = {
  upsert: (match_id: string, pred_home: number, pred_away: number) =>
    api.post('/predictions', { match_id, pred_home, pred_away }),
  my: () => api.get('/predictions/my'),
};

export const leaderboardApi = {
  get: () => api.get('/leaderboard'),
};
