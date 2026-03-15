import { api } from './api';

// ─── Session Management ─────────────────────────
function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  let sid = sessionStorage.getItem('analytics_sid');
  if (!sid) {
    // crypto.randomUUID()는 Secure Context(HTTPS)에서만 사용 가능 → HTTP 폴백
    try {
      sid = crypto.randomUUID();
    } catch {
      sid = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    }
    sessionStorage.setItem('analytics_sid', sid);
  }
  return sid;
}

function getDeviceInfo() {
  if (typeof window === 'undefined') {
    return { platform: '', userAgent: '', screenWidth: 0, screenHeight: 0, isStandalone: false };
  }
  return {
    platform: navigator.platform || '',
    userAgent: navigator.userAgent || '',
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    isStandalone: window.matchMedia('(display-mode: standalone)').matches,
  };
}

// ─── Event Queue & Batching ─────────────────────
interface QueuedEvent {
  event: string;
  properties: Record<string, unknown>;
  page: string;
  sessionId: string;
  deviceInfo: ReturnType<typeof getDeviceInfo>;
  timestamp: string;
}

const BATCH_SIZE = 5;
const FLUSH_INTERVAL = 10000; // 10 seconds
const STORAGE_KEY = 'analytics_queue';

let eventQueue: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;
let userId: string | null = null;

function loadOfflineQueue() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as QueuedEvent[];
      eventQueue = [...parsed, ...eventQueue];
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch { /* ignore */ }
}

function saveOfflineQueue() {
  try {
    if (eventQueue.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(eventQueue));
    }
  } catch { /* ignore */ }
}

async function flush() {
  if (eventQueue.length === 0) return;

  // 인증되지 않은 상태에서는 flush 하지 않음 (401 루프 방지)
  if (typeof window !== 'undefined' && !localStorage.getItem('accessToken')) {
    saveOfflineQueue();
    return;
  }

  const batch = eventQueue.splice(0, 50);
  try {
    await api.post('/analytics/events/batch', { events: batch });
  } catch {
    // Put back on failure and save to localStorage
    eventQueue = [...batch, ...eventQueue];
    saveOfflineQueue();
  }
}

function startFlushTimer() {
  if (flushTimer) return;
  flushTimer = setInterval(() => {
    flush();
  }, FLUSH_INTERVAL);
}

// ─── Public API ─────────────────────────────────
export function identify(id: string) {
  userId = id;
}

export function track(event: string, properties: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return;

  const queuedEvent: QueuedEvent = {
    event,
    properties,
    page: window.location.pathname,
    sessionId: getSessionId(),
    deviceInfo: getDeviceInfo(),
    timestamp: new Date().toISOString(),
  };

  eventQueue.push(queuedEvent);

  if (eventQueue.length >= BATCH_SIZE) {
    flush();
  }
}

export function initAnalytics() {
  if (typeof window === 'undefined') return;

  loadOfflineQueue();
  startFlushTimer();

  // Flush on page visibility change (tab switch, minimize)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flush();
      saveOfflineQueue();
    }
  });

  // Flush on beforeunload
  window.addEventListener('beforeunload', () => {
    flush();
    saveOfflineQueue();
  });

  // Flush when coming back online
  window.addEventListener('online', () => {
    loadOfflineQueue();
    flush();
  });
}

export function cleanupAnalytics() {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  flush();
}

// ─── Playback Session Helpers ───────────────────
export async function startPlaybackSession(
  profileId: string,
  petId: string
): Promise<string | null> {
  try {
    const deviceInfo = getDeviceInfo();
    const { data } = await api.post('/analytics/playback/start', {
      profileId,
      petId,
      deviceInfo: {
        platform: deviceInfo.platform,
        screenWidth: deviceInfo.screenWidth,
        screenHeight: deviceInfo.screenHeight,
      },
    });
    return data?.data?.sessionId || null;
  } catch {
    return null;
  }
}

export async function endPlaybackSession(
  sessionId: string,
  data: {
    duration: number;
    motionTaps: number;
    motionLocks: number;
    motionDetails: Array<{ position: 'LEFT' | 'RIGHT'; motionId: string; timestamp: string }>;
  }
) {
  try {
    await api.put(`/analytics/playback/${sessionId}/end`, data);
  } catch { /* ignore */ }
}
