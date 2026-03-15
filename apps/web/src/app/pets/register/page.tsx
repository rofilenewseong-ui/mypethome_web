'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { petsApi } from '@/lib/api';
import MobileLayout from '@/components/layout/MobileLayout';
import { Button, Card, FormField, Stepper } from '@/components/ui';
import { useToastStore } from '@/stores/useToastStore';

interface PetFormData {
  name: string;
  species: string;
  gender: string;
  birthDate: string;
  passingDate: string;
  breed: string;
  favoriteSnack: string;
  walkingPlace: string;
  memo: string;
  personality: string;
}

export default function PetRegisterPage() {
  const router = useRouter();
  const addToast = useToastStore((s) => s.addToast);
  const [step, setStep] = useState(1);
  const [frontPhoto, setFrontPhoto] = useState<string | null>(null);
  const [sidePhoto, setSidePhoto] = useState<string | null>(null);
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [sideFile, setSideFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [createdPetId, setCreatedPetId] = useState<string | null>(null);
  const frontInputRef = useRef<HTMLInputElement>(null);
  const sideInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<PetFormData>({
    name: '',
    species: '',
    gender: '',
    birthDate: '',
    passingDate: '',
    breed: '',
    favoriteSnack: '',
    walkingPlace: '',
    memo: '',
    personality: '',
  });
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof PetFormData, string>>>({});

  const handlePhotoUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'front' | 'side'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      addToast('사진 크기는 10MB 이하로 보내주세요.', 'warning');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // 이미지 해상도 검증 (최소 512x512, AI 품질 보장)
      const img = new Image();
      img.onload = () => {
        if (img.width < 512 || img.height < 512) {
          addToast(`사진 해상도가 너무 낮습니다 (${img.width}x${img.height}). 최소 512x512 이상의 사진을 사용해 주세요.`, 'warning');
          return;
        }
        if (type === 'front') {
          setFrontPhoto(result);
          setFrontFile(file);
        } else {
          setSidePhoto(result);
          setSideFile(file);
        }
      };
      img.onerror = () => {
        addToast('이미지를 읽을 수 없습니다. 다른 사진을 시도해 주세요.', 'error');
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const handleInputChange = (field: keyof PetFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // 입력 시 해당 필드 에러 클리어
    if (formErrors[field]) {
      setFormErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });
    }
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof PetFormData, string>> = {};
    if (!formData.name.trim()) {
      errors.name = '이름을 입력해 주세요';
    } else if (formData.name.trim().length > 50) {
      errors.name = '이름은 50자 이하로 입력해 주세요';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const canProceedStep1 = frontPhoto && sidePhoto;
  const canSubmit = formData.name.trim().length > 0;

  const handleSubmit = async () => {
    if (!canSubmit || !frontFile) return;
    if (!validateForm()) return;
    setIsSubmitting(true);

    try {
      const fd = new FormData();
      fd.append('frontPhoto', frontFile);
      if (sideFile) fd.append('sidePhoto', sideFile);
      Object.entries(formData).forEach(([key, val]) => {
        if (val) fd.append(key, val);
      });

      let petId = 'demo-pet-1';
      try {
        const res = await petsApi.create(fd);
        const petData = res.data?.data || res.data;
        petId = petData?.id || 'demo-pet-1';
      } catch {
        // 고유 ID 생성 (demo-pet-timestamp)
        petId = `demo-pet-${Date.now()}`;
        await new Promise((r) => setTimeout(r, 1500));
      }

      setCreatedPetId(petId);

      // 사진 데이터를 localStorage에 저장 (프로필 생성 시 활용)
      if (typeof window !== 'undefined') {
        const petPhotos = {
          name: formData.name,
          frontPhoto: frontPhoto || '',
          sidePhoto: sidePhoto || '',
          breed: formData.breed || '',
        };
        localStorage.setItem(`petholo_pet_${petId}`, JSON.stringify(petPhotos));
      }

      setIsComplete(true);
    } catch {
      addToast('죄송합니다, 문제가 생겼어요. 다시 시도해 주세요.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFirstPet = typeof window !== 'undefined' && !localStorage.getItem('petholo_has_pet');

  // 완료 화면
  if (isComplete) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('petholo_has_pet', 'true');
    }

    return (
      <MobileLayout title="등록 완료" showBack>
        <div className="p-5 flex flex-col items-center animate-fade-in">
          <div className="mt-8 mb-6">
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center text-4xl mx-auto"
              style={{
                background: 'var(--gradient-holo)',
                border: '3px solid var(--border-card)',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              {frontPhoto ? (
                <img src={frontPhoto} alt={formData.name} className="w-full h-full rounded-full object-cover" />
              ) : (
                '🐾'
              )}
            </div>
          </div>

          <h2 className="text-[22px] font-extrabold mb-2" style={{ color: 'var(--text-primary)' }}>
            {formData.name}
          </h2>

          {isFirstPet ? (
            <>
              <p className="text-xs mb-2 text-center" style={{ color: 'var(--text-muted)' }}>
                반려동물 등록이 완료되었습니다!
                <br />
                바로 첫 프로필을 만들어볼게요
              </p>

              <div
                className="w-full rounded-[var(--radius-lg)] p-4 mb-5 text-center"
                style={{ background: 'rgba(107, 142, 94, 0.08)', border: '1px solid rgba(107, 142, 94, 0.15)' }}
              >
                <span className="text-2xl">✨</span>
                <p className="text-xs font-bold mt-2 mb-1" style={{ color: 'var(--accent-green)' }}>
                  최초 가입 흐름
                </p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  펫 등록 → 프로필 생성 → 영상 생성까지
                  <br />
                  끊김 없이 자동으로 이어집니다
                </p>
              </div>

              <Card hover={false} className="w-full mb-6">
                <div className="space-y-3">
                  {formData.species && <InfoRow label="반려동물" value={formData.species} />}
                  {formData.gender && <InfoRow label="성별" value={formData.gender} />}
                  {formData.breed && <InfoRow label="품종" value={formData.breed} />}
                  <InfoRow label="생일" value={formData.birthDate} />
                  <InfoRow label="떠난 날" value={formData.passingDate} />
                  {formData.favoriteSnack && <InfoRow label="좋아하는 간식" value={formData.favoriteSnack} />}
                </div>
              </Card>

              <div className="w-full">
                <Button fullWidth onClick={() => router.push(`/pets/${createdPetId}/profiles/new`)}>
                  프로필 만들기로 이동
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs mb-2 text-center" style={{ color: 'var(--text-muted)' }}>
                새 반려동물이 등록되었습니다!
                <br />
                프로필을 만들거나 홈으로 돌아갈 수 있어요
              </p>

              <Card hover={false} className="w-full mb-6">
                <div className="space-y-3">
                  {formData.species && <InfoRow label="반려동물" value={formData.species} />}
                  {formData.gender && <InfoRow label="성별" value={formData.gender} />}
                  {formData.breed && <InfoRow label="품종" value={formData.breed} />}
                  <InfoRow label="생일" value={formData.birthDate} />
                  <InfoRow label="떠난 날" value={formData.passingDate} />
                  {formData.favoriteSnack && <InfoRow label="좋아하는 간식" value={formData.favoriteSnack} />}
                  {formData.walkingPlace && <InfoRow label="산책 장소" value={formData.walkingPlace} />}
                  {formData.memo && <InfoRow label="메모" value={formData.memo} />}
                </div>
              </Card>

              <div className="w-full space-y-3">
                <Button fullWidth onClick={() => router.push(`/pets/${createdPetId}/profiles/new`)}>
                  이 펫으로 프로필 만들기
                </Button>
                <Button fullWidth variant="secondary" onClick={() => router.push('/pets/register')}>
                  다른 펫도 등록
                </Button>
                <button
                  onClick={() => router.push('/home')}
                  className="w-full py-3 text-center text-xs font-semibold"
                  style={{ color: 'var(--text-muted)' }}
                >
                  홈으로 가기
                </button>
              </div>
            </>
          )}
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title="등록하기" showBack>
      <div className="p-5 space-y-5 animate-fade-in">
        {/* Step indicator */}
        <Stepper totalSteps={2} currentStep={step} variant="circles" />

        <p className="text-center text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
          STEP {step}/2 {step === 1 ? '사진 업로드' : '정보 입력'}
        </p>

        {step === 1 ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <PhotoUploadSlot
                label="정면 사진"
                required
                photoUrl={frontPhoto}
                inputRef={frontInputRef}
                onUpload={(e) => handlePhotoUpload(e, 'front')}
                onRemove={() => { setFrontPhoto(null); setFrontFile(null); }}
              />
              <PhotoUploadSlot
                label="전신 사진"
                required
                photoUrl={sidePhoto}
                inputRef={sideInputRef}
                onUpload={(e) => handlePhotoUpload(e, 'side')}
                onRemove={() => { setSidePhoto(null); setSideFile(null); }}
              />
            </div>

            <Card hover={false}>
              <div className="space-y-2">
                <p className="text-[11px] font-bold" style={{ color: 'var(--text-secondary)' }}>
                  사진 안내
                </p>
                <div className="space-y-1">
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    · 정면: 얼굴이 잘 보이는 사진이면 좋습니다
                  </p>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    · 전신: 전체 모습이 보이는 사진을 권장드립니다
                  </p>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    · 10MB 이하, JPG/PNG
                  </p>
                </div>
              </div>
            </Card>

            <Button fullWidth size="lg" disabled={!canProceedStep1} onClick={() => setStep(2)}>
              다음
            </Button>
          </>
        ) : (
          <>
            <div className="space-y-4">
              <div>
                <FormField icon="🐾" label="이름" required value={formData.name} onChange={(v) => handleInputChange('name', v)} placeholder="우리 아이의 이름" />
                {formErrors.name && (
                  <p className="text-[10px] mt-0.5 ml-1" style={{ color: 'var(--accent-red)' }}>{formErrors.name}</p>
                )}
              </div>

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
                      onClick={() => handleInputChange('species', opt.value)}
                      className="py-2.5 rounded-[var(--radius-md)] text-xs font-semibold transition-all"
                      style={{
                        background: formData.species === opt.value ? 'var(--accent-warm)' : 'var(--bg-card)',
                        color: formData.species === opt.value ? '#fff' : 'var(--text-secondary)',
                        border: `1.5px solid ${formData.species === opt.value ? 'var(--accent-warm)' : 'var(--border-card)'}`,
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
                      onClick={() => handleInputChange('gender', opt.value)}
                      className="py-2.5 rounded-[var(--radius-md)] text-xs font-semibold transition-all"
                      style={{
                        background: formData.gender === opt.value ? 'var(--accent-warm)' : 'var(--bg-card)',
                        color: formData.gender === opt.value ? '#fff' : 'var(--text-secondary)',
                        border: `1.5px solid ${formData.gender === opt.value ? 'var(--accent-warm)' : 'var(--border-card)'}`,
                      }}
                    >
                      {opt.emoji} {opt.value}
                    </button>
                  ))}
                </div>
              </div>

              <FormField icon="🎂" label="생년월일" type="date" value={formData.birthDate} onChange={(v) => handleInputChange('birthDate', v)} />
              <FormField icon="🕊️" label="떠난 날" type="date" value={formData.passingDate} onChange={(v) => handleInputChange('passingDate', v)} />
              <FormField icon="🐕" label="품종" value={formData.breed} onChange={(v) => handleInputChange('breed', v)} placeholder="예: 포메라니안, 페르시안" />
              <FormField icon="🦴" label="좋아하는 간식" value={formData.favoriteSnack} onChange={(v) => handleInputChange('favoriteSnack', v)} placeholder="예: 닭가슴살, 츄르" />
              <FormField icon="🌳" label="산책 장소" value={formData.walkingPlace} onChange={(v) => handleInputChange('walkingPlace', v)} placeholder="예: 한강공원, 동네 공원" />
              <FormField icon="💜" label="성격" value={formData.personality} onChange={(v) => handleInputChange('personality', v)} placeholder="예: 활발하고 애교 많은, 조용하고 온순한" />
              <FormField icon="💬" label="함께 했던 이야기" value={formData.memo} onChange={(v) => handleInputChange('memo', v)} placeholder="기억하고 싶은 것들..." multiline />
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="secondary" onClick={() => setStep(1)} className="flex-1">
                이전
              </Button>
              <Button disabled={!canSubmit} loading={isSubmitting} onClick={handleSubmit} className="flex-[2]">
                등록하기
              </Button>
            </div>
          </>
        )}
      </div>
    </MobileLayout>
  );
}

/* ============ Sub-components ============ */

function PhotoUploadSlot({ label, required, photoUrl, inputRef, onUpload, onRemove }: {
  label: string; required?: boolean; photoUrl: string | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void; onRemove: () => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-1 mb-1.5">
        <span className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>{label}</span>
        {required && <span className="text-[9px] font-bold" style={{ color: 'var(--accent-red)' }}>필수</span>}
      </div>
      <div
        className="relative rounded-[var(--radius-md)] overflow-hidden cursor-pointer transition-all"
        style={{
          aspectRatio: '0.85',
          background: photoUrl ? 'transparent' : 'var(--bg-card)',
          border: photoUrl ? '2px solid var(--accent-green)' : '2px dashed var(--border-card)',
        }}
        onClick={() => inputRef.current?.click()}
      >
        {photoUrl ? (
          <>
            <img src={photoUrl} alt={label} className="w-full h-full object-cover" />
            <div className="absolute top-1.5 right-1.5 flex gap-1">
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px]" style={{ background: 'var(--accent-green)', color: '#fff' }}>✓</span>
              <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="w-5 h-5 rounded-full flex items-center justify-center text-[10px]" style={{ background: 'var(--accent-red)', color: '#fff' }}>✕</button>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl mb-1">📷</span>
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>탭하여 업로드</span>
          </div>
        )}
        <input ref={inputRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={onUpload} />
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</span>
    </div>
  );
}
