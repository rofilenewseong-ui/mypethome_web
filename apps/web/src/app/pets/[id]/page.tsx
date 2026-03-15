'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { petsApi, profilesApi } from '@/lib/api';
import MobileLayout from '@/components/layout/MobileLayout';
import { Button, Card, Skeleton, EmptyState, Avatar, Badge, FormField, Modal } from '@/components/ui';
import { useToastStore } from '@/stores/useToastStore';

interface Profile {
  id: string;
  type: 'STANDING' | 'SITTING';
  status: string;
  gifUrl?: string;
  videoUrl?: string;
  baseVideoCount: number;
  motionCount: number;
}

interface PetDetail {
  id: string;
  name: string;
  species?: string;
  gender?: string;
  breed: string;
  frontPhotoUrl?: string;
  sidePhotoUrl?: string;
  birthDate?: string;
  passingDate?: string;
  favoriteSnack?: string;
  walkingPlace?: string;
  memo?: string;
}

const demoPet: PetDetail = {
  id: '1',
  name: '코코',
  breed: '포메라니안',
  species: '강아지',
  gender: '남아',
  birthDate: '2015-03-12',
  passingDate: '2024-11-08',
  favoriteSnack: '닭가슴살',
  walkingPlace: '한강공원',
};

const demoProfiles: Profile[] = [
  { id: 'p1', type: 'STANDING', status: 'COMPLETED', gifUrl: '', baseVideoCount: 1, motionCount: 2 },
  { id: 'p2', type: 'SITTING', status: 'COMPLETED', gifUrl: '', baseVideoCount: 1, motionCount: 1 },
];

export default function PetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const petId = params.id as string;
  const addToast = useToastStore((s) => s.addToast);

  const [pet, setPet] = useState<PetDetail>(demoPet);
  const [profiles, setProfiles] = useState<Profile[]>(demoProfiles);
  const [isLoading, setIsLoading] = useState(true);

  // 편집 모드
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<PetDetail>>({});
  const [isSaving, setIsSaving] = useState(false);

  // 사진 확대 보기
  const [viewingPhoto, setViewingPhoto] = useState<{ url: string; label: string } | null>(null);

  // 사진 변경
  const frontInputRef = useRef<HTMLInputElement>(null);
  const sideInputRef = useRef<HTMLInputElement>(null);
  const [newFrontPhoto, setNewFrontPhoto] = useState<string | null>(null);
  const [newSidePhoto, setNewSidePhoto] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [petRes, profilesRes] = await Promise.allSettled([
          petsApi.get(petId),
          profilesApi.list(petId),
        ]);

        if (petRes.status === 'fulfilled' && petRes.value.data?.data) {
          const p = petRes.value.data.data;
          setPet({
            id: p.id,
            name: p.name,
            breed: p.breed || '',
            species: p.species,
            gender: p.gender,
            frontPhotoUrl: p.frontPhotoUrl,
            sidePhotoUrl: p.sidePhotoUrl,
            birthDate: p.birthDate,
            passingDate: p.passingDate,
            favoriteSnack: p.favoriteSnack,
            walkingPlace: p.walkingPlace,
            memo: p.memo,
          });
        }

        if (profilesRes.status === 'fulfilled' && profilesRes.value.data?.data) {
          setProfiles(
            profilesRes.value.data.data.map((pr: Record<string, unknown>) => ({
              id: pr.id as string,
              type: (pr.type as string) || 'STANDING',
              status: (pr.status as string) || 'COMPLETED',
              gifUrl: pr.gifUrl as string,
              videoUrl: pr.videoUrl as string,
              baseVideoCount: (pr.baseVideoCount as number) || 0,
              motionCount: (pr.motionCount as number) || 0,
            }))
          );
        }
      } catch {
        // 데모 데이터 유지
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [petId]);

  const startEdit = () => {
    setEditForm({
      name: pet.name,
      species: pet.species,
      gender: pet.gender,
      breed: pet.breed,
      birthDate: pet.birthDate,
      passingDate: pet.passingDate,
      favoriteSnack: pet.favoriteSnack,
      walkingPlace: pet.walkingPlace,
      memo: pet.memo,
    });
    setNewFrontPhoto(null);
    setNewSidePhoto(null);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditForm({});
    setNewFrontPhoto(null);
    setNewSidePhoto(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updateData: Record<string, unknown> = {};
      if (editForm.name && editForm.name !== pet.name) updateData.name = editForm.name;
      if (editForm.species !== pet.species) updateData.species = editForm.species;
      if (editForm.gender !== pet.gender) updateData.gender = editForm.gender;
      if (editForm.breed !== pet.breed) updateData.breed = editForm.breed;
      if (editForm.birthDate !== pet.birthDate) updateData.birthDate = editForm.birthDate;
      if (editForm.passingDate !== pet.passingDate) updateData.passingDate = editForm.passingDate;
      if (editForm.favoriteSnack !== pet.favoriteSnack) updateData.favoriteSnack = editForm.favoriteSnack;
      if (editForm.walkingPlace !== pet.walkingPlace) updateData.walkingPlace = editForm.walkingPlace;
      if (editForm.memo !== pet.memo) updateData.memo = editForm.memo;

      if (Object.keys(updateData).length > 0) {
        try {
          await petsApi.update(petId, updateData);
        } catch {
          // 데모 모드 - 로컬 반영
        }
      }

      setPet((prev) => ({
        ...prev,
        ...editForm,
        frontPhotoUrl: newFrontPhoto || prev.frontPhotoUrl,
        sidePhotoUrl: newSidePhoto || prev.sidePhotoUrl,
      }));
      setIsEditing(false);
    } catch {
      addToast('저장에 실패했습니다. 다시 시도해주세요.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'front' | 'side') => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      addToast('사진 크기는 10MB 이하로 보내주세요.', 'warning');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      if (type === 'front') setNewFrontPhoto(reader.result as string);
      else setNewSidePhoto(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const typeLabel = (type: string) =>
    type === 'STANDING' ? '서있는 자세' : type === 'SITTING' ? '앉은 자세' : type;

  const currentFrontPhoto = isEditing ? (newFrontPhoto || pet.frontPhotoUrl) : pet.frontPhotoUrl;
  const currentSidePhoto = isEditing ? (newSidePhoto || pet.sidePhotoUrl) : pet.sidePhotoUrl;

  return (
    <MobileLayout title={pet.name} showBack>
      <div className="p-5 space-y-5 animate-fade-in">

        {/* ── 펫 정보 섹션 ─────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              내 아이 정보
            </h3>
            {!isEditing ? (
              <button
                onClick={startEdit}
                className="text-xs font-semibold"
                style={{ color: 'var(--accent-warm)' }}
              >
                ✏️ 수정
              </button>
            ) : (
              <button
                onClick={cancelEdit}
                className="text-xs font-semibold"
                style={{ color: 'var(--text-muted)' }}
              >
                취소
              </button>
            )}
          </div>

          {/* 사진 영역 */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {/* 정면 사진 */}
            <div>
              <p className="text-[10px] font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                정면 사진
              </p>
              <div
                className="relative rounded-[var(--radius-md)] overflow-hidden"
                style={{
                  aspectRatio: '0.85',
                  background: currentFrontPhoto ? '#000' : 'var(--bg-card)',
                  border: currentFrontPhoto ? '2px solid var(--accent-green)' : '2px dashed var(--border-card)',
                }}
              >
                {currentFrontPhoto ? (
                  <button
                    className="w-full h-full"
                    onClick={() => isEditing ? frontInputRef.current?.click() : setViewingPhoto({ url: currentFrontPhoto, label: '정면 사진' })}
                  >
                    <img src={currentFrontPhoto} alt="정면" className="w-full h-full object-cover" />
                    {isEditing && (
                      <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.3)' }}>
                        <span className="text-white text-xs font-bold">📷 변경</span>
                      </div>
                    )}
                  </button>
                ) : (
                  <button
                    className="absolute inset-0 flex flex-col items-center justify-center w-full h-full"
                    onClick={() => isEditing ? frontInputRef.current?.click() : undefined}
                    disabled={!isEditing}
                  >
                    <span className="text-3xl mb-1">🐾</span>
                    <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
                      {isEditing ? '탭하여 업로드' : '사진 없음'}
                    </span>
                  </button>
                )}
                <input ref={frontInputRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={(e) => handlePhotoChange(e, 'front')} />
              </div>
            </div>

            {/* 전신 사진 */}
            <div>
              <p className="text-[10px] font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                전신 사진
              </p>
              <div
                className="relative rounded-[var(--radius-md)] overflow-hidden"
                style={{
                  aspectRatio: '0.85',
                  background: currentSidePhoto ? '#000' : 'var(--bg-card)',
                  border: currentSidePhoto ? '2px solid var(--accent-green)' : '2px dashed var(--border-card)',
                }}
              >
                {currentSidePhoto ? (
                  <button
                    className="w-full h-full"
                    onClick={() => isEditing ? sideInputRef.current?.click() : setViewingPhoto({ url: currentSidePhoto, label: '전신 사진' })}
                  >
                    <img src={currentSidePhoto} alt="전신" className="w-full h-full object-cover" />
                    {isEditing && (
                      <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.3)' }}>
                        <span className="text-white text-xs font-bold">📷 변경</span>
                      </div>
                    )}
                  </button>
                ) : (
                  <button
                    className="absolute inset-0 flex flex-col items-center justify-center w-full h-full"
                    onClick={() => isEditing ? sideInputRef.current?.click() : undefined}
                    disabled={!isEditing}
                  >
                    <span className="text-3xl mb-1">🐾</span>
                    <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
                      {isEditing ? '탭하여 업로드' : '사진 없음'}
                    </span>
                  </button>
                )}
                <input ref={sideInputRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={(e) => handlePhotoChange(e, 'side')} />
              </div>
            </div>
          </div>

          {/* 펫 정보 */}
          {isEditing ? (
            <div className="space-y-3">
              <FormField icon="🐾" label="이름" required value={editForm.name || ''} onChange={(v) => setEditForm((p) => ({ ...p, name: v }))} placeholder="이름" />

              {/* 반려동물 종류 선택 */}
              <div>
                <div className="flex items-center gap-1 mb-1.5">
                  <span className="text-sm">🐾</span>
                  <span className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>반려동물</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: '강아지', emoji: '🐕' },
                    { value: '고양이', emoji: '🐈' },
                    { value: '기타', emoji: '🐾' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setEditForm((p) => ({ ...p, species: opt.value }))}
                      className="py-2.5 rounded-[var(--radius-md)] text-xs font-semibold transition-all"
                      style={{
                        background: editForm.species === opt.value ? 'var(--accent-warm)' : 'var(--bg-card)',
                        color: editForm.species === opt.value ? '#fff' : 'var(--text-secondary)',
                        border: `1.5px solid ${editForm.species === opt.value ? 'var(--accent-warm)' : 'var(--border-card)'}`,
                      }}
                    >
                      {opt.emoji} {opt.value}
                    </button>
                  ))}
                </div>
              </div>

              {/* 성별 선택 */}
              <div>
                <div className="flex items-center gap-1 mb-1.5">
                  <span className="text-sm">⚧</span>
                  <span className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>성별</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: '남아', emoji: '♂️' },
                    { value: '여아', emoji: '♀️' },
                    { value: '모름', emoji: '➖' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setEditForm((p) => ({ ...p, gender: opt.value }))}
                      className="py-2.5 rounded-[var(--radius-md)] text-xs font-semibold transition-all"
                      style={{
                        background: editForm.gender === opt.value ? 'var(--accent-warm)' : 'var(--bg-card)',
                        color: editForm.gender === opt.value ? '#fff' : 'var(--text-secondary)',
                        border: `1.5px solid ${editForm.gender === opt.value ? 'var(--accent-warm)' : 'var(--border-card)'}`,
                      }}
                    >
                      {opt.emoji} {opt.value}
                    </button>
                  ))}
                </div>
              </div>

              <FormField icon="🐕" label="품종" value={editForm.breed || ''} onChange={(v) => setEditForm((p) => ({ ...p, breed: v }))} placeholder="예: 포메라니안" />
              <FormField icon="🎂" label="생년월일" type="date" value={editForm.birthDate || ''} onChange={(v) => setEditForm((p) => ({ ...p, birthDate: v }))} />
              <FormField icon="🕊️" label="떠난 날" type="date" value={editForm.passingDate || ''} onChange={(v) => setEditForm((p) => ({ ...p, passingDate: v }))} />
              <FormField icon="🦴" label="좋아하는 간식" value={editForm.favoriteSnack || ''} onChange={(v) => setEditForm((p) => ({ ...p, favoriteSnack: v }))} placeholder="예: 닭가슴살" />
              <FormField icon="🌳" label="산책 장소" value={editForm.walkingPlace || ''} onChange={(v) => setEditForm((p) => ({ ...p, walkingPlace: v }))} placeholder="예: 한강공원" />
              <FormField icon="💬" label="메모" value={editForm.memo || ''} onChange={(v) => setEditForm((p) => ({ ...p, memo: v }))} placeholder="기억하고 싶은 것들..." multiline />

              <Button fullWidth loading={isSaving} onClick={handleSave}>
                저장하기
              </Button>
            </div>
          ) : (
            <Card hover={false}>
              <div className="space-y-2.5">
                <div className="flex items-center gap-3 pb-2.5" style={{ borderBottom: '1px solid var(--border-card)' }}>
                  <Avatar
                    src={pet.frontPhotoUrl || undefined}
                    fallback="🐾"
                    size="lg"
                  />
                  <div>
                    <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                      {pet.name}
                    </h2>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      {pet.breed || '품종 미입력'}
                    </p>
                  </div>
                </div>

                {pet.species && (
                  <InfoRow icon="🐾" label="반려동물" value={pet.species} />
                )}
                {pet.gender && (
                  <InfoRow icon="⚧" label="성별" value={pet.gender} />
                )}
                {pet.birthDate && (
                  <InfoRow icon="🎂" label="생년월일" value={pet.birthDate} />
                )}
                {pet.passingDate && (
                  <InfoRow icon="🕊️" label="떠난 날" value={pet.passingDate} />
                )}
                {pet.favoriteSnack && (
                  <InfoRow icon="🦴" label="좋아하는 간식" value={pet.favoriteSnack} />
                )}
                {pet.walkingPlace && (
                  <InfoRow icon="🌳" label="산책 장소" value={pet.walkingPlace} />
                )}
                {pet.memo && (
                  <div className="pt-1">
                    <p className="text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
                      💬 메모
                    </p>
                    <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {pet.memo}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          )}
        </section>

        {/* ── 프로필 섹션 ─────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              홀로그램 프로필 ({profiles.length})
            </h3>
            <button
              onClick={() => router.push(`/pets/${petId}/profiles/new`)}
              className="text-xs font-semibold"
              style={{ color: 'var(--accent-warm)' }}
            >
              + 프로필 등록
            </button>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 gap-3">
              <Skeleton height="0" className="!h-0 !pb-[140%]" count={2} />
            </div>
          ) : profiles.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {profiles.map((profile) => (
                <button
                  key={profile.id}
                  onClick={() => router.push(`/profiles/${profile.id}/settings`)}
                  className="rounded-[var(--radius-lg)] overflow-hidden text-left transition-all active:scale-[0.98]"
                  style={{ border: '1px solid var(--border-card)', background: 'var(--bg-card)' }}
                >
                  {/* 프로필 썸네일 */}
                  <div
                    className="relative w-full"
                    style={{ aspectRatio: '1/1', background: '#1a1a1a' }}
                  >
                    {profile.gifUrl ? (
                      <img src={profile.gifUrl} alt={typeLabel(profile.type)} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center">
                        <span className="text-3xl mb-1">🐾</span>
                        <span className="text-[9px] text-white/40">{typeLabel(profile.type)}</span>
                      </div>
                    )}
                    <div className="absolute top-2 left-2">
                      <Badge variant="status" pill={false}>
                        {profile.status === 'COMPLETED' ? '완료' : '생성 중'}
                      </Badge>
                    </div>
                  </div>

                  {/* 프로필 요약 정보 */}
                  <div className="p-3">
                    <p className="text-xs font-bold mb-0.5" style={{ color: 'var(--text-primary)' }}>
                      {typeLabel(profile.type)}
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      영상 {profile.baseVideoCount} · 모션 {profile.motionCount}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <Card hover={false}>
              <EmptyState
                emoji="🎬"
                description={'아직 프로필이 없습니다.\n홀로그램 프로필을 만들어 보세요.'}
                action={{ label: '프로필 등록하기', onClick: () => router.push(`/pets/${petId}/profiles/new`) }}
                className="py-8"
              />
            </Card>
          )}
        </section>
      </div>

      {/* 사진 확대 모달 */}
      <Modal isOpen={!!viewingPhoto} onClose={() => setViewingPhoto(null)} title={viewingPhoto?.label || ''}>
        {viewingPhoto && (
          <div className="flex justify-center">
            <img
              src={viewingPhoto.url}
              alt={viewingPhoto.label}
              className="max-w-full rounded-[var(--radius-md)]"
              style={{ maxHeight: '60vh', objectFit: 'contain' }}
            />
          </div>
        )}
      </Modal>
    </MobileLayout>
  );
}

/* ============ Sub-components ============ */

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
        {icon} {label}
      </span>
      <span className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>
        {value}
      </span>
    </div>
  );
}
