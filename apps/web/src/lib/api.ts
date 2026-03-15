import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: JWT 토큰 자동 첨부
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor: 5xx/네트워크 에러 재시도 + 401 토큰 갱신
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    // 5xx 또는 네트워크 에러 → 최대 3회 재시도 (exponential backoff)
    if ((!status || status >= 500) && !originalRequest._retryCount) {
      originalRequest._retryCount = 0;
    }
    if ((!status || status >= 500) && originalRequest._retryCount < 3) {
      originalRequest._retryCount += 1;
      const delay = Math.pow(2, originalRequest._retryCount - 1) * 1000; // 1s, 2s, 4s
      await new Promise((r) => setTimeout(r, delay));
      return api(originalRequest);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // 백그라운드 요청 (analytics 등)은 401 시 토큰 갱신/리다이렉트 안 함
      const url = originalRequest.url || '';
      if (url.includes('/analytics/')) {
        return Promise.reject(error);
      }

      const refreshToken = localStorage.getItem('refreshToken');

      // refreshToken이 없으면 세션 자체가 없으므로 갱신 시도 불필요
      if (!refreshToken) {
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
        localStorage.setItem('accessToken', data.data.accessToken);
        if (data.data.refreshToken) {
          localStorage.setItem('refreshToken', data.data.refreshToken);
        }
        originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return api(originalRequest);
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('petholo_user');
        // 리다이렉트는 컴포넌트 레벨에서 처리 (무한 루프 방지)
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/cafe24/auth')) {
          window.location.href = '/cafe24/auth';
        }
      }
    }
    return Promise.reject(error);
  }
);

// ============================================
// API Functions
// ============================================

// Auth
export const authApi = {
  register: (data: { email: string; password: string; name: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  googleAuth: (idToken: string) =>
    api.post('/auth/google', { idToken }),
  refresh: () => api.post('/auth/refresh'),
  logout: () => api.post('/auth/logout'),
  devLogin: () => api.post('/auth/dev-login'),
  getMe: () => api.get('/auth/me'),
  cafe24AuthUrl: () => api.get('/auth/cafe24/url'),
  cafe24Auth: (code: string) => api.post('/auth/cafe24', { code }),
};

// Pets
export const petsApi = {
  list: () => api.get('/pets'),
  create: (data: FormData) => api.post('/pets', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  get: (id: string) => api.get(`/pets/${id}`),
  update: (id: string, data: Record<string, unknown>) => api.put(`/pets/${id}`, data),
  delete: (id: string) => api.delete(`/pets/${id}`),
};

// Profiles
export const profilesApi = {
  listAll: () => api.get('/profiles'),
  list: (petId: string) => api.get(`/profiles?petId=${petId}`),
  create: (data: Record<string, unknown>) => api.post('/profiles', data),
  get: (id: string) => api.get(`/profiles/${id}`),
  update: (id: string, data: Record<string, unknown>) => api.put(`/profiles/${id}`, data),
};

// Base Videos (프로필별 베이스 영상)
export const baseVideosApi = {
  list: (profileId: string) => api.get(`/profiles/${profileId}/base-videos`),
  add: (profileId: string, data: Record<string, unknown>) =>
    api.post(`/profiles/${profileId}/base-videos`, data),
  activate: (profileId: string, videoId: string) =>
    api.put(`/profiles/${profileId}/base-videos/${videoId}/activate`),
  delete: (profileId: string, videoId: string) =>
    api.delete(`/profiles/${profileId}/base-videos/${videoId}`),
};

// Motions (프로필별 모션)
export const motionsApi = {
  list: (profileId: string) => api.get(`/profiles/${profileId}/motions`),
  create: (profileId: string, data: Record<string, unknown>) =>
    api.post(`/profiles/${profileId}/motions`, data),
  assign: (profileId: string, motionId: string, data: { position: string }) =>
    api.put(`/profiles/${profileId}/motions/${motionId}/assign`, data),
  delete: (profileId: string, motionId: string) =>
    api.delete(`/profiles/${profileId}/motions/${motionId}`),
};

// AI - 스타트 프레임 & Kling 영상
export const aiApi = {
  /**
   * 스타트 프레임 생성 (Gemini)
   * ref1: 얼굴(faceImage), ref2: 전신(bodyImage), ref3: 옷(outfitImage, 선택)
   */
  generateStartFrame: (data: {
    profileId: string;
    faceImage: string;      // base64
    bodyImage: string;       // base64
    outfitImage?: string;    // base64 (선택)
    mimeType?: string;
  }) => api.post('/ai/startframe/generate', {
    profileId: data.profileId,
    imageData: {
      faceImage: data.faceImage,
      bodyImage: data.bodyImage,
      outfitImage: data.outfitImage,
      mimeType: data.mimeType || 'image/jpeg',
    },
  }),

  /**
   * 스타트 프레임 재생성 (NanoBanana 2)
   * 최초 1회 무료, 이후 10C/회
   */
  regenerateStartFrame: (data: {
    jobId: string;
    faceImage: string;
    bodyImage: string;
    outfitImage?: string;
    mimeType?: string;
  }) => api.post('/ai/startframe/regenerate', {
    jobId: data.jobId,
    imageData: {
      faceImage: data.faceImage,
      bodyImage: data.bodyImage,
      outfitImage: data.outfitImage,
      mimeType: data.mimeType || 'image/jpeg',
    },
  }),

  /**
   * 생성된 스타트 프레임 중 하나 선택
   */
  selectStartFrame: (jobId: string, selectedIndex: number) =>
    api.post('/ai/startframe/select', { jobId, selectedIndex }),

  /**
   * Kling 베이스 영상 생성 (Image to Video)
   */
  generateVideo: (data: { profileId: string; baseVideoId: string; imageUrl: string }) =>
    api.post('/ai/kling/generate', data),

  /**
   * 작업 상태 조회 (스타트 프레임 / Kling 영상)
   */
  getJobStatus: (jobId: string) => api.get(`/ai/jobs/${jobId}/status`),
};

// Credits
export const creditsApi = {
  balance: () => api.get('/credits/balance'),
  history: () => api.get('/credits/history'),
  redeemCode: (code: string) => api.post('/credits/redeem', { code }),
};

// Messenger
export const messengerApi = {
  getRooms: () => api.get('/messenger/rooms'),
  getMessages: (petId: string) => api.get(`/messenger/rooms/${petId}/messages`),
  sendMessage: (petId: string, content: string) =>
    api.post(`/messenger/rooms/${petId}/messages`, { content }),
};

// Trash
export const trashApi = {
  list: () => api.get('/trash'),
  restore: (itemId: string) => api.post(`/trash/${itemId}/restore`),
  permanentDelete: (itemId: string) => api.delete(`/trash/${itemId}`),
};

// Admin
export const adminApi = {
  dashboard: () => api.get('/admin/dashboard'),
  users: (page = 1) => api.get(`/admin/users?page=${page}`),
  getUser: (id: string) => api.get(`/admin/users/${id}`),
  updateUser: (id: string, data: Record<string, unknown>) => api.put(`/admin/users/${id}`, data),
  logs: (page = 1) => api.get(`/admin/logs?page=${page}`),
};

// Analytics (Admin)
export const analyticsApi = {
  dashboard: () => api.get('/analytics/dashboard'),
  events: (params?: Record<string, string | number>) =>
    api.get('/analytics/events', { params }),
  playback: (params?: Record<string, string | number>) =>
    api.get('/analytics/playback', { params }),
  userAnalytics: (userId: string) => api.get(`/analytics/users/${userId}`),
  messenger: () => api.get('/analytics/messenger'),
  pets: () => api.get('/analytics/pets'),
};
