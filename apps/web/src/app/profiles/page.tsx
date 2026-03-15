'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { profilesApi, petsApi } from '@/lib/api';
import MobileLayout from '@/components/layout/MobileLayout';
import { Card, Skeleton, EmptyState, Badge, Alert } from '@/components/ui';

/* ============ 샘플 프로필 — 항상 하단 표시 ============ */
const SAMPLE_PROFILES = [
  {
    id: 'sample-dog',
    petName: '멍이',
    name: '강아지 샘플',
    emoji: '🐕',
  },
  {
    id: 'sample-cat',
    petName: '냥이',
    name: '고양이 샘플',
    emoji: '🐈',
  },
];

/* ============ localStorage 저장하기 ============ */
const SAVED_KEY = 'petholo_saved_profiles';

function getSavedMap(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(SAVED_KEY) || '{}');
  } catch {
    return {};
  }
}

function persistSavedMap(map: Record<string, number>) {
  localStorage.setItem(SAVED_KEY, JSON.stringify(map));
}

/* ============ Interfaces ============ */
interface Profile {
  id: string;
  petId: string;
  petName: string;
  name: string;
  type: 'STANDING' | 'SITTING';
  gifUrl?: string;
  status: 'COMPLETED' | 'GENERATING' | 'PENDING';
  baseVideoCount?: number;
  motionLeft?: string | null;
  motionRight?: string | null;
  createdAt?: string;
}

interface PetInfo {
  id: string;
  name: string;
  species?: string;
  breed?: string;
  frontPhoto?: string;
}

/* ============ 필터 타입 ============ */
type FilterType = 'all' | 'saved' | string; // string = petId

/* ============ 메인 페이지 ============ */
export default function ProfileListPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [registeredPetCount, setRegisteredPetCount] = useState(0);
  const [petList, setPetList] = useState<PetInfo[]>([]);
  const [showPetSheet, setShowPetSheet] = useState(false);
  const [savedMap, setSavedMapState] = useState<Record<string, number>>({});
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  // localStorage에서 저장 목록 로드
  useEffect(() => {
    setSavedMapState(getSavedMap());
  }, []);

  // 저장 토글
  const toggleSave = useCallback((profileId: string) => {
    setSavedMapState((prev) => {
      const next = { ...prev };
      if (next[profileId]) {
        delete next[profileId];
      } else {
        next[profileId] = Date.now();
      }
      persistSavedMap(next);
      return next;
    });
  }, []);

  const fetchProfiles = async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const [profilesRes, petsRes] = await Promise.allSettled([
        profilesApi.listAll(),
        petsApi.list(),
      ]);

      let petMap: Record<string, { name: string }> = {};

      if (petsRes.status === 'fulfilled') {
        const petsData = petsRes.value.data?.data || petsRes.value.data;
        if (Array.isArray(petsData)) {
          setRegisteredPetCount(petsData.length);
          const pets: PetInfo[] = [];
          petsData.forEach((p: Record<string, unknown>) => {
            const id = p.id as string;
            const name = (p.name as string) || '이름 없음';
            petMap[id] = { name };
            pets.push({
              id,
              name,
              species: (p.species as string) || undefined,
              breed: (p.breed as string) || undefined,
              frontPhoto: (p.frontPhoto as string) || undefined,
            });
          });
          setPetList(pets);
        } else {
          setRegisteredPetCount(0);
        }
      }

      if (profilesRes.status === 'fulfilled') {
        const profileData = profilesRes.value.data?.data || profilesRes.value.data;
        if (Array.isArray(profileData)) {
          setProfiles(
            profileData.map((p: Record<string, unknown>) => ({
              id: p.id as string,
              petId: p.petId as string,
              petName: petMap[p.petId as string]?.name || '펫',
              name: (p.name as string) || '',
              type: (p.type as 'STANDING' | 'SITTING') || 'STANDING',
              gifUrl: (p.gifUrl as string) || '',
              status: (p.status as Profile['status']) || 'COMPLETED',
              baseVideoCount: (p.baseVideoCount as number) || 1,
              motionLeft: (p.motionLeft as string) || null,
              motionRight: (p.motionRight as string) || null,
              createdAt: (p.createdAt as string) || '',
            }))
          );
        } else {
          setProfiles([]);
        }
      } else {
        // API 에러여도 빈 배열 — 샘플은 항상 표시됨
        setHasError(true);
        setProfiles([]);
      }
    } catch {
      setHasError(true);
      setProfiles([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  /* ---- 정렬 & 필터 로직 ---- */
  const completedProfiles = profiles.filter((p) => p.status === 'COMPLETED');
  const generatingProfiles = profiles.filter((p) => p.status === 'GENERATING');

  // 필터 적용
  const filteredProfiles = completedProfiles.filter((p) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'saved') return !!savedMap[p.id];
    return p.petId === activeFilter; // petId 필터
  });

  // 저장된 프로필: 저장 순서대로 (먼저 저장한 것 → 나중에 저장한 것)
  const savedUserProfiles = filteredProfiles
    .filter((p) => savedMap[p.id])
    .sort((a, b) => (savedMap[a.id] || 0) - (savedMap[b.id] || 0));

  // 미저장 프로필: 최신 생성순
  const unsavedUserProfiles = filteredProfiles
    .filter((p) => !savedMap[p.id])
    .sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return 0;
    });

  const hasRegisteredPets = registeredPetCount > 0;
  const hasUserProfiles = completedProfiles.length > 0;
  const hasFilteredProfiles = filteredProfiles.length > 0;
  const totalCount = completedProfiles.length + SAMPLE_PROFILES.length;

  // 필터 칩 데이터 구성
  const savedCount = completedProfiles.filter((p) => savedMap[p.id]).length;
  const filterChips: { key: FilterType; label: string; count: number }[] = [
    { key: 'all', label: '전체', count: completedProfiles.length },
    ...(savedCount > 0 ? [{ key: 'saved' as FilterType, label: '⭐ 저장됨', count: savedCount }] : []),
    ...petList.map((pet) => ({
      key: pet.id as FilterType,
      label: `${pet.species === 'cat' ? '🐈' : '🐕'} ${pet.name}`,
      count: completedProfiles.filter((p) => p.petId === pet.id).length,
    })).filter((chip) => chip.count > 0),
  ];

  const handleAddProfile = () => {
    if (petList.length > 0) {
      setShowPetSheet(true);
    } else if (hasRegisteredPets) {
      router.push('/profiles/new');
    } else {
      router.push('/pets/register');
    }
  };

  return (
    <MobileLayout title="프로필 목록" showBack>
      <div className="p-5 space-y-5 animate-fade-in">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            바로 재생 · 저장 관리
          </p>
          <Badge>총 {totalCount}개</Badge>
        </div>

        {/* 필터 칩 (프로필이 있을 때만) */}
        {!isLoading && hasUserProfiles && filterChips.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-5 px-5 scrollbar-hide">
            {filterChips.map((chip) => (
              <button
                key={chip.key}
                onClick={() => setActiveFilter(chip.key)}
                className="flex-shrink-0 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all whitespace-nowrap"
                style={{
                  background:
                    activeFilter === chip.key
                      ? 'var(--accent-blue)'
                      : 'var(--bg-card)',
                  color:
                    activeFilter === chip.key
                      ? '#fff'
                      : 'var(--text-secondary)',
                  border:
                    activeFilter === chip.key
                      ? 'none'
                      : '1px solid var(--border-card)',
                }}
              >
                {chip.label}
                <span
                  className="ml-1 text-[9px]"
                  style={{
                    opacity: activeFilter === chip.key ? 0.8 : 0.5,
                  }}
                >
                  {chip.count}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* 생성 중 알림 */}
        {generatingProfiles.length > 0 && (
          <Alert variant="info" icon="⏳">
            <p className="font-bold">{generatingProfiles.length}개 영상 생성 중...</p>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              완료되면 자동으로 추가됩니다
            </p>
          </Alert>
        )}

        {/* API 에러 배너 (렌더링 차단하지 않음) */}
        {hasError && !isLoading && (
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-sm)]"
            style={{
              background: 'rgba(220,120,60,0.08)',
              border: '1px solid rgba(220,120,60,0.15)',
            }}
          >
            <span className="text-sm">⚠️</span>
            <p className="flex-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
              서버 연결에 실패했습니다. 아래 샘플은 확인 가능합니다.
            </p>
            <button
              onClick={fetchProfiles}
              className="text-[10px] font-bold px-2 py-1 rounded"
              style={{ color: 'var(--accent-orange)' }}
            >
              재시도
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-3 gap-2.5">
            <Skeleton height="0" className="!h-0 !pb-[143%]" count={6} />
          </div>
        ) : (
          <div className="space-y-5">
            {/* ⭐ 저장된 프로필 */}
            {savedUserProfiles.length > 0 && (
              <div>
                <p
                  className="text-[11px] font-bold mb-2.5 flex items-center gap-1"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <span>⭐</span> 저장됨
                  <span className="text-[10px] font-normal" style={{ color: 'var(--text-muted)' }}>
                    · {savedUserProfiles.length}개
                  </span>
                </p>
                <div className="grid grid-cols-3 gap-2.5">
                  {savedUserProfiles.map((profile) => (
                    <ProfileCard
                      key={profile.id}
                      profile={profile}
                      router={router}
                      isSaved
                      onToggleSave={() => toggleSave(profile.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 📁 내 프로필 (미저장, 최신순) */}
            {unsavedUserProfiles.length > 0 && (
              <div>
                <p
                  className="text-[11px] font-bold mb-2.5 flex items-center gap-1"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <span>📁</span> 내 프로필
                  <span className="text-[10px] font-normal" style={{ color: 'var(--text-muted)' }}>
                    · {unsavedUserProfiles.length}개
                  </span>
                </p>
                <div className="grid grid-cols-3 gap-2.5">
                  {unsavedUserProfiles.map((profile) => (
                    <ProfileCard
                      key={profile.id}
                      profile={profile}
                      router={router}
                      isSaved={false}
                      onToggleSave={() => toggleSave(profile.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 유저 프로필 없을 때 안내 */}
            {!hasUserProfiles && (
              <Card hover={false}>
                <EmptyState
                  emoji={hasRegisteredPets ? '🐾' : '📁'}
                  title={hasRegisteredPets ? '새 프로필을 만들어 보세요' : '아직 프로필이 없습니다'}
                  description={
                    hasRegisteredPets
                      ? `등록된 펫 ${registeredPetCount}마리로\n프로필을 만들 수 있습니다.`
                      : '프로필을 만들려면 먼저 펫을 등록해 주세요.'
                  }
                  action={{
                    label: hasRegisteredPets ? '프로필 만들기' : '펫 등록하기',
                    onClick: handleAddProfile,
                  }}
                  className="py-6"
                />
              </Card>
            )}

            {/* 필터 결과 없을 때 */}
            {hasUserProfiles && !hasFilteredProfiles && activeFilter !== 'all' && (
              <Card hover={false}>
                <EmptyState
                  emoji="🔍"
                  title="해당하는 프로필이 없습니다"
                  description="다른 필터를 선택해 보세요."
                  action={{
                    label: '전체 보기',
                    onClick: () => setActiveFilter('all'),
                  }}
                  className="py-6"
                />
              </Card>
            )}

            {/* 🎬 샘플 영상 — 항상 표시 */}
            <div>
              <p
                className="text-[11px] font-bold mb-2.5 flex items-center gap-1"
                style={{ color: 'var(--text-secondary)' }}
              >
                <span>🎬</span> 샘플 영상
              </p>
              <div className="grid grid-cols-3 gap-2.5">
                {SAMPLE_PROFILES.map((sp) => (
                  <SampleCard key={sp.id} sample={sp} router={router} />
                ))}

                {/* + 새 프로필 만들기 카드 */}
                <button
                  onClick={handleAddProfile}
                  className="rounded-[var(--radius-lg)] overflow-hidden relative flex flex-col items-center justify-center transition-all active:scale-[0.97]"
                  style={{
                    aspectRatio: '1',
                    border: '2px dashed var(--border-card)',
                    background: 'var(--bg-card)',
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-lg mb-2"
                    style={{
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-card)',
                    }}
                  >
                    <span style={{ color: 'var(--text-muted)' }}>+</span>
                  </div>
                  <p className="text-[10px] font-bold" style={{ color: 'var(--text-secondary)' }}>
                    새 프로필
                  </p>
                  <p className="text-[8px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {hasRegisteredPets ? '펫 선택하기' : '펫 등록 후 생성'}
                  </p>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 펫 선택 바텀시트 */}
      {showPetSheet && (
        <>
          <div
            className="fixed inset-0 animate-fade-in"
            style={{ background: 'rgba(0,0,0,0.5)', zIndex: 9998 }}
            onClick={() => setShowPetSheet(false)}
          />
          <div
            className="fixed bottom-0 left-0 right-0 rounded-t-[20px] p-5 pb-8 animate-slide-up"
            style={{
              background: 'var(--bg-primary)',
              maxHeight: '70vh',
              overflowY: 'auto',
              zIndex: 9999,
            }}
          >
            <div
              className="w-10 h-1 rounded-full mx-auto mb-4"
              style={{ background: 'var(--border-card)' }}
            />
            <p className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
              어떤 펫의 프로필을 만들까요?
            </p>
            <p className="text-[10px] mb-4" style={{ color: 'var(--text-muted)' }}>
              등록된 펫을 선택하거나, 새로 등록할 수 있습니다
            </p>

            <div className="grid grid-cols-2 gap-3">
              {petList.map((pet) => (
                <button
                  key={pet.id}
                  onClick={() => {
                    setShowPetSheet(false);
                    router.push(`/pets/${pet.id}/profiles/new`);
                  }}
                  className="rounded-[var(--radius-lg)] p-4 flex flex-col items-center gap-2 transition-all active:scale-[0.97]"
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-card)',
                  }}
                >
                  {pet.frontPhoto ? (
                    <div
                      className="w-14 h-14 rounded-full overflow-hidden"
                      style={{ border: '2px solid var(--border-card)' }}
                    >
                      <img
                        src={pet.frontPhoto}
                        alt={pet.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center text-2xl"
                      style={{
                        background: 'var(--bg-primary)',
                        border: '2px solid var(--border-card)',
                      }}
                    >
                      🐾
                    </div>
                  )}
                  <div className="text-center">
                    <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                      {pet.name}
                    </p>
                    {pet.breed && (
                      <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
                        {pet.breed}
                      </p>
                    )}
                  </div>
                </button>
              ))}

              <button
                onClick={() => {
                  setShowPetSheet(false);
                  router.push('/pets/register');
                }}
                className="rounded-[var(--radius-lg)] p-4 flex flex-col items-center gap-2 transition-all active:scale-[0.97]"
                style={{
                  border: '2px dashed var(--border-card)',
                  background: 'transparent',
                }}
              >
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-xl"
                  style={{ background: 'var(--bg-card)' }}
                >
                  +
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                    새로 등록
                  </p>
                  <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
                    새 펫 등록하기
                  </p>
                </div>
              </button>
            </div>
          </div>
        </>
      )}
    </MobileLayout>
  );
}

/* ============ 샘플 카드 컴포넌트 ============ */

function SampleCard({
  sample,
  router,
}: {
  sample: (typeof SAMPLE_PROFILES)[number];
  router: ReturnType<typeof useRouter>;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {/* 1:1 이미지 — 클릭하면 설정 */}
      <button
        onClick={() => router.push(`/profiles/${sample.id}/settings`)}
        className="rounded-[var(--radius-lg)] overflow-hidden relative transition-all active:scale-[0.97]"
        style={{
          aspectRatio: '1',
          background: 'linear-gradient(135deg, #1e1e1e 0%, #0d0d0d 100%)',
          border: '1px solid var(--border-card)',
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 50% 40%, rgba(100,200,255,0.08) 0%, transparent 70%)',
          }}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl mb-1">{sample.emoji}</span>
          <p className="text-[10px] text-white/60 font-bold">{sample.petName}</p>
        </div>
        <div className="absolute top-1.5 left-1.5">
          <Badge variant="info" pill={false}>샘플</Badge>
        </div>
      </button>

      {/* 하단: 재생 버튼만 크게 */}
      <button
        onClick={() => router.push(`/player/${sample.id}`)}
        className="w-full rounded-[var(--radius-sm)] flex items-center justify-center py-2 transition-all active:scale-[0.95]"
        style={{ background: 'var(--accent-blue)' }}
      >
        <span className="text-sm text-white">▶</span>
      </button>
    </div>
  );
}

/* ============ 프로필 카드 컴포넌트 ============ */

function ProfileCard({
  profile,
  router,
  isSaved,
  onToggleSave,
}: {
  profile: Profile;
  router: ReturnType<typeof useRouter>;
  isSaved: boolean;
  onToggleSave: () => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {/* 1:1 이미지 — 클릭하면 설정 */}
      <button
        onClick={() => router.push(`/profiles/${profile.id}/settings`)}
        className="rounded-[var(--radius-lg)] overflow-hidden relative transition-all active:scale-[0.97]"
        style={{
          aspectRatio: '1',
          background: '#0a0a0a',
          border: isSaved
            ? '2px solid var(--accent-orange)'
            : '1px solid var(--border-card)',
        }}
      >
        {profile.gifUrl ? (
          <img
            src={profile.gifUrl}
            alt={`${profile.petName} ${profile.name}`}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl mb-1">🐾</span>
            <span className="text-[8px] text-white/30">미리보기</span>
          </div>
        )}

        {/* 상단 왼쪽: 타입 배지 */}
        <div className="absolute top-1.5 left-1.5">
          <Badge
            pill={false}
            color={profile.type === 'STANDING' ? 'var(--accent-blue)' : 'var(--accent-warm)'}
          >
            {profile.type}
          </Badge>
        </div>

        {/* 상단 오른쪽: ⭐ 저장 토글 */}
        <div
          onClick={(e) => { e.stopPropagation(); onToggleSave(); }}
          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center transition-all active:scale-[0.85]"
          style={{
            background: isSaved ? 'var(--accent-orange)' : 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(4px)',
          }}
        >
          <span className="text-[10px]">{isSaved ? '⭐' : '☆'}</span>
        </div>
      </button>

      {/* 하단: 재생 버튼만 크게 */}
      <button
        onClick={() => router.push(`/player/${profile.id}`)}
        className="w-full rounded-[var(--radius-sm)] flex items-center justify-center py-2 transition-all active:scale-[0.95]"
        style={{ background: 'var(--accent-blue)' }}
      >
        <span className="text-sm text-white">▶</span>
      </button>
    </div>
  );
}
