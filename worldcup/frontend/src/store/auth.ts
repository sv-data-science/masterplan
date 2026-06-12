import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import Cookies from 'js-cookie';
import { User } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setUser: (user) => set({ user }),
      setToken: (token) => {
        Cookies.set('wc_access_token', token, { expires: 7, sameSite: 'strict' });
        set({ token });
      },
      logout: () => {
        Cookies.remove('wc_access_token');
        set({ user: null, token: null });
      },
    }),
    { name: 'wc-auth-storage', partialize: (s) => ({ token: s.token }) }
  )
);
