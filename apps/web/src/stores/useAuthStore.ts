import { create } from 'zustand';
import { authApi, creditsApi } from '@/lib/api';
import { track } from '@/lib/analytics';

interface User {
  id: string;
  email?: string;
  name?: string;
  isVerified: boolean;
  credits: number;
  role: 'user' | 'admin' | 'USER' | 'ADMIN';
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  updateCredits: (credits: number) => void;
  refreshCredits: () => Promise<void>;
  loginWithToken: (accessToken: string, user: Record<string, unknown>, refreshToken?: string) => void;
  logout: () => void;
  hydrate: () => void;
}

const STORAGE_KEY = 'petholo_user';

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) => {
    if (typeof window !== 'undefined') {
      if (user) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    set({
      user,
      isAuthenticated: !!user,
      isLoading: false,
    });
  },

  loginWithToken: (accessToken, userData, refreshToken) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', accessToken);
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }
    }
    const user: User = {
      id: userData.id as string,
      email: userData.email as string,
      name: userData.name as string || (userData.email as string)?.split('@')[0],
      isVerified: (userData.isVerified as boolean) || false,
      credits: (userData.credits as number) || 0,
      role: (userData.role as string || 'user').toLowerCase() as 'user' | 'admin',
    };
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    }
    set({ user, isAuthenticated: true, isLoading: false });
  },

  setLoading: (isLoading) => set({ isLoading }),

  updateCredits: (credits) => set((state) => {
    const updatedUser = state.user ? { ...state.user, credits } : null;
    if (typeof window !== 'undefined' && updatedUser) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));
    }
    return { user: updatedUser };
  }),

  refreshCredits: async () => {
    try {
      const { data } = await creditsApi.balance();
      const credits = data?.data?.credits ?? data?.credits;
      if (typeof credits === 'number') {
        set((state) => {
          const updatedUser = state.user ? { ...state.user, credits } : null;
          if (typeof window !== 'undefined' && updatedUser) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));
          }
          return { user: updatedUser };
        });
      }
    } catch {
      // 실패 시 무시 (백그라운드 동기화)
    }
  },

  logout: () => {
    track('logout', {});
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem(STORAGE_KEY);
    }
    authApi.logout().catch(() => {});
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  hydrate: () => {
    if (typeof window !== 'undefined') {
      try {
        const token = localStorage.getItem('accessToken');
        const stored = localStorage.getItem(STORAGE_KEY);

        if (token && stored) {
          const user = JSON.parse(stored) as User;
          set({ user, isAuthenticated: true, isLoading: false });
          // 백그라운드에서 서버 검증
          authApi.getMe().then(({ data }) => {
            if (data?.data) {
              const fresh: User = {
                id: data.data.id,
                email: data.data.email,
                name: data.data.name,
                isVerified: data.data.isVerified,
                credits: data.data.credits,
                role: (data.data.role || 'user').toLowerCase() as 'user' | 'admin',
              };
              localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
              set({ user: fresh });
            }
          }).catch(() => {
            // 토큰 만료 시 — refresh interceptor가 처리
          });
          return;
        }

        // 데모 모드: 토큰 없이 user 데이터만 있는 경우
        if (stored && !token) {
          const user = JSON.parse(stored) as User;
          if (user.id.startsWith('demo-')) {
            set({ user, isAuthenticated: true, isLoading: false });
            return;
          }
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem('accessToken');
      }
    }
    set({ isLoading: false });
  },
}));
