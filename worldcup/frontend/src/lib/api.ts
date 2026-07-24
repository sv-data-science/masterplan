import axios from 'axios';
import Cookies from 'js-cookie';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

export const api = axios.create({
  baseURL: `${API_BASE}/api/v1`,
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
  updateKit: (kit: object) => api.put('/auth/kit', kit),
  updatePreferences: (data: { fav_wc_year?: number | null; fav_national_team?: string | null; fav_player?: string | null }) =>
    api.put('/auth/preferences', data),
};

export const matchesApi = {
  list: (params?: { group?: string; matchday?: number; stage?: string }) =>
    api.get('/matches', { params }),
  get: (id: string) => api.get(`/matches/${id}`),
  predictions: (id: string) => api.get(`/matches/${id}/predictions`),
  updateScore: (id: string, home_score: number, away_score: number, status = 'completed', kickoff_utc?: string, venue?: string, city?: string) =>
    api.put(`/matches/${id}/score`, { home_score, away_score, status, kickoff_utc, venue, city }),
};

export const predictionsApi = {
  upsert: (match_id: string, pred_home: number, pred_away: number) =>
    api.post('/predictions', { match_id, pred_home, pred_away }),
  my: () => api.get('/predictions/my'),
};

export const leaderboardApi = {
  get: (stage?: string) => api.get('/leaderboard', { params: stage ? { stage } : undefined }),
};

export const goalsApi = {
  list: (matchId: string) => api.get(`/matches/${matchId}/goals`),
  add: (matchId: string, data: { team_id: string; player_name: string; minute?: number; is_own_goal?: boolean; is_penalty?: boolean }) =>
    api.post(`/matches/${matchId}/goals`, data),
  delete: (goalId: string) => api.delete(`/goals/${goalId}`),
  topScorers: () => api.get('/stats/top-scorers'),
};

export const triviaApi = {
  submitScore: (score: number, total: number) => api.post('/trivia/score', { score, total }),
  leaderboard: () => api.get('/trivia/leaderboard'),
  saveLive: (score: number, total: number) => api.put('/trivia/live', { score, total }),
  myStats: () => api.get('/trivia/my-stats'),
};

export const profileApi = {
  get: (username: string) => api.get(`/auth/profile/${username}`),
};

export const leagueApi = {
  matches: (params?: { competition?: string; matchweek?: number }) =>
    api.get('/league/matches/authed', { params }),
  matchesPublic: (params?: { competition?: string; matchweek?: number }) =>
    api.get('/league/matches', { params }),
  upsertPrediction: (match_id: string, pred_home: number, pred_away: number) =>
    api.post('/league/predictions', { match_id, pred_home, pred_away }),
  myPredictions: () => api.get('/league/predictions/my'),
  leaderboard: (competition?: string) =>
    api.get('/league/leaderboard', { params: competition ? { competition } : undefined }),
  competitions: () => api.get('/league/competitions'),

  // admin
  adminMatches: (params?: { competition?: string; matchweek?: number }) =>
    api.get('/admin/league/matches', { params }),
  createMatch: (data: {
    competition: string; matchweek: number;
    home_team: string; away_team: string;
    home_flag?: string; away_flag?: string; kickoff_utc?: string;
  }) => api.post('/admin/league/matches', data),
  updateMatch: (id: string, data: {
    competition: string; matchweek: number;
    home_team: string; away_team: string;
    home_flag?: string; away_flag?: string; kickoff_utc?: string;
  }) => api.patch(`/admin/league/matches/${id}`, data),
  setScore: (id: string, home_score: number, away_score: number) =>
    api.post(`/admin/league/matches/${id}/score`, { home_score, away_score }),
  deleteMatch: (id: string) => api.delete(`/admin/league/matches/${id}`),
};
