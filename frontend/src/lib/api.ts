import axios from 'axios';
import Cookies from 'js-cookie';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = Cookies.get('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      Cookies.remove('access_token');
      if (typeof window !== 'undefined') window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth
export const authApi = {
  register: (data: { username: string; email: string; password: string; display_name: string }) =>
    api.post('/auth/register', data),
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
};

// Sets
export const setsApi = {
  list: (params?: { q?: string; theme?: string; year?: number; page?: number; size?: number }) =>
    api.get('/sets', { params }),
  get: (id: string) => api.get(`/sets/${id}`),
  themes: () => api.get('/sets/themes'),
};

// Collection
export const collectionApi = {
  list: (params?: { status?: string; page?: number }) =>
    api.get('/collection', { params }),
  add: (data: { set_id?: string; minifig_id?: string; status: string; quantity?: number; condition?: string; is_sealed?: boolean }) =>
    api.post('/collection', data),
  update: (id: string, data: Partial<{ status: string; quantity: number; condition: string; notes: string; is_sealed: boolean; is_complete: boolean }>) =>
    api.put(`/collection/${id}`, data),
  remove: (id: string) => api.delete(`/collection/${id}`),
  stats: () => api.get('/collection/stats'),
};

// Wishlist
export const wishlistApi = {
  list: () => api.get('/wishlist'),
  add: (setId: string) => api.post('/wishlist', { set_id: setId }),
  remove: (id: string) => api.delete(`/wishlist/${id}`),
};

// MOCs
export const mocsApi = {
  list: (params?: { page?: number; theme?: string }) => api.get('/mocs', { params }),
  get: (id: string) => api.get(`/mocs/${id}`),
  create: (data: FormData) => api.post('/mocs', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  like: (id: string) => api.post(`/mocs/${id}/like`),
  unlike: (id: string) => api.delete(`/mocs/${id}/like`),
};

// Leaderboard
export const leaderboardApi = {
  global: (category?: string) => api.get('/leaderboard', { params: { category } }),
};

// Users
export const usersApi = {
  profile: (username: string) => api.get(`/users/${username}`),
  achievements: (username: string) => api.get(`/users/${username}/achievements`),
  myAchievements: () => api.get('/users/me/achievements'),
  updateProfile: (data: Partial<{ display_name: string; bio: string; is_public: boolean }>) =>
    api.put('/users/me', data),
};
