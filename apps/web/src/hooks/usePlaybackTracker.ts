'use client';

import { useEffect, useRef, useCallback } from 'react';
import { track, startPlaybackSession, endPlaybackSession } from '@/lib/analytics';

interface MotionDetail {
  position: 'LEFT' | 'RIGHT';
  motionId: string;
  timestamp: string;
}

export function usePlaybackTracker(profileId: string, petId: string) {
  const sessionIdRef = useRef<string | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const motionTapsRef = useRef<number>(0);
  const motionLocksRef = useRef<number>(0);
  const motionDetailsRef = useRef<MotionDetail[]>([]);

  // Start playback session
  useEffect(() => {
    if (!profileId) return;

    const start = async () => {
      startTimeRef.current = Date.now();
      sessionIdRef.current = await startPlaybackSession(profileId, petId);
      track('player_open', { profileId });
    };
    start();

    const handleBeforeUnload = () => {
      endSession();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      endSession();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId, petId]);

  const endSession = useCallback(() => {
    if (!sessionIdRef.current) return;
    const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
    track('player_close', { profileId, watchDuration: duration });
    endPlaybackSession(sessionIdRef.current, {
      duration,
      motionTaps: motionTapsRef.current,
      motionLocks: motionLocksRef.current,
      motionDetails: motionDetailsRef.current,
    });
    sessionIdRef.current = null;
  }, [profileId]);

  const trackMotionTap = useCallback((position: 'LEFT' | 'RIGHT', motionId: string) => {
    motionTapsRef.current++;
    motionDetailsRef.current.push({
      position,
      motionId,
      timestamp: new Date().toISOString(),
    });
    track('motion_tap', { profileId, position, motionId });
  }, [profileId]);

  const trackMotionLock = useCallback((position: 'LEFT' | 'RIGHT', locked: boolean) => {
    if (locked) motionLocksRef.current++;
    track('motion_lock', { profileId, position, locked });
  }, [profileId]);

  const trackVideoError = useCallback((errorMessage: string) => {
    track('video_error', { profileId, errorMessage });
  }, [profileId]);

  return {
    trackMotionTap,
    trackMotionLock,
    trackVideoError,
  };
}
