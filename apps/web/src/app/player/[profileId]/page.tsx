'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { profilesApi } from '@/lib/api';
import { usePlaybackTracker } from '@/hooks/usePlaybackTracker';

type MotionState = 'idle' | 'playing' | 'locked';

interface ProfileData {
  id: string;
  name: string;
  pet?: { name: string; breed?: string };
  baseVideos: Array<{
    id: string;
    isActive: boolean;
    status: string;
    videoUrl: string | null;
    gifUrl: string | null;
  }>;
  motions: Array<{
    id: string;
    name: string;
    videoUrl: string | null;
    position: 'LEFT' | 'RIGHT' | 'NONE';
    status: string;
  }>;
}

export default function HologramPlayerPage() {
  const params = useParams();
  const router = useRouter();
  const profileId = params.profileId as string;

  const [leftState, setLeftState] = useState<MotionState>('idle');
  const [rightState, setRightState] = useState<MotionState>('idle');
  const [showControls, setShowControls] = useState(true);
  const [isPressing, setIsPressing] = useState<'left' | 'right' | null>(null);
  const [pressProgress, setPressProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [centerFlash, setCenterFlash] = useState<{
    direction: 'left' | 'right';
    mode: 'lock' | 'unlock';
  } | null>(null);
  const [rainbowBorder, setRainbowBorder] = useState(false);

  const [showEntryOverlay, setShowEntryOverlay] = useState(true);
  const [forceLandscape, setForceLandscape] = useState(false);
  const [videoScale, setVideoScale] = useState<100 | 66>(100);
  const [tiltActive, setTiltActive] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [loading, setLoading] = useState(true);
  const baseVideoRef = useRef<HTMLVideoElement>(null);
  const motionVideoRef = useRef<HTMLVideoElement>(null);

  const pressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const controlsTimerRef = useRef<NodeJS.Timeout | null>(null);
  const motionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const centerFlashTimerRef = useRef<NodeJS.Timeout | null>(null);
  const rainbowBorderTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [profile, setProfile] = useState<ProfileData | null>(null);

  const isSample =
    profileId === 'sample' ||
    profileId === 'sample-dog' ||
    profileId === 'sample-cat';
  const demoPetName =
    profileId === 'sample-dog'
      ? '멍이'
      : profileId === 'sample-cat'
        ? '냥이'
        : isSample
          ? '샘플'
          : '나비';

  // ★ 서버 경로 → 절대 URL 변환
  const resolveMediaUrl = useCallback((url: string) => {
    if (!url) return '';
    if (
      url.startsWith('http://') ||
      url.startsWith('https://') ||
      url.startsWith('data:') ||
      url.startsWith('blob:')
    )
      return url;
    const apiOrigin = (
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'
    ).replace(/\/api\/?$/, '');
    return `${apiOrigin}${url.startsWith('/') ? url : `/${url}`}`;
  }, []);

  const { trackMotionTap, trackMotionLock, trackVideoError } =
    usePlaybackTracker(profileId, profile?.pet?.name || '');

  useEffect(() => {
    if (isSample) {
      setLoading(false);
      return;
    }
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await profilesApi.get(profileId);
        const data = res.data?.data || res.data;
        setProfile(data);
      } catch {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [profileId, isSample]);

  const petName = profile?.pet?.name || demoPetName;

  const activeBaseVideo = profile?.baseVideos?.find(
    (v) => v.isActive && v.status === 'COMPLETED' && v.videoUrl,
  );
  // 샘플 모드: 영상 파일 없이 CSS 홀로그램 효과로 표시
  const baseVideoUrl = isSample
    ? ''
    : resolveMediaUrl(activeBaseVideo?.videoUrl || '');

  const leftMotion = profile?.motions?.find(
    (m) => m.position === 'LEFT' && m.status === 'COMPLETED' && m.videoUrl,
  );
  const rightMotion = profile?.motions?.find(
    (m) => m.position === 'RIGHT' && m.status === 'COMPLETED' && m.videoUrl,
  );
  const leftMotionUrl = resolveMediaUrl(leftMotion?.videoUrl || '');
  const rightMotionUrl = resolveMediaUrl(rightMotion?.videoUrl || '');

  // 진동 피드백
  const vibrate = useCallback((pattern: number | number[]) => {
    try {
      if (navigator?.vibrate) navigator.vibrate(pattern);
    } catch {
      /* 미지원 */
    }
  }, []);

  /* ============ 전체화면 진입 ============ */
  const handleEnterPlayer = useCallback(async () => {
    const video = baseVideoRef.current;
    const container = containerRef.current;

    // 1) Fullscreen API (Android Chrome + 일부 최신 iOS 16.4+)
    let fsOk = false;
    if (container) {
      try {
        if (container.requestFullscreen) {
          await container.requestFullscreen();
          fsOk = true;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } else if ((container as any).webkitRequestFullscreen) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (container as any).webkitRequestFullscreen();
          fsOk = true;
        }
      } catch {
        /* 지원 안 됨 */
      }
    }

    // 2) 가로 방향 잠금 (Android fullscreen에서만 동작)
    if (fsOk) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const so = screen.orientation as any;
        if (so?.lock) await so.lock('landscape');
      } catch {
        /* iOS 등 미지원 */
      }
    }

    // 3) Fullscreen API 미지원 (iOS Safari) → CSS 회전으로 가로 시뮬레이션
    if (!fsOk) {
      const isPortrait = window.innerHeight > window.innerWidth;
      if (isPortrait) {
        setForceLandscape(true);
      }
    }

    // 4) 오버레이 제거 + 영상 재생
    setShowEntryOverlay(false);
    if (video) video.play().catch(() => {});
  }, []);

  /* ============ 기울기 연속 감지: 뒤집으면 재생, 세우면 정지 ============ */
  useEffect(() => {
    let orientationHandler: ((e: DeviceOrientationEvent) => void) | null = null;
    let permissionGranted = false;

    const startTiltDetection = () => {
      orientationHandler = (e: DeviceOrientationEvent) => {
        const beta = e.beta ?? 0;
        const isFlipped = beta < -30 || beta > 120;

        if (isFlipped && !tiltActive) {
          setTiltActive(true);
          setShowEntryOverlay(false);
          // 영상 재생
          if (baseVideoRef.current) {
            baseVideoRef.current.play().catch(() => {});
          }
        } else if (!isFlipped && tiltActive) {
          setTiltActive(false);
          setShowEntryOverlay(true);
          // 영상 일시정지
          if (baseVideoRef.current) {
            baseVideoRef.current.pause();
          }
          if (motionVideoRef.current) {
            motionVideoRef.current.pause();
            motionVideoRef.current.style.display = 'none';
          }
        }
      };
      window.addEventListener('deviceorientation', orientationHandler);
    };

    // iOS 권한 처리
    const tryStart = async () => {
      if (typeof (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission === 'function') {
        // iOS: EntryOverlay에서 권한 요청 후 시작됨
        // 이미 권한이 있는지 확인 위해 임시 리스너
        const testHandler = () => { permissionGranted = true; startTiltDetection(); window.removeEventListener('deviceorientation', testHandler); };
        window.addEventListener('deviceorientation', testHandler);
        setTimeout(() => { if (!permissionGranted) window.removeEventListener('deviceorientation', testHandler); }, 500);
      } else {
        startTiltDetection();
      }
    };

    tryStart();

    return () => {
      if (orientationHandler) window.removeEventListener('deviceorientation', orientationHandler);
    };
  }, [tiltActive]);

  // iOS: 사용자가 직접 가로로 돌리면 CSS 회전 해제
  useEffect(() => {
    if (!forceLandscape) return;
    const handleResize = () => {
      const isPortrait = window.innerHeight > window.innerWidth;
      if (!isPortrait) setForceLandscape(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [forceLandscape]);

  // cleanup: 페이지 떠날 때 fullscreen/orientation 해제
  useEffect(() => {
    return () => {
      if (document.fullscreenElement)
        document.exitFullscreen().catch(() => {});
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const so = screen.orientation as any;
        if (so?.unlock) so.unlock();
      } catch {
        /* */
      }
    };
  }, []);

  useEffect(() => {
    resetControlsTimer();
    return () => {
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
      if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      if (motionTimerRef.current) clearTimeout(motionTimerRef.current);
      if (centerFlashTimerRef.current)
        clearTimeout(centerFlashTimerRef.current);
      if (rainbowBorderTimerRef.current)
        clearTimeout(rainbowBorderTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (baseVideoRef.current && baseVideoUrl) {
      baseVideoRef.current.play().catch(() => {});
    }
  }, [baseVideoUrl, videoLoaded]);

  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(
      () => setShowControls(false),
      3000,
    );
  }, []);

  const handleScreenTap = () => resetControlsTimer();

  const triggerCenterFlash = useCallback(
    (direction: 'left' | 'right', mode: 'lock' | 'unlock') => {
      setCenterFlash({ direction, mode });
      if (centerFlashTimerRef.current)
        clearTimeout(centerFlashTimerRef.current);
      centerFlashTimerRef.current = setTimeout(
        () => setCenterFlash(null),
        300,
      );
    },
    [],
  );

  const playMotionVideo = useCallback(
    (
      motionUrl: string,
      direction: 'left' | 'right',
      nextState: MotionState = 'playing',
    ) => {
      if (!motionVideoRef.current || !motionUrl) return;
      motionVideoRef.current.src = motionUrl;
      motionVideoRef.current.load();
      motionVideoRef.current.play().catch(() => {});
      motionVideoRef.current.style.display = 'block';
      if (baseVideoRef.current) baseVideoRef.current.style.opacity = '0';

      const setState = direction === 'left' ? setLeftState : setRightState;
      setState(nextState);

      motionVideoRef.current.onended = () => {
        if (nextState === 'locked') {
          motionVideoRef.current?.play().catch(() => {});
        } else {
          if (motionVideoRef.current)
            motionVideoRef.current.style.display = 'none';
          if (baseVideoRef.current)
            baseVideoRef.current.style.opacity = '1';
          setState('idle');
          setStatusText('');
        }
      };
    },
    [],
  );

  const handleMotionTap = (direction: 'left' | 'right') => {
    resetControlsTimer();
    const currentState = direction === 'left' ? leftState : rightState;
    if (currentState === 'locked') return;

    vibrate(30);

    const setState = direction === 'left' ? setLeftState : setRightState;
    const motionUrl = direction === 'left' ? leftMotionUrl : rightMotionUrl;
    const motion = direction === 'left' ? leftMotion : rightMotion;
    trackMotionTap(direction === 'left' ? 'LEFT' : 'RIGHT', motion?.id || '');

    if (motionUrl && motionVideoRef.current) {
      playMotionVideo(motionUrl, direction);
      setStatusText(
        `${direction === 'left' ? '왼쪽' : '오른쪽'} 모션 재생 중`,
      );
    } else {
      setState('playing');
      setStatusText(
        `${direction === 'left' ? '왼쪽' : '오른쪽'} 모션 재생 중`,
      );
      if (motionTimerRef.current) clearTimeout(motionTimerRef.current);
      motionTimerRef.current = setTimeout(() => {
        setState('idle');
        setStatusText('');
      }, 3000);
    }
  };

  const handlePressStart = useCallback(
    (direction: 'left' | 'right') => {
      resetControlsTimer();
      setIsPressing(direction);
      setPressProgress(0);

      setRainbowBorder(true);
      if (rainbowBorderTimerRef.current)
        clearTimeout(rainbowBorderTimerRef.current);
      rainbowBorderTimerRef.current = setTimeout(
        () => setRainbowBorder(false),
        300,
      );

      let progress = 0;
      progressTimerRef.current = setInterval(() => {
        progress += 100 / 15;
        setPressProgress(Math.min(progress, 100));
      }, 100);

      pressTimerRef.current = setTimeout(() => {
        const currentState =
          direction === 'left' ? leftState : rightState;
        const setState =
          direction === 'left' ? setLeftState : setRightState;

        vibrate([50, 30, 50]);
        triggerCenterFlash(
          direction,
          currentState === 'locked' ? 'unlock' : 'lock',
        );

        if (currentState === 'locked') {
          setState('idle');
          setStatusText('반복재생 해제');
          trackMotionLock(
            direction === 'left' ? 'LEFT' : 'RIGHT',
            false,
          );
          if (motionVideoRef.current) {
            motionVideoRef.current.loop = false;
            motionVideoRef.current.pause();
            motionVideoRef.current.currentTime = 0;
            motionVideoRef.current.style.display = 'none';
          }
          if (baseVideoRef.current)
            baseVideoRef.current.style.opacity = '1';
          if (motionTimerRef.current) clearTimeout(motionTimerRef.current);
          motionTimerRef.current = setTimeout(
            () => setStatusText(''),
            1000,
          );
        } else {
          setState('locked');
          setStatusText('🔒 반복재생 잠금');
          trackMotionLock(
            direction === 'left' ? 'LEFT' : 'RIGHT',
            true,
          );
          const motionUrl =
            direction === 'left' ? leftMotionUrl : rightMotionUrl;
          if (motionUrl && motionVideoRef.current) {
            motionVideoRef.current.loop = true;
            playMotionVideo(motionUrl, direction, 'locked');
          }
        }

        setIsPressing(null);
        setPressProgress(0);
        setRainbowBorder(false);
        if (progressTimerRef.current)
          clearInterval(progressTimerRef.current);
        if (rainbowBorderTimerRef.current)
          clearTimeout(rainbowBorderTimerRef.current);
      }, 1500);
    },
    [
      leftMotionUrl,
      leftState,
      playMotionVideo,
      resetControlsTimer,
      rightMotionUrl,
      rightState,
      trackMotionLock,
      triggerCenterFlash,
      vibrate,
    ],
  );

  const handlePressEnd = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    if (rainbowBorderTimerRef.current) {
      clearTimeout(rainbowBorderTimerRef.current);
      rainbowBorderTimerRef.current = null;
    }
    setIsPressing(null);
    setPressProgress(0);
    setRainbowBorder(false);
  };

  const hasVideo = !!baseVideoUrl;
  const isAnyLocked = leftState === 'locked' || rightState === 'locked';
  const centerFlashGradient =
    centerFlash?.direction === 'left'
      ? 'linear-gradient(120deg, rgba(255,106,136,0.9) 0%, rgba(255,190,92,0.92) 22%, rgba(255,237,120,0.88) 38%, rgba(96,230,180,0.9) 58%, rgba(99,174,255,0.92) 78%, rgba(196,120,255,0.9) 100%)'
      : 'linear-gradient(240deg, rgba(255,106,136,0.9) 0%, rgba(255,190,92,0.92) 22%, rgba(255,237,120,0.88) 38%, rgba(96,230,180,0.9) 58%, rgba(99,174,255,0.92) 78%, rgba(196,120,255,0.9) 100%)';

  /* ============ 컨테이너 스타일 (전체화면 + CSS 가로 회전 폴백) ============ */
  const containerStyle: React.CSSProperties = forceLandscape
    ? {
        position: 'fixed',
        top: '50%',
        left: '50%',
        width: '100vh',
        height: '100vw',
        transform: 'translate(-50%, -50%) rotate(90deg)',
        zIndex: 99999,
        touchAction: 'none',
      }
    : {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        touchAction: 'none',
      };

  const handleExit = (e: React.MouseEvent) => {
    e.stopPropagation();
    // fullscreen 해제
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    // CSS 회전 해제
    setForceLandscape(false);
    // orientation 잠금 해제
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const so = screen.orientation as any;
      if (so?.unlock) so.unlock();
    } catch {
      /* */
    }
    router.back();
  };

  return (
    <div
      ref={containerRef}
      data-theme="dark"
      className="bg-black flex select-none"
      style={containerStyle}
      onClick={handleScreenTap}
    >
      {/* 나가기 (조그만 버튼) */}
      <button
        className="absolute top-2 left-2 z-30 w-5 h-5 rounded-full flex items-center justify-center transition-opacity duration-300"
        style={{
          background: 'rgba(255,255,255,0.08)',
          color: 'rgba(255,255,255,0.4)',
          fontSize: '9px',
          opacity: showControls ? 1 : 0,
        }}
        onClick={handleExit}
      >
        ✕
      </button>

      {/* 펫 이름 */}
      <div
        className="absolute top-3 left-1/2 -translate-x-1/2 z-20 text-[9px] font-bold tracking-wider"
        style={{ color: 'rgba(255,255,255,0.06)' }}
      >
        {petName}
      </div>

      {/* 영상 크기 토글 */}
      <button
        className="absolute top-2 right-2 z-30 px-2 py-1 rounded-full text-[9px] font-bold transition-opacity duration-300"
        style={{
          background: 'rgba(255,255,255,0.08)',
          color: 'rgba(255,255,255,0.5)',
          border: '1px solid rgba(255,255,255,0.1)',
          opacity: showControls ? 1 : 0,
        }}
        onClick={(e) => {
          e.stopPropagation();
          setVideoScale(videoScale === 100 ? 66 : 100);
        }}
      >
        {videoScale === 100 ? '66%' : '100%'}
      </button>

      {/* 잠금 배지 */}
      {isAnyLocked && (
        <div
          className="absolute top-3 right-3 z-30 px-3 py-1 rounded-full text-[9px] font-bold tracking-wide animate-pulse-warm"
          style={{
            background: 'rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.5)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          🔒 반복재생 잠금
        </div>
      )}

      {/* 왼쪽 */}
      <MotionZone
        direction="left"
        state={leftState}
        isPressing={isPressing === 'left'}
        pressProgress={pressProgress}
        onTap={() => handleMotionTap('left')}
        onPressStart={() => handlePressStart('left')}
        onPressEnd={handlePressEnd}
        isAnyLocked={isAnyLocked}
      />

      {/* 센터 */}
      <div
        className="flex-[1.3] relative flex items-center justify-center overflow-hidden"
        style={{
          borderLeft: '1px solid rgba(255,255,255,0.04)',
          borderRight: '1px solid rgba(255,255,255,0.04)',
        }}
      >
        {/* 롱프레스 중 불투명 플래시 */}
        {isPressing && (
          <div
            className="absolute inset-0 z-[2] pointer-events-none"
            style={{
              background: 'rgba(255,255,255,0.06)',
              opacity: rainbowBorder ? 1 : 0,
              transition: 'opacity 0.3s ease-out',
            }}
          />
        )}

        {/* 잠금/해제 전환 순간 무지개 플래시 */}
        {centerFlash && (
          <>
            <div
              className="absolute inset-0 z-[2] pointer-events-none animate-rainbow-transition-flash"
              style={{
                background: centerFlashGradient,
                backgroundSize: '200% 100%',
                opacity: 0.3,
                mixBlendMode: 'screen',
              }}
            />
            <div className="absolute inset-[10px] z-[3] pointer-events-none animate-rainbow-transition-flash">
              <div
                className="h-full w-full rounded-[26px] p-[2px]"
                style={{
                  background: centerFlashGradient,
                  backgroundSize: '200% 100%',
                  boxShadow:
                    centerFlash.mode === 'lock'
                      ? '0 0 26px rgba(138, 211, 255, 0.22)'
                      : '0 0 22px rgba(255, 204, 120, 0.18)',
                }}
              >
                <div
                  className="h-full w-full rounded-[24px]"
                  style={{
                    background:
                      centerFlash.mode === 'lock'
                        ? 'rgba(255,255,255,0.03)'
                        : 'rgba(255,255,255,0.015)',
                  }}
                />
              </div>
            </div>
          </>
        )}

        {/* 실제 비디오 모드 (API 프로필) */}
        {hasVideo ? (
          <>
            <video
              ref={baseVideoRef}
              src={baseVideoUrl}
              loop
              muted
              playsInline
              autoPlay
              className="absolute object-contain transition-opacity duration-500"
              onLoadedData={() => setVideoLoaded(true)}
              onError={() => {
                setVideoError(true);
                trackVideoError('Video load failed');
              }}
              style={{
                opacity: videoLoaded ? 1 : 0,
                transform: 'scaleX(-1)',
                aspectRatio: '1/1',
                ...(videoScale === 100
                  ? { inset: 0, width: '100%', height: '100%' }
                  : { width: '66%', height: '66%', bottom: 0, left: '50%', marginLeft: '-33%', top: 'auto' }),
              }}
            />
            <video
              ref={motionVideoRef}
              muted
              playsInline
              className="absolute object-contain"
              style={{
                display: 'none',
                zIndex: 1,
                transform: 'scaleX(-1)',
                aspectRatio: '1/1',
                ...(videoScale === 100
                  ? { inset: 0, width: '100%', height: '100%' }
                  : { width: '66%', height: '66%', bottom: 0, left: '50%', marginLeft: '-33%', top: 'auto' }),
              }}
            />
            {!videoLoaded && !videoError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                <p className="text-[10px] text-white/30 mt-3">
                  {petName}의 영상을 준비하고 있습니다
                </p>
              </div>
            )}
          </>
        ) : isSample ? (
          /* ★ 샘플 모드: CSS 홀로그램 애니메이션 (비디오 파일 불필요) */
          <div className="absolute inset-0 flex items-center justify-center">
            {/* 배경 글로우 */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(100,200,255,0.08) 0%, transparent 70%)',
              }}
            />
            {/* 스캔라인 */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(100,200,255,0.03) 2px, rgba(100,200,255,0.03) 4px)',
                animation: 'holo-scan 4s linear infinite',
              }}
            />
            {/* 홀로그램 글로우 펄스 */}
            <div
              className="absolute pointer-events-none"
              style={{
                width: '60%',
                height: '60%',
                borderRadius: '50%',
                background:
                  'radial-gradient(circle, rgba(100,200,255,0.12) 0%, rgba(160,120,255,0.06) 50%, transparent 70%)',
                animation: 'holo-glow-pulse 3s ease-in-out infinite',
              }}
            />
            {/* 펫 이모지 */}
            <div className="relative z-10 flex flex-col items-center">
              <span
                className="text-8xl"
                style={{
                  filter: 'drop-shadow(0 0 30px rgba(100,200,255,0.4))',
                  animation: 'holo-float 3s ease-in-out infinite',
                }}
              >
                {profileId === 'sample-dog' ? '🐕' : '🐈'}
              </span>
              <p
                className="text-xs font-bold mt-4 tracking-wider"
                style={{
                  color: 'rgba(100,200,255,0.5)',
                  textShadow: '0 0 10px rgba(100,200,255,0.3)',
                }}
              >
                {petName}
              </p>
              <p
                className="text-[9px] mt-1"
                style={{ color: 'rgba(255,255,255,0.2)' }}
              >
                홀로그램 샘플 미리보기
              </p>
            </div>
          </div>
        ) : (
          /* 로딩 또는 비디오 없음 */
          <div className="relative">
            {loading ? (
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                <p className="text-[10px] text-white/30 mt-3">
                  {petName}의 영상을 준비하고 있습니다
                </p>
              </div>
            ) : (
              <div
                className="text-8xl"
                style={{
                  filter: 'drop-shadow(0 0 20px rgba(100,200,255,0.3))',
                }}
              >
                🐾
              </div>
            )}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(100,200,255,0.03) 2px, rgba(100,200,255,0.03) 4px)',
              }}
            />
          </div>
        )}

        {!hasVideo && !loading && !isSample && (
          <div
            className="absolute top-3 right-3 px-2 py-0.5 rounded text-[8px] font-bold tracking-wider"
            style={{
              background: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.2)',
            }}
          >
            SAMPLE
          </div>
        )}

        {videoError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
            <p className="text-[11px] text-white/40 mb-2">
              영상을 불러오지 못했습니다
            </p>
            <button
              className="text-[10px] text-white/30 underline"
              onClick={(e) => {
                e.stopPropagation();
                setVideoError(false);
                if (baseVideoRef.current) {
                  baseVideoRef.current.load();
                  baseVideoRef.current.play().catch(() => {});
                }
              }}
            >
              다시 시도
            </button>
          </div>
        )}
      </div>

      {/* 오른쪽 */}
      <MotionZone
        direction="right"
        state={rightState}
        isPressing={isPressing === 'right'}
        pressProgress={pressProgress}
        onTap={() => handleMotionTap('right')}
        onPressStart={() => handlePressStart('right')}
        onPressEnd={handlePressEnd}
        isAnyLocked={isAnyLocked}
      />

      {/* 하단 상태 */}
      <div
        className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 text-[9px] transition-opacity duration-300"
        style={{
          color: 'rgba(255,255,255,0.25)',
          opacity: showControls ? 1 : 0.3,
        }}
      >
        {statusText}
      </div>

      {showControls && !statusText && (
        <div
          className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 text-[8px] transition-opacity duration-300"
          style={{ color: 'rgba(255,255,255,0.15)' }}
        >
          탭: 모션 재생 · 길게 누르기: 반복 잠금
        </div>
      )}

      {/* 어둠 최적화 안내 */}
      {showControls && !isSample && (
        <div
          className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 text-[7px] transition-opacity duration-500"
          style={{ color: 'rgba(255,255,255,0.08)' }}
        >
          어두운 곳에서 아크릴 프리즘과 함께 감상하세요
        </div>
      )}

      {/* 샘플 모드 CTA */}
      {isSample && showControls && (
        <button
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 px-6 py-2.5 rounded-full text-xs font-bold transition-opacity duration-300"
          style={{
            background:
              'linear-gradient(135deg, rgba(159,120,92,0.9), rgba(184,119,66,0.9))',
            color: '#fff',
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
            backdropFilter: 'blur(8px)',
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (document.fullscreenElement)
              document.exitFullscreen().catch(() => {});
            setForceLandscape(false);
            router.push('/pets/register');
          }}
        >
          내 펫으로 만들어 보기
        </button>
      )}

      {/* 진입 오버레이 — 기울이면 재생 시작 */}
      {showEntryOverlay && (
        <EntryOverlay
          petName={petName}
          profileId={profileId}
          videoScale={videoScale}
          setVideoScale={setVideoScale}
          onStart={handleEnterPlayer}
        />
      )}
    </div>
  );
}

/* ============ 모션 존 ============ */
function MotionZone({
  direction,
  state,
  isPressing,
  pressProgress,
  onTap,
  onPressStart,
  onPressEnd,
  isAnyLocked,
}: {
  direction: 'left' | 'right';
  state: MotionState;
  isPressing: boolean;
  pressProgress: number;
  onTap: () => void;
  onPressStart: () => void;
  onPressEnd: () => void;
  isAnyLocked: boolean;
}) {
  const tapTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.stopPropagation();
    isLongPress.current = false;
    tapTimerRef.current = setTimeout(() => {
      isLongPress.current = true;
      onPressStart();
    }, 300);
  };

  const handleTouchEnd = (e: React.TouchEvent | React.MouseEvent) => {
    e.stopPropagation();
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    if (!isLongPress.current) onTap();
    else onPressEnd();
  };

  const bgOpacity =
    state === 'locked' ? 0.05 : state === 'playing' ? 0.03 : 0;

  return (
    <div
      className="flex-1 relative flex flex-col items-center justify-center cursor-pointer"
      style={{
        background: `rgba(100, 200, 255, ${bgOpacity})`,
        transition: 'background 0.3s ease',
        boxShadow:
          isAnyLocked && state === 'locked'
            ? 'inset 0 0 30px rgba(100,200,255,0.05)'
            : 'none',
      }}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <span
        className="text-2xl transition-opacity duration-300"
        style={{
          opacity:
            state === 'idle' ? 0.15 : state === 'playing' ? 0.3 : 0.5,
        }}
      >
        {state === 'locked'
          ? '🔒'
          : direction === 'left'
            ? '👈'
            : '👉'}
      </span>
      <span
        className="text-[8px] font-bold tracking-wider mt-1 transition-opacity"
        style={{
          color: 'rgba(255,255,255,0.15)',
          opacity: state === 'locked' ? 0.6 : 0.3,
        }}
      >
        {state === 'locked' ? 'LOOP' : direction === 'left' ? 'L' : 'R'}
      </span>

      {isPressing && (
        <div className="absolute inset-0 flex items-center justify-center">
          <svg className="w-16 h-16" viewBox="0 0 64 64">
            <circle
              cx="32"
              cy="32"
              r="28"
              fill="none"
              stroke="rgba(100,200,255,0.15)"
              strokeWidth="3"
            />
            <circle
              cx="32"
              cy="32"
              r="28"
              fill="none"
              stroke="rgba(100,200,255,0.6)"
              strokeWidth="3"
              strokeDasharray={`${28 * 2 * Math.PI}`}
              strokeDashoffset={`${28 * 2 * Math.PI * (1 - pressProgress / 100)}`}
              strokeLinecap="round"
              transform="rotate(-90 32 32)"
              style={{ transition: 'stroke-dashoffset 0.1s linear' }}
            />
          </svg>
        </div>
      )}
    </div>
  );
}

/* ============ 진입 오버레이 (안내문) ============ */
function EntryOverlay({
  petName, profileId, videoScale, setVideoScale, onStart,
}: {
  petName: string;
  profileId: string;
  videoScale: 100 | 66;
  setVideoScale: (v: 100 | 66) => void;
  onStart: () => void;
}) {
  const [permissionNeeded, setPermissionNeeded] = useState(false);

  useEffect(() => {
    if (typeof (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission === 'function') {
      setPermissionNeeded(true);
    }
  }, []);

  const requestPermission = async () => {
    try {
      const perm = await (DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission();
      if (perm === 'granted') {
        setPermissionNeeded(false);
      }
    } catch { /* denied */ }
  };

  const emoji = profileId === 'sample-dog' ? '🐕' : profileId === 'sample-cat' ? '🐈' : '🐾';

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.92)' }}
    >
      <div className="text-5xl mb-6" style={{ filter: 'drop-shadow(0 0 20px rgba(100,200,255,0.4))' }}>
        {emoji}
      </div>
      <p className="text-sm font-bold text-white/80 mb-2">{petName}의 홀로그램</p>

      <p className="text-[11px] text-white/40 mb-2">
        📱 핸드폰을 아크릴 위에 뒤집으면 자동 재생됩니다
      </p>
      <p className="text-[9px] text-white/20 mb-6">
        다시 세우면 재생이 멈추고 이 화면으로 돌아옵니다
      </p>

      {/* 크기 선택 */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={(e) => { e.stopPropagation(); setVideoScale(100); }}
          className="px-4 py-2 rounded-full text-[11px] font-bold transition-all"
          style={{
            background: videoScale === 100 ? 'rgba(100,200,255,0.2)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${videoScale === 100 ? 'rgba(100,200,255,0.4)' : 'rgba(255,255,255,0.1)'}`,
            color: videoScale === 100 ? 'rgba(100,200,255,0.9)' : 'rgba(255,255,255,0.4)',
          }}
        >
          100%
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setVideoScale(66); }}
          className="px-4 py-2 rounded-full text-[11px] font-bold transition-all"
          style={{
            background: videoScale === 66 ? 'rgba(100,200,255,0.2)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${videoScale === 66 ? 'rgba(100,200,255,0.4)' : 'rgba(255,255,255,0.1)'}`,
            color: videoScale === 66 ? 'rgba(100,200,255,0.9)' : 'rgba(255,255,255,0.4)',
          }}
        >
          66%
        </button>
      </div>

      {permissionNeeded && (
        <button
          onClick={(e) => { e.stopPropagation(); requestPermission(); }}
          className="px-8 py-3 rounded-full text-sm font-bold mb-4"
          style={{
            background: 'linear-gradient(135deg, rgba(100,200,255,0.15), rgba(160,120,255,0.15))',
            border: '1px solid rgba(100,200,255,0.25)',
            color: 'rgba(255,255,255,0.85)',
          }}
        >
          센서 권한 허용
        </button>
      )}

      <button
        onClick={(e) => { e.stopPropagation(); onStart(); }}
        className="px-8 py-3 rounded-full text-sm font-bold"
        style={{
          background: 'linear-gradient(135deg, rgba(100,200,255,0.15), rgba(160,120,255,0.15))',
          border: '1px solid rgba(100,200,255,0.25)',
          color: 'rgba(255,255,255,0.85)',
          animation: 'pulse 2s ease-in-out infinite',
        }}
      >
        탭하여 바로 시작
      </button>
      <p className="text-[9px] text-white/20 mt-3">또는 핸드폰을 뒤집으세요</p>
    </div>
  );
}
