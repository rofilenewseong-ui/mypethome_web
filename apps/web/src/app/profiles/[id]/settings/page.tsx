'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { profilesApi, baseVideosApi, motionsApi } from '@/lib/api';
import { ALL_MOTION_TYPES, MOTION_TYPE_LABELS, MOTION_TYPE_EMOJIS, CREDIT_COSTS, type MotionType } from '@/lib/constants';
import MobileLayout from '@/components/layout/MobileLayout';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { useToastStore } from '@/stores/useToastStore';
import { useAuthStore } from '@/stores/useAuthStore';

/* ============ Types ============ */
interface BaseVideo {
  id: string;
  name: string;
  emoji: string;
  gifUrl: string | null;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  isActive: boolean;
}

interface Motion {
  id: string;
  name: string;
  motionType: MotionType;
  gifUrl: string | null;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  position: 'LEFT' | 'RIGHT' | 'NONE';
  status: string;
}

/* ============ 통합 설정 페이지 (12칸 고정 그리드) ============ */
export default function ProfileSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const profileId = params.id as string;
  const addToast = useToastStore((s) => s.addToast);
  const userCredits = useAuthStore((s) => s.user?.credits ?? 0);
  const refreshCredits = useAuthStore((s) => s.refreshCredits);
  const [creditUpsellModal, setCreditUpsellModal] = useState<{ needed: number; action: string } | null>(null);

  const [petName, setPetName] = useState('');
  const [petId, setPetId] = useState<string | null>(null);
  const [baseVideos, setBaseVideos] = useState<BaseVideo[]>([]);
  const [motions, setMotions] = useState<Motion[]>([]);
  const [deleteModal, setDeleteModal] = useState<{
    type: 'video' | 'motion';
    id: string;
    name: string;
    emoji: string;
    position?: string;
  } | null>(null);
  const [bulkDeleteModal, setBulkDeleteModal] = useState(false);
  const [purchaseModal, setPurchaseModal] = useState<{
    motionType: MotionType;
    label: string;
  } | null>(null);
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const isSample = profileId.startsWith('sample-');

  // 샘플 데이터 (보리 영상)
  const SAMPLE_DOG_DATA = {
    petName: '보리',
    baseVideos: [
      { id: 'sb-1', name: '기본', emoji: '🎬', gifUrl: null, videoUrl: '/samples/bori/base.mp4', thumbnailUrl: null, isActive: true },
    ] as BaseVideo[],
    motions: [
      { id: 'sm-1', name: '앉기', motionType: 'SIT' as MotionType, gifUrl: null, videoUrl: '/samples/bori/motion-1.mp4', thumbnailUrl: null, position: 'LEFT' as const, status: 'COMPLETED' },
      { id: 'sm-2', name: '엎드리기', motionType: 'LIE_DOWN' as MotionType, gifUrl: null, videoUrl: '/samples/bori/motion-2.mp4', thumbnailUrl: null, position: 'RIGHT' as const, status: 'COMPLETED' },
      { id: 'sm-3', name: '고개갸웃', motionType: 'HEAD_TILT' as MotionType, gifUrl: null, videoUrl: '/samples/bori/motion-3.mp4', thumbnailUrl: null, position: 'NONE' as const, status: 'COMPLETED' },
      { id: 'sm-4', name: '꼬리흔들기', motionType: 'TAIL_WAG' as MotionType, gifUrl: null, videoUrl: '/samples/bori/motion-4.mp4', thumbnailUrl: null, position: 'NONE' as const, status: 'COMPLETED' },
      { id: 'sm-5', name: '발들기', motionType: 'FRONT_PAWS_UP' as MotionType, gifUrl: null, videoUrl: '/samples/bori/motion-5.mp4', thumbnailUrl: null, position: 'NONE' as const, status: 'COMPLETED' },
      { id: 'sm-6', name: '하나밀기', motionType: 'PUSH_NOSE' as MotionType, gifUrl: null, videoUrl: '/samples/bori/motion-6.mp4', thumbnailUrl: null, position: 'NONE' as const, status: 'COMPLETED' },
      { id: 'sm-7', name: '돌아보기', motionType: 'LOOK_BACK' as MotionType, gifUrl: null, videoUrl: '/samples/bori/motion-7.mp4', thumbnailUrl: null, position: 'NONE' as const, status: 'COMPLETED' },
      { id: 'sm-8', name: '몸털기', motionType: 'SHAKE_BODY' as MotionType, gifUrl: null, videoUrl: '/samples/bori/motion-8.mp4', thumbnailUrl: null, position: 'NONE' as const, status: 'COMPLETED' },
      { id: 'sm-9', name: '바닥냄새맡기', motionType: 'SNIFF_GROUND' as MotionType, gifUrl: null, videoUrl: '/samples/bori/motion-9.mp4', thumbnailUrl: null, position: 'NONE' as const, status: 'COMPLETED' },
      { id: 'sm-10', name: '놀이보기', motionType: 'PLAY_BOW' as MotionType, gifUrl: null, videoUrl: '/samples/bori/motion-10.mp4', thumbnailUrl: null, position: 'NONE' as const, status: 'COMPLETED' },
    ] as Motion[],
  };

  // API에서 데이터 로드 (샘플이 아닌 경우만)
  useEffect(() => {
    if (isSample) {
      if (profileId === 'sample-dog') {
        setPetName(SAMPLE_DOG_DATA.petName);
        setBaseVideos(SAMPLE_DOG_DATA.baseVideos);
        setMotions(SAMPLE_DOG_DATA.motions);
      } else {
        setPetName('냥이');
      }
      return;
    }

    const fetchData = async () => {
      try {
        const profileRes = await profilesApi.get(profileId);
        const profile = profileRes.data?.data || profileRes.data;
        if (profile?.petName) setPetName(profile.petName);
        if (profile?.petId) setPetId(profile.petId);
      } catch {
        // 프로필 로드 실패
      }

      try {
        const [videosRes, motionsRes] = await Promise.allSettled([
          baseVideosApi.list(profileId),
          motionsApi.list(profileId),
        ]);
        if (videosRes.status === 'fulfilled' && videosRes.value.data?.data?.length > 0) {
          setBaseVideos(
            videosRes.value.data.data.map((v: Record<string, unknown>) => ({
              id: v.id as string,
              name: (v.name as string) || '영상',
              emoji: (v.emoji as string) || '🎬',
              gifUrl: (v.gifUrl as string) || null,
              videoUrl: (v.videoUrl as string) || null,
              thumbnailUrl: (v.thumbnailUrl as string) || null,
              isActive: (v.isActive as boolean) || false,
            }))
          );
        }
        if (motionsRes.status === 'fulfilled' && motionsRes.value.data?.data?.length > 0) {
          setMotions(
            motionsRes.value.data.data.map((m: Record<string, unknown>) => ({
              id: m.id as string,
              name: (m.name as string) || '모션',
              motionType: (m.motionType as MotionType) || 'FRONT_PAWS_UP',
              gifUrl: (m.gifUrl as string) || null,
              videoUrl: (m.videoUrl as string) || null,
              thumbnailUrl: (m.thumbnailUrl as string) || null,
              position: ((m.position as string) || 'NONE').toUpperCase() as 'LEFT' | 'RIGHT' | 'NONE',
              status: (m.status as string) || 'PENDING',
            }))
          );
        }
      } catch {
        // 빈 배열 유지
      }
    };
    fetchData();
  }, [profileId, isSample]);

  /* ---- 자동 저장 토스트 ---- */
  const showAutoSave = useCallback(() => {
    setShowSaveToast(true);
    setTimeout(() => setShowSaveToast(false), 1500);
  }, []);

  /* ---- 모션 방향 배정 (인라인 버튼) ---- */
  const assignMotion = useCallback(
    async (motionId: string, position: 'LEFT' | 'RIGHT' | 'NONE') => {
      // 낙관적 업데이트: 기존 같은 방향 모션 해제 + 타겟 배정
      setMotions((prev) =>
        prev.map((m) => {
          if (m.id === motionId) {
            return { ...m, position };
          }
          if (position !== 'NONE' && m.position === position) {
            return { ...m, position: 'NONE' };
          }
          return m;
        })
      );
      try {
        await motionsApi.assign(profileId, motionId, { position: position.toLowerCase() });
      } catch {
        // 실패 시 재로딩
        const res = await motionsApi.list(profileId);
        if (res.data?.data) {
          setMotions(
            res.data.data.map((m: Record<string, unknown>) => ({
              id: m.id as string,
              name: (m.name as string) || '모션',
              motionType: (m.motionType as MotionType) || 'FRONT_PAWS_UP',
              gifUrl: (m.gifUrl as string) || null,
              videoUrl: (m.videoUrl as string) || null,
              thumbnailUrl: (m.thumbnailUrl as string) || null,
              position: ((m.position as string) || 'NONE').toUpperCase() as 'LEFT' | 'RIGHT' | 'NONE',
              status: (m.status as string) || 'PENDING',
            }))
          );
        }
      }
      showAutoSave();
    },
    [profileId, showAutoSave]
  );

  /* ---- 베이스 영상 활성화 ---- */
  const activateVideo = useCallback(
    (videoId: string) => {
      setBaseVideos((prev) =>
        prev.map((v) => ({ ...v, isActive: v.id === videoId }))
      );
      baseVideosApi.activate(profileId, videoId).catch(() => {});
      showAutoSave();
    },
    [profileId, showAutoSave]
  );

  /* ---- 모션 구매 (잠긴 슬롯 클릭) ---- */
  const handlePurchaseMotion = async () => {
    if (!purchaseModal) return;
    setIsPurchasing(true);

    try {
      const res = await motionsApi.create(profileId, { motionType: purchaseModal.motionType });
      const newMotion = res.data?.data || res.data;
      if (newMotion) {
        setMotions((prev) => [
          ...prev,
          {
            id: newMotion.id,
            name: newMotion.name || MOTION_TYPE_LABELS[purchaseModal.motionType],
            motionType: purchaseModal.motionType,
            gifUrl: newMotion.gifUrl || null,
            videoUrl: newMotion.videoUrl || null,
            thumbnailUrl: newMotion.thumbnailUrl || null,
            position: 'NONE',
            status: newMotion.status || 'PENDING',
          },
        ]);
      }
      showAutoSave();
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || '';
      if (errorMsg.includes('크레딧') || errorMsg.includes('credit') || errorMsg.includes('잔액')) {
        refreshCredits();
        setCreditUpsellModal({ needed: CREDIT_COSTS.MOTION_CREATE, action: purchaseModal.label });
      } else {
        addToast(errorMsg || '모션 구매에 실패했습니다.', 'error');
      }
    } finally {
      setIsPurchasing(false);
      setPurchaseModal(null);
    }
  };

  /* ---- 삭제 처리 ---- */
  const handleDelete = async () => {
    if (!deleteModal) return;

    if (deleteModal.type === 'video') {
      if (baseVideos.length <= 1) {
        setDeleteModal(null);
        return;
      }
      await baseVideosApi.delete(profileId, deleteModal.id).catch(() => {});
      setBaseVideos((prev) => {
        const filtered = prev.filter((v) => v.id !== deleteModal.id);
        if (!filtered.find((v) => v.isActive) && filtered.length > 0) {
          filtered[0].isActive = true;
        }
        return filtered;
      });
    } else {
      await motionsApi.delete(profileId, deleteModal.id).catch(() => {});
      setMotions((prev) => prev.filter((m) => m.id !== deleteModal.id));
    }

    setDeleteModal(null);
    showAutoSave();
  };

  /* ---- 파생 데이터 ---- */
  const leftMotion = motions.find((m) => m.position === 'LEFT');
  const rightMotion = motions.find((m) => m.position === 'RIGHT');
  const activeBase = baseVideos.find((v) => v.isActive);

  return (
    <MobileLayout
      title="프로필 설정"
      showBack
    >
      <div className="space-y-4 animate-fade-in">
        {/* ============ 1. Sticky 영상 프리뷰 + 플레이어 버튼 ============ */}
        <div
          className="sticky z-40 mx-4 mt-4"
          style={{ top: 'var(--topbar-height)' }}
        >
        <div
          className="rounded-[var(--radius-lg)] overflow-hidden"
          style={{
            background: 'rgba(0,0,0,0.85)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* 3분할 영상 재생 — 각 칸 1:1 */}
          <div className="grid grid-cols-3 gap-[1px]" style={{ background: 'rgba(255,255,255,0.06)' }}>
            {/* LEFT 모션 */}
            <button
              className="relative flex items-center justify-center overflow-hidden"
              style={{ background: '#0a0a0a', aspectRatio: '1' }}
              onClick={() => { if (leftMotion?.videoUrl) setPlayingVideoId(playingVideoId === leftMotion.id ? null : leftMotion.id); }}
            >
              {leftMotion?.videoUrl ? (
                <video
                  key={`left-${leftMotion.id}`}
                  src={leftMotion.videoUrl}
                  autoPlay loop muted playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <span className="text-lg" style={{ color: 'rgba(255,255,255,0.2)' }}>◀</span>
                </div>
              )}
            </button>

            {/* BASE 영상 */}
            <div className="relative flex items-center justify-center overflow-hidden" style={{ background: '#0a0a0a', aspectRatio: '1' }}>
              {activeBase?.videoUrl ? (
                <video
                  key={`base-${activeBase.id}`}
                  src={activeBase.videoUrl}
                  autoPlay loop muted playsInline
                  className="w-full h-full object-cover"
                />
              ) : activeBase?.gifUrl ? (
                <img src={activeBase.gifUrl} alt="베이스" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl animate-pulse">{activeBase?.emoji || '🐾'}</span>
              )}
            </div>

            {/* RIGHT 모션 */}
            <button
              className="relative flex items-center justify-center overflow-hidden"
              style={{ background: '#0a0a0a', aspectRatio: '1' }}
              onClick={() => { if (rightMotion?.videoUrl) setPlayingVideoId(playingVideoId === rightMotion.id ? null : rightMotion.id); }}
            >
              {rightMotion?.videoUrl ? (
                <video
                  key={`right-${rightMotion.id}`}
                  src={rightMotion.videoUrl}
                  autoPlay loop muted playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <span className="text-lg" style={{ color: 'rgba(255,255,255,0.2)' }}>▶</span>
                </div>
              )}
            </button>
          </div>

          {/* 하단 LEFT / 기본 / RIGHT 라벨 */}
          <div className="flex" style={{ height: '28px', flexShrink: 0 }}>
            <div className="flex-1 flex items-center justify-center"
              style={{ background: leftMotion ? 'rgba(102,126,234,0.15)' : 'transparent',
                borderTop: leftMotion ? '2px solid #667eea' : '2px solid transparent' }}>
              <span className="text-[8px] font-bold" style={{ color: leftMotion ? '#667eea' : 'rgba(255,255,255,0.25)' }}>
                {leftMotion ? `◀ ${leftMotion.name}` : '◀ LEFT'}
              </span>
            </div>
            <div className="flex-1 flex items-center justify-center"
              style={{ borderLeft: '1px solid rgba(255,255,255,0.05)', borderRight: '1px solid rgba(255,255,255,0.05)',
                background: 'rgba(100,200,255,0.06)' }}>
              <span className="text-[8px] font-bold" style={{ color: 'var(--accent-holo)' }}>
                {activeBase?.name || '기본'}
              </span>
            </div>
            <div className="flex-1 flex items-center justify-center"
              style={{ background: rightMotion ? 'rgba(240,147,251,0.15)' : 'transparent',
                borderTop: rightMotion ? '2px solid #f093fb' : '2px solid transparent' }}>
              <span className="text-[8px] font-bold" style={{ color: rightMotion ? '#f093fb' : 'rgba(255,255,255,0.25)' }}>
                {rightMotion ? `${rightMotion.name} ▶` : 'RIGHT ▶'}
              </span>
            </div>
          </div>
        </div>
        <div className="mt-2">
          <Button fullWidth onClick={() => router.push(`/player/${profileId}`)}>
            ▶ 플레이어에서 확인하기
          </Button>
        </div>
        </div>

        {/* ============ 선택 삭제 바 ============ */}
        <div className="px-4 flex items-center justify-between">
          <button
            onClick={() => { setSelectMode(!selectMode); setSelectedIds(new Set()); }}
            className="px-3 py-1.5 rounded-[var(--radius-sm)] text-[10px] font-bold transition-all"
            style={{
              background: selectMode ? 'rgba(196,92,74,0.1)' : 'var(--bg-card)',
              color: selectMode ? 'var(--accent-red)' : 'var(--text-secondary)',
              border: `1px solid ${selectMode ? 'rgba(196,92,74,0.3)' : 'var(--border-card)'}`,
            }}
          >
            {selectMode ? '취소' : '선택 삭제'}
          </button>
          {selectMode && selectedIds.size > 0 && (
            <button
              onClick={() => setBulkDeleteModal(true)}
              className="px-3 py-1.5 rounded-[var(--radius-sm)] text-[10px] font-bold"
              style={{ background: 'var(--accent-red)', color: '#fff' }}
            >
              🗑 {selectedIds.size}개 삭제
            </button>
          )}
        </div>

        {/* ============ 2. 베이스 영상 섹션 ============ */}
        <section className="px-4 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>베이스 영상</h3>
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>최대 3개 · 추가 {CREDIT_COSTS.BASE_VIDEO_CREATE}C</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {baseVideos.map((video) => {
              const isPlaying = playingVideoId === `base-${video.id}`;
              const isSelected = selectedIds.has(video.id);
              return (
                <div key={video.id}
                  className="rounded-[var(--radius-md)] overflow-hidden cursor-pointer transition-all relative"
                  style={{ aspectRatio: '1', background: '#0a0a0a', border: `2px solid ${video.isActive ? 'var(--accent-holo)' : isSelected ? 'var(--accent-red)' : 'var(--border-card)'}` }}
                  onClick={() => {
                    if (selectMode) {
                      // 베이스 영상 1개만 남으면 선택 불가
                      if (baseVideos.length <= 1) return;
                      setSelectedIds((prev) => { const n = new Set(prev); n.has(video.id) ? n.delete(video.id) : n.add(video.id); return n; });
                    } else {
                      if (video.videoUrl) setPlayingVideoId(isPlaying ? null : `base-${video.id}`);
                      activateVideo(video.id);
                    }
                  }}
                >
                  {isPlaying && video.videoUrl ? (
                    <video src={video.videoUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                  ) : video.videoUrl ? (
                    <video src={`${video.videoUrl}#t=0.1`} muted playsInline preload="auto" className="w-full h-full object-cover" style={{ pointerEvents: 'none' }} />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center">
                      <span className="text-xl">{video.emoji}</span>
                      <span className="text-[9px] mt-1" style={{ color: 'var(--text-muted)' }}>{video.name}</span>
                    </div>
                  )}
                  {video.isActive && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[7px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: 'rgba(0,0,0,0.6)', color: 'var(--accent-holo)' }}>활성</span>}
                  {selectMode && <div className="absolute top-1 left-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: isSelected ? 'var(--accent-red)' : 'rgba(0,0,0,0.5)', color: '#fff', border: '1.5px solid rgba(255,255,255,0.3)' }}>{isSelected ? '✓' : ''}</div>}
                </div>
              );
            })}
            {baseVideos.length < 3 && (
              <button className="rounded-[var(--radius-md)] flex flex-col items-center justify-center gap-1 transition-all active:scale-[0.95]"
                style={{ aspectRatio: '1', border: '2px dashed var(--border-card)', background: 'transparent' }}
                onClick={() => { if (petId) router.push(`/pets/${petId}/profiles/new?profileId=${profileId}`); else router.push(`/pets/unknown/profiles/new?profileId=${profileId}`); }}>
                <span className="text-lg" style={{ color: 'var(--text-muted)' }}>+</span>
                <span className="text-[8px] font-bold" style={{ color: 'var(--text-muted)' }}>추가 ({CREDIT_COSTS.BASE_VIDEO_CREATE}C)</span>
              </button>
            )}
          </div>
        </section>

        {/* ============ 3. 모션 영상 — 구매 먼저, 미구매 뒤로 ============ */}
        <section className="px-4 pb-4 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>모션 영상</h3>
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>추가 {CREDIT_COSTS.MOTION_CREATE}C · 삭제 시 50% 환불</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {/* 구매한 모션 먼저 */}
            {ALL_MOTION_TYPES.filter((mt) => motions.find((m) => m.motionType === mt)).map((motionType) => {
              const purchased = motions.find((m) => m.motionType === motionType)!;
              const isPlaying = playingVideoId === purchased.id;
              const posColor = purchased.position === 'LEFT' ? '#667eea' : purchased.position === 'RIGHT' ? '#f093fb' : undefined;
              const isSelected = selectedIds.has(purchased.id);
              return (
                <div key={motionType} className="rounded-[var(--radius-md)] overflow-hidden relative transition-all"
                  style={{ background: posColor ? `${posColor}11` : 'var(--bg-card)', border: `1.5px solid ${isSelected ? 'var(--accent-red)' : posColor || 'var(--border-card)'}` }}>
                  <div className="relative flex items-center justify-center cursor-pointer" style={{ aspectRatio: '1' }}
                    onClick={() => {
                      if (selectMode) {
                        setSelectedIds((prev) => { const n = new Set(prev); n.has(purchased.id) ? n.delete(purchased.id) : n.add(purchased.id); return n; });
                      } else if (purchased.videoUrl) {
                        setPlayingVideoId(isPlaying ? null : purchased.id);
                      }
                    }}>
                    {isPlaying && purchased.videoUrl ? (
                      <video src={purchased.videoUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                    ) : purchased.videoUrl ? (
                      <video src={`${purchased.videoUrl}#t=0.1`} muted playsInline preload="auto" className="w-full h-full object-cover" style={{ pointerEvents: 'none' }} />
                    ) : (
                      <span className="text-xl">{MOTION_TYPE_EMOJIS[motionType]}</span>
                    )}
                    {purchased.status === 'PENDING' && <span className="absolute top-1 left-1 px-1 rounded text-[6px] font-bold" style={{ background: 'rgba(196,137,77,0.4)', color: '#c4894d' }}>생성중</span>}
                    {purchased.position !== 'NONE' && <span className="absolute top-1 right-1 px-1 py-0.5 rounded text-[6px] font-bold" style={{ background: `${posColor}33`, color: posColor }}>{purchased.position}</span>}
                    {selectMode && <div className="absolute top-1 left-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: isSelected ? 'var(--accent-red)' : 'rgba(0,0,0,0.5)', color: '#fff', border: '1.5px solid rgba(255,255,255,0.3)' }}>{isSelected ? '✓' : ''}</div>}
                  </div>
                  <div className="px-1 py-1.5">
                    <p className="text-[9px] font-semibold text-center truncate mb-1" style={{ color: 'var(--text-secondary)' }}>{purchased.name}</p>
                    <div className="grid grid-cols-2 gap-1">
                      <button onClick={() => assignMotion(purchased.id, purchased.position === 'LEFT' ? 'NONE' : 'LEFT')}
                        className="py-1 rounded text-[9px] font-bold transition-all"
                        style={{ background: purchased.position === 'LEFT' ? '#667eea' : 'rgba(102,126,234,0.1)', color: purchased.position === 'LEFT' ? '#fff' : '#667eea', border: '1px solid rgba(102,126,234,0.3)' }}>
                        ◀ L
                      </button>
                      <button onClick={() => assignMotion(purchased.id, purchased.position === 'RIGHT' ? 'NONE' : 'RIGHT')}
                        className="py-1 rounded text-[9px] font-bold transition-all"
                        style={{ background: purchased.position === 'RIGHT' ? '#f093fb' : 'rgba(240,147,251,0.1)', color: purchased.position === 'RIGHT' ? '#fff' : '#f093fb', border: '1px solid rgba(240,147,251,0.3)' }}>
                        R ▶
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {/* 미구매 모션 뒤에 */}
            {ALL_MOTION_TYPES.filter((mt) => !motions.find((m) => m.motionType === mt)).map((motionType) => (
              <button key={motionType}
                onClick={() => {
                  if (userCredits < CREDIT_COSTS.MOTION_CREATE) { setCreditUpsellModal({ needed: CREDIT_COSTS.MOTION_CREATE, action: MOTION_TYPE_LABELS[motionType] }); return; }
                  setPurchaseModal({ motionType, label: MOTION_TYPE_LABELS[motionType] });
                }}
                className="rounded-[var(--radius-md)] flex flex-col items-center justify-center gap-1.5 transition-all active:scale-[0.97]"
                style={{ aspectRatio: '1', background: 'rgba(74,52,42,0.03)', border: '1.5px dashed var(--border-card)', opacity: 0.5 }}>
                <span className="text-xl">🔒</span>
                <span className="text-[9px] font-semibold text-center leading-tight" style={{ color: 'var(--text-muted)' }}>{MOTION_TYPE_LABELS[motionType]}</span>
                <span className="text-[8px] font-bold" style={{ color: 'var(--accent-warm)' }}>{CREDIT_COSTS.MOTION_CREATE}C</span>
              </button>
            ))}
          </div>
        </section>

      </div>

      {/* ============ 자동 저장 토스트 ============ */}
      {showSaveToast && (
        <div
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-[var(--radius-sm)] animate-slide-up"
          style={{ background: 'var(--accent-green)', color: '#fff' }}
        >
          <p className="text-[11px] font-semibold">✓ 자동 저장 완료</p>
        </div>
      )}

      {/* ============ 모션 구매 확인 모달 ============ */}
      <Modal
        isOpen={!!purchaseModal}
        onClose={() => setPurchaseModal(null)}
        title="모션 구매"
      >
        {purchaseModal && (
          <>
            <div className="text-center mb-4">
              <span className="text-4xl">{MOTION_TYPE_EMOJIS[purchaseModal.motionType]}</span>
              <p className="text-sm font-bold mt-2" style={{ color: 'var(--text-primary)' }}>
                {purchaseModal.label}
              </p>
              <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                이 모션을 {CREDIT_COSTS.MOTION_CREATE}C로 구매하시겠습니까?
              </p>
            </div>

            <div
              className="rounded-[var(--radius-sm)] p-3 mb-4 text-center"
              style={{ background: 'rgba(196,137,77,0.08)', border: '1px solid rgba(196,137,77,0.15)' }}
            >
              <p className="text-[11px] font-bold" style={{ color: 'var(--accent-warm)' }}>
                {CREDIT_COSTS.MOTION_CREATE}C 차감
              </p>
              <p className="text-[9px] mt-1" style={{ color: 'var(--text-muted)' }}>
                AI가 모션 영상을 생성합니다 (약 1~2분 소요)
              </p>
            </div>

            <div className="flex gap-3">
              <Button variant="secondary" fullWidth onClick={() => setPurchaseModal(null)}>
                취소
              </Button>
              <Button fullWidth onClick={handlePurchaseMotion} loading={isPurchasing}>
                구매하기
              </Button>
            </div>
          </>
        )}
      </Modal>

      {/* ============ 삭제 확인 모달 ============ */}
      <Modal
        isOpen={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        title={deleteModal?.type === 'video' ? '베이스 영상 삭제' : '모션 삭제'}
      >
        {deleteModal && (
          <>
            <div className="text-center mb-4">
              <div
                className="w-16 h-16 rounded-[var(--radius-md)] flex items-center justify-center mx-auto mb-2"
                style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <span className="text-2xl">{deleteModal.emoji}</span>
              </div>
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                {deleteModal.name}
              </p>
              {deleteModal.position && deleteModal.position !== 'NONE' && (
                <span
                  className="inline-block mt-1 text-[9px] font-bold px-2 py-0.5 rounded-full"
                  style={{
                    background: deleteModal.position === 'LEFT' ? 'rgba(102,126,234,0.15)' : 'rgba(240,147,251,0.15)',
                    color: deleteModal.position === 'LEFT' ? '#667eea' : '#f093fb',
                  }}
                >
                  {deleteModal.position} 배정됨
                </span>
              )}
            </div>

            <div
              className="rounded-[var(--radius-sm)] p-3 mb-4"
              style={{ background: 'rgba(196, 137, 77, 0.08)', border: '1px solid rgba(196, 137, 77, 0.15)' }}
            >
              <div className="flex items-center justify-between text-[10px] mb-1">
                <span style={{ color: 'var(--text-muted)' }}>삭제 시 환불</span>
                <span className="font-bold" style={{ color: 'var(--accent-green)' }}>+20C (50%)</span>
              </div>
              <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
                휴지통으로 이동 · 30일 보관 · 복구 시 -20C
              </p>
            </div>

            {deleteModal.type === 'video' && baseVideos.length <= 1 && (
              <div
                className="rounded-[var(--radius-sm)] p-3 mb-4 text-center"
                style={{ background: 'rgba(196, 92, 74, 0.08)', border: '1px solid rgba(196, 92, 74, 0.15)' }}
              >
                <p className="text-[11px] font-bold" style={{ color: 'var(--accent-red)' }}>
                  ⚠ 마지막 1개는 삭제할 수 없습니다
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="secondary" fullWidth onClick={() => setDeleteModal(null)}>
                취소
              </Button>
              <Button
                variant="danger"
                fullWidth
                onClick={handleDelete}
                disabled={deleteModal.type === 'video' && baseVideos.length <= 1}
              >
                삭제하기
              </Button>
            </div>
          </>
        )}
      </Modal>
      {/* ============ 크레딧 부족 모달 ============ */}
      <Modal
        isOpen={!!creditUpsellModal}
        onClose={() => setCreditUpsellModal(null)}
        title="크레딧이 부족합니다"
      >
        {creditUpsellModal && (
          <>
            <div className="text-center mb-4">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3"
                style={{ background: 'rgba(196,137,77,0.1)', border: '1px solid rgba(196,137,77,0.2)' }}
              >
                <span className="text-3xl">💎</span>
              </div>
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                {creditUpsellModal.action}
              </p>
              <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                을(를) 이용하려면 크레딧이 필요합니다
              </p>
            </div>

            <div
              className="rounded-[var(--radius-sm)] p-3 mb-4"
              style={{ background: 'rgba(196,92,74,0.08)', border: '1px solid rgba(196,92,74,0.15)' }}
            >
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span style={{ color: 'var(--text-muted)' }}>필요 크레딧</span>
                <span className="font-bold" style={{ color: 'var(--accent-warm)' }}>{creditUpsellModal.needed}C</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span style={{ color: 'var(--text-muted)' }}>보유 크레딧</span>
                <span className="font-bold" style={{ color: 'var(--accent-red)' }}>{userCredits}C</span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="secondary" fullWidth onClick={() => setCreditUpsellModal(null)}>
                닫기
              </Button>
              <Button fullWidth onClick={() => { setCreditUpsellModal(null); window.open('https://coreflow5103.cafe24.com/category/My-Pet-Home/59/', '_blank'); }}>
                충전하러 가기
              </Button>
            </div>
          </>
        )}
      </Modal>

      {/* ============ 다중 삭제 확인 모달 ============ */}
      <Modal
        isOpen={bulkDeleteModal}
        onClose={() => setBulkDeleteModal(false)}
        title={`${selectedIds.size}개 항목 삭제`}
      >
        <div className="space-y-3 mb-4">
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            다음 항목이 삭제됩니다:
          </p>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {Array.from(selectedIds).map((id) => {
              const video = baseVideos.find((v) => v.id === id);
              const motion = motions.find((m) => m.id === id);
              const item = video || motion;
              if (!item) return null;
              const isVideo = !!video;
              const posLabel = !isVideo && (item as Motion).position !== 'NONE' ? (item as Motion).position : null;
              return (
                <div key={id} className="flex items-center gap-3 p-2 rounded-[var(--radius-sm)]"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
                  <span className="text-lg">{isVideo ? '🎬' : '🎭'}</span>
                  <div className="flex-1">
                    <p className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>{item.name}</p>
                    <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{isVideo ? '베이스 영상' : '모션 영상'}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="rounded-[var(--radius-sm)] p-3"
            style={{ background: 'rgba(196,137,77,0.08)', border: '1px solid rgba(196,137,77,0.15)' }}>
            <div className="flex items-center justify-between text-[10px] mb-1">
              <span style={{ color: 'var(--text-muted)' }}>삭제 시 환불</span>
              <span className="font-bold" style={{ color: 'var(--accent-green)' }}>+{selectedIds.size * 20}C (50%)</span>
            </div>
            <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>휴지통으로 이동 · 30일 보관</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" fullWidth onClick={() => setBulkDeleteModal(false)}>취소</Button>
          <Button variant="danger" fullWidth onClick={async () => {
            for (const id of selectedIds) {
              const isVideo = baseVideos.some((v) => v.id === id);
              if (isVideo) {
                await baseVideosApi.delete(profileId, id).catch(() => {});
                setBaseVideos((prev) => {
                  const filtered = prev.filter((v) => v.id !== id);
                  if (!filtered.find((v) => v.isActive) && filtered.length > 0) filtered[0].isActive = true;
                  return filtered;
                });
              } else {
                await motionsApi.delete(profileId, id).catch(() => {});
                setMotions((prev) => prev.filter((m) => m.id !== id));
              }
            }
            setBulkDeleteModal(false);
            setSelectMode(false);
            setSelectedIds(new Set());
            showAutoSave();
          }}>
            {selectedIds.size}개 삭제하기
          </Button>
        </div>
      </Modal>
    </MobileLayout>
  );
}
