'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';

export function useCreditsSync() {
  const refreshCredits = useAuthStore((s) => s.refreshCredits);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) return;

    const handleFocus = () => refreshCredits();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') refreshCredits();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isAuthenticated, refreshCredits]);
}
