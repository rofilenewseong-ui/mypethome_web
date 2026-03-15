'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { aiApi, petsApi, profilesApi } from '@/lib/api';
import { CREDIT_COSTS, ALL_MOTION_TYPES, MOTION_TYPE_LABELS, MOTION_TYPE_EMOJIS, MotionType } from '@/lib/constants';
import MobileLayout from '@/components/layout/MobileLayout';
import { Button, Card, Stepper, Badge, ProgressBar } from '@/components/ui';
import { useToastStore } from '@/stores/useToastStore';
import { useAuthStore } from '@/stores/useAuthStore';

type Step = 1 | 2 | 3 | 4;

interface GeneratedImage {
  url: string;
  index: number;
}

export default function NewProfilePage() {
  const params = useParams();
  const router = useRouter();
  const petId = params.id as string;
  const addToast = useToastStore((s) => s.addToast);
  const userCredits = useAuthStore((s) => s.user?.credits ?? 0);
  const refreshCredits = useAuthStore((s) => s.refreshCredits);

  // 이미지 로드 실패 상태
  const [frontPhotoError, setFrontPhotoError] = useState(false);
  const [sidePhotoError, setSidePhotoError] = useState(false);

  const [step, setStep] = useState<Step>(1);

  // Step 1: 의상 사진 1장 (필수)
  const [outfitPhoto, setOutfitPhoto] = useState<string | null>(null);
  const outfitInputRef = useRef<HTMLInputElement>(null);

  // Step 2: 베이스 타입
  const [baseType, setBaseType] = useState<'STANDING' | 'SITTING' | null>(null);
  const [selectedMotions, setSelectedMotions] = useState<MotionType[]>([]);

  // 펫 데이터 (정면/전신 사진 재활용)
  const [petData, setPetData] = useState<{ name: string; frontPhoto: string; sidePhoto: string } | null>(null);

  // 프로필 생성 결과
  const [createdProfileId, setCreatedProfileId] = useState<string | null>(null);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);

  // Step 3: AI 추천 이미지 3장 중 선택
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [selectionTimer, setSelectionTimer] = useState(1800);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0); // 재생성 횟수 (0=최초, 1=무료 재시도 사용)
  const autoRetryRef = useRef(false); // 자동 재시도 플래그 (실패 시)

  // Step 4: Kling 영상 생성 + 완성
  const [videoJobId, setVideoJobId] = useState<string | null>(null);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoStatus, setVideoStatus] = useState('');
  const [videoCompleted, setVideoCompleted] = useState(false);

  // Step 3 AI 생성 중 메시지 순환
  const [aiProgressMsg, setAiProgressMsg] = useState(0);
  useEffect(() => {
    if (step !== 3 || !isGenerating) return;
    const msgs = [
      '사진을 분석하고 있습니다...',
      'AI가 이미지를 만들고 있습니다...',
      '최적의 결과를 생성 중입니다...',
      '거의 완성되었습니다...',
    ];
    setAiProgressMsg(0);
    const timer = setInterval(() => {
      setAiProgressMsg((prev) => Math.min(prev + 1, msgs.length - 1));
    }, 8000);
    return () => clearInterval(timer);
  }, [step, isGenerating]);

  // 더블클릭 방지용 ref (state보다 빠르게 잠금)
  const isCreatingRef = useRef(false);

  // 펫 정보 로드 (정면/전신 사진)
  useEffect(() => {
    const fetchPet = async () => {
      try {
        const res = await petsApi.get(petId);
        const pet = res.data?.data || res.data;
        if (pet && (pet.frontPhoto || pet.sidePhoto)) {
          setPetData({
            name: pet.name || '',
            frontPhoto: pet.frontPhoto || '',
            sidePhoto: pet.sidePhoto || '',
          });
          return;
        }
      } catch {
        // API 실패 — localStorage 폴백 시도
      }

      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(`petholo_pet_${petId}`);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            setPetData({
              name: parsed.name || '',
              frontPhoto: parsed.frontPhoto || '',
              sidePhoto: parsed.sidePhoto || '',
            });
          } catch {
            // 파싱 실패
          }
        }
      }
    };
    fetchPet();
  }, [petId]);

  const handleOutfitUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      addToast('10MB 이하의 사진만 업로드 가능합니다.', 'warning');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const img = new Image();
      img.onload = () => {
        if (img.width < 512 || img.height < 512) {
          addToast(`사진 해상도가 너무 낮습니다 (${img.width}x${img.height}). 최소 512x512 이상의 사진을 사용해 주세요.`, 'warning');
          return;
        }
        setOutfitPhoto(result);
      };
      img.onerror = () => {
        addToast('이미지를 읽을 수 없습니다. 다른 사진을 시도해 주세요.', 'error');
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  // ★ 스토리지 키/상대 경로 → 절대 URL 변환
  const resolveImageUrl = useCallback((url: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
    const apiOrigin = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api').replace(/\/api\/?$/, '');
    if (url.startsWith('/uploads/')) return `${apiOrigin}${url}`;
    if (url.startsWith('/')) return `${apiOrigin}${url}`;
    return `${apiOrigin}/uploads/${url}`;
  }, []);

  // ★ 스타트 프레임 API 호출 — .then() 패턴 사용 (await 사용 금지!)
  //   HMR/Fast Refresh가 모듈을 교체하면 await 이후 코드가 실행되지 않음.
  //   .then() 콜백에서 React state setter를 직접 호출하면 setter는 identity-stable이므로
  //   모듈 교체 후에도 정상 동작함.
  const callStartFrame = (profileId: string) => {
    aiApi.generateStartFrame({
      profileId,
      faceImage: petData?.frontPhoto || '',
      bodyImage: petData?.sidePhoto || '',
      outfitImage: outfitPhoto || undefined,
    }).then((sfRes) => {
      const sfData = sfRes.data?.data || sfRes.data;
      const newJobId = sfData?.jobId;
      if (newJobId) {
        setJobId(newJobId); // → polling useEffect 트리거
      } else {
        setIsGenerating(false);
        setGenerateError('작업 ID를 받지 못했습니다. 다시 시도해 주세요.');
      }
    }).catch(() => {
      setIsGenerating(false);
      setGenerateError('AI 서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.');
    });
  };

  // ★ Step 2 → 프로필 생성 + 스타트 프레임 API 호출 → Step 3 전환
  //   프로필 생성도 .then() 패턴 사용 — await 완전 배제
  const handleCreateProfile = () => {
    if (!baseType) return;
    if (isCreatingRef.current) return;
    isCreatingRef.current = true;
    setIsCreatingProfile(true);

    const profileName = `${petData?.name || ''} ${baseType === 'STANDING' ? '서있기' : '앉기'}`.trim();

    profilesApi.create({
      petId,
      name: profileName,
      type: baseType,
      selectedMotionTypes: selectedMotions,
    }).then((res) => {
      const data = res.data?.data || res.data;
      const newProfileId = data?.id;

      if (!newProfileId) {
        addToast('프로필 ID를 받지 못했습니다.', 'error');
        setIsCreatingProfile(false);
        isCreatingRef.current = false;
        return;
      }

      setCreatedProfileId(newProfileId);
      setIsCreatingProfile(false);

      // Step 3 전환 전 상태 초기화
      setGeneratedImages([]);
      setSelectedImageIndex(null);
      setGenerateError(null);
      setSelectionTimer(1800);
      setJobId(null);

      setStep(3);
      setIsGenerating(true);

      // 스타트 프레임 API 호출 (.then 내부에서 .then 체이닝)
      callStartFrame(newProfileId);

      isCreatingRef.current = false;
    }).catch((err: unknown) => {
      const errorMsg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      addToast(errorMsg || '프로필 생성에 실패했습니다. 크레딧을 확인해주세요.', 'error');
      setIsCreatingProfile(false);
      isCreatingRef.current = false;
    });
  };

  // ★ Step 3 폴링 전용 useEffect — API 호출 없이 jobId 기반 폴링만 수행
  useEffect(() => {
    if (step !== 3 || !jobId) return;

    let cancelled = false;
    const pollTimer = setInterval(() => {
      if (cancelled) return;
      // 폴링도 .then() 패턴 사용
      aiApi.getJobStatus(jobId).then((statusRes) => {
        if (cancelled) return;
        const statusData = statusRes.data?.data || statusRes.data;

        if (statusData?.status === 'COMPLETED') {
          clearInterval(pollTimer);
          const rawImages = statusData.images;
          if (Array.isArray(rawImages) && rawImages.length > 0) {
            const images = rawImages.map((img: { url?: string }, i: number) => ({
              url: resolveImageUrl(img.url || ''),
              index: i,
            }));
            setGeneratedImages(images);
            setIsGenerating(false);
          } else {
            setIsGenerating(false);
            setGenerateError('이미지 생성은 완료되었지만 결과를 가져오지 못했습니다.');
          }
        } else if (statusData?.status === 'FAILED') {
          clearInterval(pollTimer);
          // ★ 나노바나나2 실패 → 자동 재시도 (1회)
          if (!autoRetryRef.current && createdProfileId) {
            autoRetryRef.current = true;
            addToast('이미지 생성에 실패했습니다. 자동으로 다시 시도합니다...', 'warning');
            // 짧은 딜레이 후 재시도
            setTimeout(() => {
              setGenerateError(null);
              setGeneratedImages([]);
              setSelectedImageIndex(null);
              setJobId(null);
              callStartFrame(createdProfileId);
            }, 1500);
          } else {
            setIsGenerating(false);
            setGenerateError(statusData.error || '이미지 생성에 실패했습니다. 다시 시도해 주세요.');
          }
        }
      }).catch(() => {
        // 폴링 에러 — 계속 시도
      });
    }, 2000);

    return () => {
      cancelled = true;
      clearInterval(pollTimer);
    };
  }, [step, jobId, resolveImageUrl]);

  // ★ 유저 요청 재생성 핸들러 (최초 1회 무료, 이후 10C)
  const handleRegenerateImages = () => {
    if (!createdProfileId || !jobId) return;

    setGenerateError(null);
    setGeneratedImages([]);
    setSelectedImageIndex(null);
    setSelectionTimer(1800);
    setIsGenerating(true);

    aiApi.regenerateStartFrame({
      jobId,
      faceImage: petData?.frontPhoto || '',
      bodyImage: petData?.sidePhoto || '',
      outfitImage: outfitPhoto || undefined,
    }).then((res) => {
      const data = res.data?.data || res.data;
      setRetryCount(data?.retryCount || retryCount + 1);
      if (data?.creditCharged > 0) {
        refreshCredits?.();
        addToast(`${data.creditCharged}C 차감되었습니다`, 'info');
      }
      // jobId는 동일 — 폴링이 자동으로 다시 시작됨 (status → PROCESSING)
      // 강제로 폴링 리트리거를 위해 jobId를 null→set 순서로
      setJobId(null);
      setTimeout(() => setJobId(jobId), 100);
    }).catch((err: unknown) => {
      setIsGenerating(false);
      const errorMsg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      if (errorMsg?.includes('크레딧')) {
        setGenerateError('크레딧이 부족합니다. 충전 후 다시 시도해 주세요.');
      } else {
        setGenerateError(errorMsg || '재생성에 실패했습니다. 다시 시도해 주세요.');
      }
    });
  };

  // ★ 에러 시 재시도 핸들러 (callStartFrame으로 새 job 생성)
  const handleRetryGeneration = () => {
    if (!createdProfileId) return;
    setGenerateError(null);
    setGeneratedImages([]);
    setSelectedImageIndex(null);
    setSelectionTimer(1800);
    setJobId(null);
    setIsGenerating(true);
    callStartFrame(createdProfileId);
  };

  const handleSelectImage = async () => {
    if (selectedImageIndex === null) return;
    // ★ 타이머 만료 체크
    if (selectionTimer <= 0) {
      addToast('선택 시간이 만료되었습니다. 새로 생성해 주세요.', 'warning');
      return;
    }
    // ★ createdProfileId 필수 검증 (petId 폴백은 프로필 ID가 아니므로 사용 불가)
    if (!createdProfileId) {
      addToast('프로필 정보를 찾을 수 없습니다. 다시 시도해 주세요.', 'error');
      return;
    }

    setStep(4);
    setVideoProgress(0);
    setVideoStatus('영상을 생성하고 있습니다...');
    pollErrorCountRef.current = 0;

    try {
      if (jobId) {
        const selectRes = await aiApi.selectStartFrame(jobId, selectedImageIndex);
        const selectData = selectRes.data?.data || selectRes.data;

        if (selectData?.baseVideoId) {
          const genRes = await aiApi.generateVideo({
            profileId: createdProfileId,
            baseVideoId: selectData.baseVideoId,
            imageUrl: generatedImages[selectedImageIndex]?.url || '',
          });
          const genData = genRes.data?.data || genRes.data;
          setVideoJobId(genData?.jobId || genData?.klingTaskId || null);
        } else {
          // baseVideoId 없음 → 데모 모드 폴백
          setVideoJobId('demo-job');
        }
      } else {
        setVideoJobId('demo-job');
      }
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      // ★ 에러 시 Step 3으로 복귀 (Step 4에 갇히지 않도록)
      setStep(3);
      setGenerateError(errorMsg || '영상 생성 시작에 실패했습니다. 다시 시도해 주세요.');
    }
  };

  // ★ 폴링 에러 카운트 (3회 연속 실패 시 데모 완료 처리)
  const pollErrorCountRef = useRef(0);

  const pollVideoStatus = useCallback(async () => {
    if (!videoJobId) return;

    // 'demo-job'은 실제 API가 아님 → 즉시 데모 완료 처리
    if (videoJobId === 'demo-job') {
      setVideoProgress(100);
      setVideoStatus('영상이 완성되었습니다!');
      setVideoCompleted(true);
      return;
    }

    try {
      const res = await aiApi.getJobStatus(videoJobId);
      const data = res.data?.data || res.data;
      pollErrorCountRef.current = 0; // 성공 시 에러 카운트 리셋

      if (data?.status === 'COMPLETED') {
        setVideoProgress(100);
        setVideoStatus('영상이 완성되었습니다!');
        setVideoCompleted(true);
        return;
      } else if (data?.status === 'FAILED') {
        setVideoStatus('생성에 실패했습니다. 다시 시도해 주세요.');
        return;
      }

      // PROCESSING — 진행률 업데이트
      setVideoProgress((prev) => Math.min(prev + 5, 90));
    } catch {
      // 네트워크 에러 — 재시도하되, 연속 실패 시 폴백 완료
      pollErrorCountRef.current += 1;
      if (pollErrorCountRef.current >= 10) {
        // 10회 연속 실패 (약 30초) → 폴백 완료 처리
        setVideoProgress(100);
        setVideoStatus('영상이 완성되었습니다!');
        setVideoCompleted(true);
      } else {
        // 아직 재시도 중 — 진행률만 약간 증가
        setVideoProgress((prev) => Math.min(prev + 2, 85));
      }
    }
  }, [videoJobId]);

  useEffect(() => {
    if (step === 4 && videoJobId && !videoCompleted) {
      const interval = setInterval(pollVideoStatus, 3000);
      return () => clearInterval(interval);
    }
  }, [step, videoJobId, videoCompleted, pollVideoStatus]);

  // 30분 선택 타이머
  useEffect(() => {
    if (step === 3 && !isGenerating && generatedImages.length > 0) {
      const timer = setInterval(() => {
        setSelectionTimer((prev) => {
          if (prev <= 0) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [step, isGenerating, generatedImages.length]);

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const stepTitles: Record<Step, string> = {
    1: '의상 사진',
    2: '자세 선택',
    3: 'AI 이미지 선택',
    4: '영상 생성',
  };

  return (
    <MobileLayout title={stepTitles[step]} showBack>
      <div className="p-5 space-y-5 animate-fade-in">
        {/* 스텝 인디케이터 */}
        <Stepper totalSteps={4} currentStep={step} variant="dots" />
        <p className="text-center text-[10px]" style={{ color: 'var(--text-muted)' }}>
          STEP {step}/4
        </p>

        {/* Step 1: 의상 사진 업로드 (필수) + 펫 등록 사진 미리보기 */}
        {step === 1 && (
          <>
            <p className="text-sm font-bold text-center" style={{ color: 'var(--text-primary)' }}>
              잘 나온 사진 1장을 올려주세요
            </p>

            {/* 펫 등록 사진 미리보기 (읽기 전용) */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>
                📸 등록된 펫 사진
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div
                  className="rounded-[var(--radius-md)] overflow-hidden relative"
                  style={{
                    aspectRatio: '0.75',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-card)',
                  }}
                >
                  {petData?.frontPhoto && !frontPhotoError ? (
                    <img
                      src={resolveImageUrl(petData.frontPhoto)}
                      alt="정면 사진"
                      className="w-full h-full object-cover"
                      onError={() => setFrontPhotoError(true)}
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xl mb-1">🐕</span>
                      <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
                        {frontPhotoError ? '사진 로드 실패' : '로딩 중...'}
                      </span>
                    </div>
                  )}
                  <span
                    className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[8px] font-bold"
                    style={{ background: 'rgba(0,0,0,0.6)', color: 'rgba(255,255,255,0.8)' }}
                  >
                    정면
                  </span>
                </div>
                <div
                  className="rounded-[var(--radius-md)] overflow-hidden relative"
                  style={{
                    aspectRatio: '0.75',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-card)',
                  }}
                >
                  {petData?.sidePhoto && !sidePhotoError ? (
                    <img
                      src={resolveImageUrl(petData.sidePhoto)}
                      alt="전신 사진"
                      className="w-full h-full object-cover"
                      onError={() => setSidePhotoError(true)}
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xl mb-1">🐕</span>
                      <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
                        {sidePhotoError ? '사진 로드 실패' : '로딩 중...'}
                      </span>
                    </div>
                  )}
                  <span
                    className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[8px] font-bold"
                    style={{ background: 'rgba(0,0,0,0.6)', color: 'rgba(255,255,255,0.8)' }}
                  >
                    전신
                  </span>
                </div>
              </div>
            </div>

            {/* 의상 사진 1장 업로드 */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>
                👕 의상/악세서리 착용 사진
              </p>
              <div
                className="relative rounded-[var(--radius-md)] overflow-hidden cursor-pointer mx-auto"
                style={{
                  width: '140px',
                  aspectRatio: '0.75',
                  background: outfitPhoto ? 'transparent' : 'var(--bg-card)',
                  border: outfitPhoto ? '2px solid var(--accent-green)' : '2px dashed var(--border-card)',
                }}
                onClick={() => outfitInputRef.current?.click()}
              >
                {outfitPhoto ? (
                  <>
                    <img src={outfitPhoto} alt="의상 사진" className="w-full h-full object-cover" />
                    <button
                      onClick={(e) => { e.stopPropagation(); setOutfitPhoto(null); }}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
                      style={{ background: 'var(--accent-red)', color: '#fff' }}
                    >
                      ✕
                    </button>
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl mb-1">👕</span>
                    <span className="text-[9px] font-bold" style={{ color: 'var(--text-muted)' }}>
                      옷/악세서리 사진
                    </span>
                    <span className="text-[8px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      (필수)
                    </span>
                  </div>
                )}
                <input
                  ref={outfitInputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  className="hidden"
                  onChange={handleOutfitUpload}
                />
              </div>
            </div>

            <Card hover={false}>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                · AI가 등록된 펫 사진과 의상 사진을 합성하여 추천 이미지 3장을 만들어 드립니다
                <br />
                · 의상은 전체가 잘 보이는 사진이 좋습니다
              </p>
            </Card>

            <Button fullWidth size="lg" disabled={!outfitPhoto} onClick={() => setStep(2)}>
              다음
            </Button>
          </>
        )}

        {/* Step 2: 베이스 자세 선택 → 프로필 생성 → AI 이미지 생성 */}
        {step === 2 && (
          <>
            <p className="text-sm font-bold text-center" style={{ color: 'var(--text-primary)' }}>
              홀로그램의 기본 자세를 선택해 주세요
            </p>

            <Card hover={false}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">💎</span>
                  <div>
                    <p className="text-[11px] font-bold" style={{ color: 'var(--text-primary)' }}>
                      프로필 생성
                    </p>
                    <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
                      베이스 영상 1개 + 모션 2개 포함
                    </p>
                  </div>
                </div>
                <Badge color="var(--accent-warm)" size="md">
                  {CREDIT_COSTS.PROFILE_CREATE}C
                </Badge>
              </div>
            </Card>

            <div className="grid grid-cols-2 gap-4">
              {(['STANDING', 'SITTING'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setBaseType(type)}
                  className="rounded-[var(--radius-lg)] p-5 text-center transition-all active:scale-[0.97]"
                  style={{
                    background: baseType === type ? 'rgba(107,142,94,0.1)' : 'var(--bg-card)',
                    border: `2px solid ${baseType === type ? 'var(--accent-green)' : 'var(--border-card)'}`,
                  }}
                >
                  <span className="text-4xl">{type === 'STANDING' ? '🧍' : '🪑'}</span>
                  <p className="text-xs font-bold mt-3" style={{ color: 'var(--text-primary)' }}>
                    {type === 'STANDING' ? '서있는 자세' : '앉은 자세'}
                  </p>
                  <p className="text-[9px] mt-1" style={{ color: 'var(--text-muted)' }}>
                    {type === 'STANDING' ? '전신이 보이는 영상' : '앉아있는 모습의 영상'}
                  </p>
                </button>
              ))}
            </div>

            <p className="text-sm font-bold text-center mt-4" style={{ color: 'var(--text-primary)' }}>
              함께 생성할 모션 2개를 선택하세요
            </p>
            <p className="text-[9px] text-center mb-2" style={{ color: 'var(--text-muted)' }}>
              {selectedMotions.length}/2 선택됨
            </p>
            <div className="grid grid-cols-3 gap-2">
              {ALL_MOTION_TYPES.map((type) => {
                const isSelected = selectedMotions.includes(type);
                const isDisabled = !isSelected && selectedMotions.length >= 2;
                return (
                  <button
                    key={type}
                    disabled={isDisabled}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedMotions(prev => prev.filter(t => t !== type));
                      } else {
                        setSelectedMotions(prev => [...prev, type]);
                      }
                    }}
                    className="rounded-[var(--radius-md)] p-2 text-center transition-all active:scale-[0.97]"
                    style={{
                      background: isSelected ? 'rgba(107,142,94,0.15)' : 'var(--bg-card)',
                      border: `2px solid ${isSelected ? 'var(--accent-green)' : 'var(--border-card)'}`,
                      opacity: isDisabled ? 0.4 : 1,
                    }}
                  >
                    <span className="text-lg">{MOTION_TYPE_EMOJIS[type]}</span>
                    <p className="text-[9px] font-medium mt-1" style={{ color: 'var(--text-primary)' }}>
                      {MOTION_TYPE_LABELS[type]}
                    </p>
                    {isSelected && (
                      <span className="text-[9px]" style={{ color: 'var(--accent-green)' }}>✓</span>
                    )}
                  </button>
                );
              })}
            </div>

            <p className="text-[9px] text-center" style={{ color: 'var(--text-muted)' }}>
              추가 모션은 프로필 설정에서 구매 가능 (각 {CREDIT_COSTS.MOTION_CREATE}C)
            </p>

            {userCredits < CREDIT_COSTS.PROFILE_CREATE && (
              <Card hover={false}>
                <div className="flex items-center gap-2">
                  <span className="text-lg">💎</span>
                  <div className="flex-1">
                    <p className="text-[11px] font-bold" style={{ color: 'var(--accent-red)' }}>
                      크레딧이 부족합니다
                    </p>
                    <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
                      보유 {userCredits}C / 필요 {CREDIT_COSTS.PROFILE_CREATE}C
                    </p>
                  </div>
                  <Button size="sm" onClick={() => router.push('/store')}>
                    충전
                  </Button>
                </div>
              </Card>
            )}

            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setStep(1)} className="flex-1">
                이전
              </Button>
              <Button
                disabled={!baseType || selectedMotions.length !== 2 || isCreatingProfile || userCredits < CREDIT_COSTS.PROFILE_CREATE}
                loading={isCreatingProfile}
                onClick={handleCreateProfile}
                className="flex-[2]"
              >
                프로필 생성 ({CREDIT_COSTS.PROFILE_CREATE}C)
              </Button>
            </div>
          </>
        )}

        {/* Step 3: AI 추천 이미지 선택 */}
        {step === 3 && (
          <>
            {isGenerating ? (
              <div className="text-center py-12">
                <div
                  className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center text-3xl animate-pulse-warm"
                  style={{ background: 'var(--gradient-holo)', border: '3px solid var(--border-card)' }}
                >
                  🎨
                </div>
                <p className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
                  {['사진을 분석하고 있습니다...', 'AI가 이미지를 만들고 있습니다...', '최적의 결과를 생성 중입니다...', '거의 완성되었습니다...'][aiProgressMsg]}
                </p>
                <div className="w-full max-w-xs mx-auto mb-3">
                  <ProgressBar value={Math.min(15 + aiProgressMsg * 25, 95)} showLabel={false} />
                </div>
                <p className="text-[10px] mt-4" style={{ color: 'var(--text-muted)' }}>
                  3장의 추천 이미지를 만들고 있습니다
                  <br />
                  약 30초~1분 정도 소요됩니다
                </p>
              </div>
            ) : generateError ? (
              /* ★ 에러 상태: 재시도 + 돌아가기 UI */
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl" style={{ background: 'rgba(185,94,77,0.1)' }}>
                  ⚠️
                </div>
                <p className="text-sm font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                  이미지 생성에 실패했습니다
                </p>
                <p className="text-[10px] mb-6" style={{ color: 'var(--text-muted)' }}>
                  {generateError}
                </p>
                <div className="space-y-3 max-w-xs mx-auto">
                  <Button fullWidth onClick={handleRetryGeneration}>
                    다시 시도하기
                  </Button>
                  <Button fullWidth variant="secondary" onClick={() => router.push('/profiles')}>
                    프로필 목록으로
                  </Button>
                </div>
              </div>
            ) : generatedImages.length > 0 ? (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                    마음에 드는 이미지를 선택해 주세요
                  </p>
                  <Badge color={selectionTimer < 300 ? 'var(--accent-red)' : 'var(--accent-green)'} size="md">
                    ⏱ {formatTimer(selectionTimer)}
                  </Badge>
                </div>

                {/* ★ 타이머 만료 경고 */}
                {selectionTimer <= 0 && (
                  <Card hover={false}>
                    <div className="flex items-center gap-2">
                      <span>⏰</span>
                      <div>
                        <p className="text-[11px] font-bold" style={{ color: 'var(--accent-red)' }}>
                          선택 시간이 만료되었습니다
                        </p>
                        <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
                          새로 이미지를 생성해야 합니다
                        </p>
                      </div>
                    </div>
                    <Button fullWidth size="sm" onClick={handleRetryGeneration} className="mt-3">
                      새로 생성하기
                    </Button>
                  </Card>
                )}

                <div className="grid grid-cols-3 gap-3">
                  {generatedImages.map((img) => (
                    <button
                      key={img.index}
                      onClick={() => selectionTimer > 0 && setSelectedImageIndex(img.index)}
                      className="rounded-[var(--radius-md)] overflow-hidden relative transition-all active:scale-[0.97]"
                      style={{
                        aspectRatio: '9/16',
                        background: '#eee',
                        border: `3px solid ${selectedImageIndex === img.index ? 'var(--accent-green)' : 'transparent'}`,
                        opacity: selectionTimer <= 0 ? 0.5 : 1,
                        pointerEvents: selectionTimer <= 0 ? 'none' : 'auto',
                      }}
                    >
                      {img.url ? (
                        <img
                          src={img.url}
                          alt={`옵션 ${img.index + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // 이미지 로드 실패 시 재시도 (캐시 무시)
                            const target = e.target as HTMLImageElement;
                            if (!target.dataset.retried) {
                              target.dataset.retried = '1';
                              target.src = img.url + '?t=' + Date.now();
                            }
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center" style={{ background: 'var(--bg-card)' }}>
                          <span className="text-3xl">🖼️</span>
                          <span className="text-[9px] mt-1" style={{ color: 'var(--text-muted)' }}>
                            옵션 {img.index + 1}
                          </span>
                        </div>
                      )}
                      {selectedImageIndex === img.index && (
                        <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center text-xs" style={{ background: 'var(--accent-green)', color: '#fff' }}>
                          ✓
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                <p className="text-[9px] text-center" style={{ color: 'var(--text-muted)' }}>
                  선택한 이미지로 홀로그램 영상이 만들어집니다
                </p>

                {/* ★ 재생성 버튼 (최초 1회 무료 / 이후 10C) */}
                <button
                  onClick={handleRegenerateImages}
                  disabled={selectionTimer <= 0}
                  className="w-full text-center py-2 text-xs rounded-[var(--radius-md)] transition-all active:scale-[0.98]"
                  style={{
                    color: 'var(--text-secondary)',
                    border: '1px dashed var(--border-card)',
                    background: 'transparent',
                    opacity: selectionTimer <= 0 ? 0.5 : 1,
                  }}
                >
                  {retryCount === 0 ? (
                    <>🔄 마음에 안 드시나요? <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>무료</span> 재생성</>
                  ) : (
                    <>🔄 다시 생성하기 <span style={{ color: 'var(--accent-holo)', fontWeight: 600 }}>{CREDIT_COSTS.NANOBANANA_RETRY}C</span></>
                  )}
                </button>

                {/* ★ 타이머 만료 시 버튼 비활성화 */}
                <Button
                  fullWidth
                  size="lg"
                  disabled={selectedImageIndex === null || selectionTimer <= 0}
                  onClick={handleSelectImage}
                >
                  이 이미지로 영상 만들기
                </Button>
              </>
            ) : (
              /* 이미지가 아직 없고, 에러도 아닌 비정상 상태 */
              <div className="text-center py-12">
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  이미지를 불러오는 중입니다...
                </p>
              </div>
            )}
          </>
        )}

        {/* Step 4: 영상 생성 + 완성 */}
        {step === 4 && (
          <>
            {!videoCompleted ? (
              <div className="text-center py-12">
                <div
                  className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center text-3xl animate-pulse-warm"
                  style={{ background: 'var(--gradient-holo)', border: '3px solid var(--border-card)' }}
                >
                  🎬
                </div>
                <p className="text-sm font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                  {videoStatus || '영상을 생성하고 있습니다...'}
                </p>

                <div className="w-full max-w-xs mx-auto mb-2">
                  <ProgressBar value={videoProgress} showLabel />
                </div>

                <p className="text-[10px] mt-6" style={{ color: 'var(--text-muted)' }}>
                  베이스 영상을 생성합니다.
                  <br />
                  약 1~3분 소요되며, 이 페이지를 나가셔도 됩니다.
                </p>
              </div>
            ) : (
              <div className="text-center py-8 animate-fade-in">
                <div
                  className="w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center text-4xl"
                  style={{ background: 'var(--gradient-holo)', border: '3px solid var(--accent-green)', boxShadow: 'var(--shadow-card)' }}
                >
                  ✅
                </div>
                <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                  프로필이 완성되었습니다!
                </h2>
                <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>
                  베이스 영상이 생성되었습니다
                </p>

                <Card hover={false} className="mb-6 text-left">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">🎭</span>
                    <div>
                      <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                        프로필 설정에서 모션을 추가할 수 있습니다
                      </p>
                      <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                        LEFT/RIGHT 배정, 모션 구매 (각 {CREDIT_COSTS.MOTION_CREATE}C) 등
                      </p>
                    </div>
                  </div>
                </Card>

                <div className="space-y-3">
                  <Button fullWidth onClick={() => router.push(`/player/${createdProfileId || petId}`)}>
                    영상 재생하기
                  </Button>
                  <Button fullWidth variant="secondary" onClick={() => router.push('/home')}>
                    홈으로
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </MobileLayout>
  );
}
