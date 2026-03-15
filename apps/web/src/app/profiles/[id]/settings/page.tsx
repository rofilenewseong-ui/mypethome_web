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
  const [purchaseModal, setPurchaseModal] = useState<{
    motionType: MotionType;
    label: string;
  } | null>(null);
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);

  // API에서 데이터 로드
  useEffect(() => {
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
  }, [profileId]);

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
        {/* ============ 1. 3분할 미니 프리뷰 ============ */}
        <div
          className="mx-4 mt-4 rounded-[var(--radius-lg)] overflow-hidden flex"
          style={{
            height: '56px',
            background: 'rgba(0,0,0,0.6)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {/* LEFT 슬롯 */}
          <div
            className="flex-1 flex flex-col items-center justify-center gap-0.5 relative"
            style={{
              background: leftMotion ? 'rgba(102, 126, 234, 0.15)' : 'transparent',
              borderBottom: leftMotion ? '2px solid #667eea' : '2px solid transparent',
            }}
          >
            {leftMotion ? (
              <>
                {leftMotion.thumbnailUrl ? (
                  <img src={leftMotion.thumbnailUrl} alt={leftMotion.name} className="w-7 h-7 rounded object-cover" />
                ) : (
                  <span className="text-sm">{MOTION_TYPE_EMOJIS[leftMotion.motionType]}</span>
                )}
                <span className="text-[7px] font-bold" style={{ color: '#667eea' }}>LEFT</span>
              </>
            ) : (
              <>
                <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>—</span>
                <span className="text-[7px]" style={{ color: 'rgba(255,255,255,0.25)' }}>LEFT</span>
              </>
            )}
          </div>

          {/* CENTER/BASE 슬롯 */}
          <div
            className="flex-[1.3] flex flex-col items-center justify-center gap-0.5 relative"
            style={{
              borderLeft: '1px solid rgba(255,255,255,0.05)',
              borderRight: '1px solid rgba(255,255,255,0.05)',
              background: 'rgba(100,200,255,0.06)',
            }}
          >
            {activeBase?.thumbnailUrl ? (
              <img src={activeBase.thumbnailUrl} alt={activeBase.name} className="w-8 h-10 rounded object-cover" />
            ) : (
              <span className="text-sm">{activeBase?.emoji || '🎬'}</span>
            )}
            <span className="text-[7px] font-bold" style={{ color: 'var(--accent-holo)' }}>BASE</span>
            <div
              className="absolute bottom-0 left-0 right-0 h-[2px]"
              style={{
                background: 'linear-gradient(90deg, transparent, var(--accent-holo), transparent)',
                animation: 'scan-bar 2s linear infinite',
              }}
            />
          </div>

          {/* RIGHT 슬롯 */}
          <div
            className="flex-1 flex flex-col items-center justify-center gap-0.5 relative"
            style={{
              background: rightMotion ? 'rgba(240, 147, 251, 0.15)' : 'transparent',
              borderBottom: rightMotion ? '2px solid #f093fb' : '2px solid transparent',
            }}
          >
            {rightMotion ? (
              <>
                {rightMotion.thumbnailUrl ? (
                  <img src={rightMotion.thumbnailUrl} alt={rightMotion.name} className="w-7 h-7 rounded object-cover" />
                ) : (
                  <span className="text-sm">{MOTION_TYPE_EMOJIS[rightMotion.motionType]}</span>
                )}
                <span className="text-[7px] font-bold" style={{ color: '#f093fb' }}>RIGHT</span>
              </>
            ) : (
              <>
                <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>—</span>
                <span className="text-[7px]" style={{ color: 'rgba(255,255,255,0.25)' }}>RIGHT</span>
              </>
            )}
          </div>
        </div>

        {/* ============ 2. 베이스 영상 섹션 ============ */}
        <section className="px-4 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>
              베이스 영상
            </h3>
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              최대 3개 · 추가 {CREDIT_COSTS.BASE_VIDEO_CREATE}C
            </span>
          </div>

          <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-1 px-1">
            {baseVideos.map((video) => (
              <div
                key={video.id}
                className="flex-shrink-0 relative rounded-[var(--radius-md)] overflow-hidden cursor-pointer transition-all"
                style={{
                  width: '80px',
                  height: '108px',
                  background: video.isActive ? 'rgba(100,200,255,0.08)' : 'var(--bg-card)',
                  border: `2px solid ${video.isActive ? 'var(--accent-holo)' : 'var(--border-card)'}`,
                  boxShadow: video.isActive ? '0 0 12px rgba(100,200,255,0.15)' : 'none',
                }}
                onClick={() => activateVideo(video.id)}
              >
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  {video.thumbnailUrl ? (
                    <>
                      <img src={video.thumbnailUrl} alt={video.name} className="w-full h-full object-cover rounded-[var(--radius-md)]" />
                      {video.isActive && (
                        <span
                          className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[7px] px-1.5 py-0.5 rounded-full font-bold"
                          style={{ background: 'rgba(0,0,0,0.6)', color: 'var(--accent-holo)' }}
                        >
                          활성
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="text-xl mb-0.5">{video.emoji}</span>
                      <span className="text-[9px] font-semibold px-1 text-center leading-tight" style={{ color: 'var(--text-secondary)' }}>
                        {video.name}
                      </span>
                      {video.isActive && (
                        <span className="text-[7px] mt-1 px-1.5 py-0.5 rounded-full font-bold" style={{ background: 'rgba(100,200,255,0.2)', color: 'var(--accent-holo)' }}>
                          활성
                        </span>
                      )}
                    </>
                  )}
                </div>

                {/* X 삭제 버튼 */}
                {baseVideos.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteModal({ type: 'video', id: video.id, name: video.name, emoji: video.emoji });
                    }}
                    className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px]"
                    style={{ background: 'rgba(196,92,74,0.7)', color: '#fff' }}
                  >
                    ✕
                  </button>
                )}

                {video.isActive && (
                  <div
                    className="absolute bottom-0 left-0 right-0 h-[2px]"
                    style={{ background: 'linear-gradient(90deg, transparent, var(--accent-holo), transparent)', animation: 'scan-bar 2s linear infinite' }}
                  />
                )}
              </div>
            ))}

            {/* + 추가 카드 */}
            {baseVideos.length < 3 && (
              <button
                className="flex-shrink-0 rounded-[var(--radius-md)] flex flex-col items-center justify-center gap-1 transition-all active:scale-[0.95]"
                style={{ width: '80px', height: '108px', border: '2px dashed var(--border-card)', background: 'transparent' }}
                onClick={() => {
                  if (petId) {
                    router.push(`/pets/${petId}/profiles/new?profileId=${profileId}`);
                  } else {
                    router.push(`/pets/unknown/profiles/new?profileId=${profileId}`);
                  }
                }}
              >
                <span className="text-lg" style={{ color: 'var(--text-muted)' }}>+</span>
                <span className="text-[8px] font-bold" style={{ color: 'var(--text-muted)' }}>
                  추가 ({CREDIT_COSTS.BASE_VIDEO_CREATE}C)
                </span>
              </button>
            )}
          </div>
        </section>

        {/* ============ 3. 모션 영상 — 12칸 고정 그리드 ============ */}
        <section className="px-4 pb-4 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>
              모션 영상
            </h3>
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              추가 {CREDIT_COSTS.MOTION_CREATE}C · 삭제 시 50% 환불
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {ALL_MOTION_TYPES.map((motionType) => {
              const purchased = motions.find((m) => m.motionType === motionType);

              if (purchased) {
                // ===== 구매된 모션 카드 =====
                const isPlaying = playingVideoId === purchased.id;
                const posColor = purchased.position === 'LEFT' ? '#667eea' : purchased.position === 'RIGHT' ? '#f093fb' : undefined;

                return (
                  <div
                    key={motionType}
                    className="rounded-[var(--radius-md)] overflow-hidden relative transition-all"
                    style={{
                      background: posColor ? `${posColor}11` : 'var(--bg-card)',
                      border: `1.5px solid ${posColor || 'var(--border-card)'}`,
                    }}
                  >
                    {/* 썸네일 / 영상 영역 */}
                    <div
                      className="relative flex items-center justify-center cursor-pointer"
                      style={{ aspectRatio: '1' }}
                      onClick={() => {
                        if (purchased.videoUrl) {
                          setPlayingVideoId(isPlaying ? null : purchased.id);
                        }
                      }}
                    >
                      {isPlaying && purchased.videoUrl ? (
                        <video
                          src={purchased.videoUrl}
                          autoPlay
                          muted
                          playsInline
                          onEnded={() => setPlayingVideoId(null)}
                          className="w-full h-full object-cover"
                        />
                      ) : (purchased.thumbnailUrl || purchased.gifUrl) ? (
                        <>
                          <img src={purchased.thumbnailUrl || purchased.gifUrl || ''} alt={purchased.name} className="w-full h-full object-cover" />
                          {purchased.videoUrl && (
                            <span className="absolute inset-0 flex items-center justify-center text-lg" style={{ background: 'rgba(0,0,0,0.2)' }}>
                              ▶
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-xl">{MOTION_TYPE_EMOJIS[motionType]}</span>
                      )}

                      {/* 상태 배지 */}
                      {purchased.status === 'PENDING' && (
                        <span className="absolute top-1 left-1 px-1 rounded text-[6px] font-bold" style={{ background: 'rgba(196,137,77,0.4)', color: '#c4894d' }}>
                          생성중
                        </span>
                      )}

                      {/* 방향 배지 */}
                      {purchased.position !== 'NONE' && (
                        <span
                          className="absolute top-1 right-1 px-1 py-0.5 rounded text-[6px] font-bold"
                          style={{ background: `${posColor}33`, color: posColor }}
                        >
                          {purchased.position}
                        </span>
                      )}
                    </div>

                    {/* 이름 + 인라인 버튼 */}
                    <div className="px-1.5 py-1.5">
                      <p className="text-[9px] font-semibold text-center truncate mb-1" style={{ color: 'var(--text-secondary)' }}>
                        {purchased.name}
                      </p>
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => assignMotion(purchased.id, purchased.position === 'LEFT' ? 'NONE' : 'LEFT')}
                          className="px-1.5 py-0.5 rounded text-[8px] font-bold transition-all"
                          style={{
                            background: purchased.position === 'LEFT' ? '#667eea' : 'rgba(102,126,234,0.1)',
                            color: purchased.position === 'LEFT' ? '#fff' : '#667eea',
                            border: '1px solid rgba(102,126,234,0.3)',
                          }}
                        >
                          ◀
                        </button>
                        <button
                          onClick={() => assignMotion(purchased.id, purchased.position === 'RIGHT' ? 'NONE' : 'RIGHT')}
                          className="px-1.5 py-0.5 rounded text-[8px] font-bold transition-all"
                          style={{
                            background: purchased.position === 'RIGHT' ? '#f093fb' : 'rgba(240,147,251,0.1)',
                            color: purchased.position === 'RIGHT' ? '#fff' : '#f093fb',
                            border: '1px solid rgba(240,147,251,0.3)',
                          }}
                        >
                          ▶
                        </button>
                        <button
                          onClick={() =>
                            setDeleteModal({
                              type: 'motion',
                              id: purchased.id,
                              name: purchased.name,
                              emoji: MOTION_TYPE_EMOJIS[motionType],
                              position: purchased.position,
                            })
                          }
                          className="px-1.5 py-0.5 rounded text-[8px] transition-all"
                          style={{ background: 'rgba(196,92,74,0.1)', color: 'var(--accent-red)', border: '1px solid rgba(196,92,74,0.2)' }}
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              // ===== 잠긴 슬롯 (미구매) =====
              return (
                <button
                  key={motionType}
                  onClick={() => {
                    if (userCredits < CREDIT_COSTS.MOTION_CREATE) {
                      setCreditUpsellModal({ needed: CREDIT_COSTS.MOTION_CREATE, action: MOTION_TYPE_LABELS[motionType] });
                      return;
                    }
                    setPurchaseModal({ motionType, label: MOTION_TYPE_LABELS[motionType] });
                  }}
                  className="rounded-[var(--radius-md)] flex flex-col items-center justify-center gap-1.5 transition-all active:scale-[0.97]"
                  style={{
                    aspectRatio: '0.75',
                    background: 'rgba(74,52,42,0.03)',
                    border: '1.5px dashed var(--border-card)',
                    opacity: 0.5,
                  }}
                >
                  <span className="text-xl">🔒</span>
                  <span className="text-[9px] font-semibold text-center leading-tight" style={{ color: 'var(--text-muted)' }}>
                    {MOTION_TYPE_LABELS[motionType]}
                  </span>
                  <span className="text-[8px] font-bold" style={{ color: 'var(--accent-warm)' }}>
                    {CREDIT_COSTS.MOTION_CREATE}C
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* 플레이어로 이동 버튼 */}
        <div className="px-4 pb-6">
          <Button fullWidth onClick={() => router.push(`/player/${profileId}`)}>
            ▶ 플레이어에서 확인하기
          </Button>
        </div>
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
              <Button fullWidth onClick={() => { setCreditUpsellModal(null); router.push('/store'); }}>
                충전하러 가기
              </Button>
            </div>
          </>
        )}
      </Modal>
    </MobileLayout>
  );
}
