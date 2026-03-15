'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { track } from '@/lib/analytics';

export function usePageView() {
  const pathname = usePathname();
  const enteredAt = useRef<number>(Date.now());
  const prevPath = useRef<string>('');

  useEffect(() => {
    // Track duration for previous page
    if (prevPath.current && prevPath.current !== pathname) {
      const duration = Math.round((Date.now() - enteredAt.current) / 1000);
      track('page_view', {
        path: prevPath.current,
        referrer: document.referrer,
        duration,
      });
    }

    // Reset for new page
    prevPath.current = pathname;
    enteredAt.current = Date.now();

    // Track current page view immediately
    track('page_view', {
      path: pathname,
      referrer: document.referrer,
      duration: 0,
    });
  }, [pathname]);

  // Track duration on unmount
  useEffect(() => {
    return () => {
      if (prevPath.current) {
        const duration = Math.round((Date.now() - enteredAt.current) / 1000);
        track('page_view', {
          path: prevPath.current,
          referrer: '',
          duration,
        });
      }
    };
  }, []);
}
