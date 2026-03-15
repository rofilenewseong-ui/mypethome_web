'use client';

import { useEffect } from 'react';
import { initAnalytics, identify, track } from '@/lib/analytics';
import { useAuthStore } from '@/stores/useAuthStore';
import { usePageView } from '@/hooks/usePageView';

export default function AnalyticsProvider() {
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    initAnalytics();

    // Track app open
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const returnUser = !!localStorage.getItem('petholo_user');
    track('app_open', { isStandalone, returnUser });
  }, []);

  useEffect(() => {
    if (user?.id) {
      identify(user.id);
    }
  }, [user?.id]);

  usePageView();

  return null;
}
