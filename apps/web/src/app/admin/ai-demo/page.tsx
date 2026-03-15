'use client';

import { useState, useRef, useCallback } from 'react';
import Button from '@/components/ui/Button';

const API_ORIGIN = 'http://localhost:4000';
const API_BASE = API_ORIGIN + '/api';

type Step = 'upload' | 'gemini' | 'select' | 'kling' | 'done';

export default function AiDemoPage() {
  // ─── State ───
  const [step, setStep] = useState<Step>('upload');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // Gemini
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [geminiImages, setGeminiImages] = useState<string[]>([]);
  const [geminiError, setGeminiError] = useState('');
  const [geminiElapsed, setGeminiElapsed] = useState('');

  // Selection
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Kling
  const [klingLoading, setKlingLoading] = useState(false);
  const [klingTaskId, setKlingTaskId] = useState('');
  const [klingStatus, setKlingStatus] = useState('');
  const [klingVideoUrl, setKlingVideoUrl] = useState('');
  const [klingError, setKlingError] = useState('');
  const [klingElapsed, setKlingElapsed] = useState('');
  const [pollingActive, setPollingActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // ─── 1. 사진 업로드 ───
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setUploadedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // ─── 2. Gemini 스타트프레임 생성 ───
  const runGemini = async () => {
    if (!uploadedImage) return;
    setGeminiLoading(true);
    setGeminiError('');
    setGeminiImages([]);

    try {
      // 3번 연속 생성해서 3장 옵션 제공
      const results: string[] = [];
      const startTime = Date.now();

      for (let i = 0; i < 3; i++) {
        const res = await fetch(`${API_BASE}/dev/ai/test-gemini`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            referenceImage: uploadedImage,
          }),
        });
        const json = await res.json();
        if (json.success && json.data.imageUrl) {
          results.push(json.data.imageUrl);
        }
      }

      const elapsed = Date.now() - startTime;
      setGeminiElapsed(`${(elapsed / 1000).toFixed(1)}s`);

      if (results.length > 0) {
        setGeminiImages(results);
        setStep('select');
      } else {
        setGeminiError('이미지 생성 실패 - API 로그를 확인하세요');
      }
    } catch (e) {
      setGeminiError(String(e));
    }
    setGeminiLoading(false);
  };

  // 기본 프롬프트로 1장만 빠르게 생성
  const runGeminiSingle = async () => {
    if (!uploadedImage) return;
    setGeminiLoading(true);
    setGeminiError('');
    setGeminiImages([]);

    try {
      const startTime = Date.now();
      const res = await fetch(`${API_BASE}/dev/ai/test-gemini`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referenceImage: uploadedImage }),
      });
      const json = await res.json();
      const elapsed = Date.now() - startTime;
      setGeminiElapsed(`${(elapsed / 1000).toFixed(1)}s`);

      if (json.success && json.data.imageUrl) {
        setGeminiImages([json.data.imageUrl]);
        setSelectedImage(json.data.imageUrl);
        setStep('select');
      } else {
        setGeminiError(json.message || 'Gemini 실패');
      }
    } catch (e) {
      setGeminiError(String(e));
    }
    setGeminiLoading(false);
  };

  // ─── 3. Kling I2V 영상 생성 ───
  const runKling = async (motionType?: string) => {
    if (!selectedImage) return;
    setKlingLoading(true);
    setKlingError('');
    setKlingVideoUrl('');
    setKlingStatus('요청 중...');

    try {
      const startTime = Date.now();
      const res = await fetch(`${API_BASE}/dev/ai/test-kling`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imagePath: selectedImage,
          motionType: motionType || undefined,
        }),
      });
      const json = await res.json();
      const elapsed = Date.now() - startTime;
      setKlingElapsed(`${(elapsed / 1000).toFixed(1)}s`);

      if (json.success && json.data.taskId) {
        setKlingTaskId(json.data.taskId);
        setKlingStatus(`Task 생성 완료 (${json.data.taskId})`);
        setStep('kling');
        // 자동 폴링 시작
        startPolling(json.data.taskId);
      } else {
        setKlingError(json.data?.klingMessage || json.message || 'Kling 요청 실패');
        setKlingStatus('');
      }
    } catch (e) {
      setKlingError(String(e));
      setKlingStatus('');
    }
    setKlingLoading(false);
  };

  // ─── 4. Kling 상태 폴링 ───
  const startPolling = useCallback((taskId: string) => {
    setPollingActive(true);
    let count = 0;
    const maxPolls = 60; // 5분 (5초 간격)

    const poll = async () => {
      count++;
      if (count > maxPolls) {
        setPollingActive(false);
        setKlingStatus('타임아웃 (5분 초과)');
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/dev/ai/test-kling/status/${taskId}`);
        const json = await res.json();

        if (json.success) {
          const status = json.data.taskStatus;
          setKlingStatus(`${status} (${count * 5}초 경과)`);

          if (status === 'succeed' && json.data.videoUrl) {
            setKlingVideoUrl(json.data.videoUrl);
            setKlingStatus('영상 생성 완료!');
            setPollingActive(false);
            setStep('done');
            return;
          }

          if (status === 'failed') {
            setKlingError(`영상 생성 실패: ${json.data.statusMsg || 'unknown'}`);
            setPollingActive(false);
            return;
          }
        }
      } catch (e) {
        // 폴링 에러는 무시하고 재시도
      }

      pollingRef.current = setTimeout(poll, 5000);
    };

    // 10초 후 첫 폴링 시작
    pollingRef.current = setTimeout(poll, 10000);
  }, []);

  const stopPolling = () => {
    if (pollingRef.current) {
      clearTimeout(pollingRef.current);
      pollingRef.current = null;
    }
    setPollingActive(false);
  };

  // ─── 리셋 ───
  const resetAll = () => {
    stopPolling();
    setStep('upload');
    setUploadedImage(null);
    setUploadedFile(null);
    setGeminiImages([]);
    setGeminiError('');
    setGeminiElapsed('');
    setSelectedImage(null);
    setKlingTaskId('');
    setKlingStatus('');
    setKlingVideoUrl('');
    setKlingError('');
    setKlingElapsed('');
  };

  // ─── 모션 목록 ───
  const motions = [
    { key: 'FRONT_PAWS_UP', label: '앞발 들기', emoji: '🐾' },
    { key: 'TONGUE_OUT', label: '혀 내밀기', emoji: '😋' },
    { key: 'HEAD_TILT', label: '고개 갸우뚱', emoji: '🤔' },
    { key: 'TAIL_WAG', label: '꼬리흔들기', emoji: '🐕' },
    { key: 'SIT_DOWN', label: '앉기', emoji: '🦮' },
    { key: 'LIE_DOWN', label: '엎드리기', emoji: '🐕‍🦺' },
    { key: 'TURN_AROUND', label: '돌아보기', emoji: '🔄' },
    { key: 'SHAKE_BODY', label: '몸털기', emoji: '💫' },
    { key: 'SNIFF_GROUND', label: '바닥냄새맡기', emoji: '👃' },
    { key: 'LOOK_UP', label: '위쳐다보기', emoji: '👀' },
    { key: 'STRETCH', label: '기지개', emoji: '🐈' },
    { key: 'YAWN', label: '하품', emoji: '🥱' },
  ];

  // ─── 스텝 인디케이터 ───
  const steps = [
    { id: 'upload', label: '사진', num: 1 },
    { id: 'gemini', label: 'AI 생성', num: 2 },
    { id: 'select', label: '선택', num: 3 },
    { id: 'kling', label: '영상', num: 4 },
  ];

  const currentStepIdx = steps.findIndex(s =>
    s.id === step || (step === 'done' && s.id === 'kling')
  );

  return (
    <div className="min-h-screen px-4 pt-6 pb-20" style={{ background: 'var(--bg-page)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-base font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
            AI Pipeline Demo
          </h1>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            NanoBanana 2 + Kling 3.0 실시간 테스트
          </p>
        </div>
        <button
          onClick={resetAll}
          className="text-[10px] px-3 py-1 rounded-full"
          style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}
        >
          초기화
        </button>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-between mb-6 px-2">
        {steps.map((s, i) => (
          <div key={s.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold"
                style={{
                  background: i <= currentStepIdx ? 'var(--accent-warm)' : 'var(--bg-input)',
                  color: i <= currentStepIdx ? '#fff' : 'var(--text-muted)',
                }}
              >
                {i < currentStepIdx ? '✓' : s.num}
              </div>
              <span className="text-[9px] mt-1" style={{ color: i <= currentStepIdx ? 'var(--accent-warm)' : 'var(--text-muted)' }}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className="w-10 h-[2px] mx-1"
                style={{
                  background: i < currentStepIdx ? 'var(--accent-warm)' : 'var(--border-card)',
                  marginBottom: '14px',
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* ─── STEP 1: 사진 업로드 ─── */}
      {step === 'upload' && (
        <section>
          <div
            className="rounded-[16px] p-6 text-center cursor-pointer"
            style={{ background: 'var(--bg-card)', border: '2px dashed var(--border-card)' }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            {uploadedImage ? (
              <div>
                <img
                  src={uploadedImage}
                  alt="Uploaded pet"
                  className="w-48 h-48 object-cover rounded-[12px] mx-auto mb-3"
                />
                <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                  {uploadedFile?.name} ({((uploadedFile?.size || 0) / 1024).toFixed(0)}KB)
                </p>
                <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                  다른 사진으로 변경하려면 터치하세요
                </p>
              </div>
            ) : (
              <div>
                <span className="text-4xl block mb-3">📸</span>
                <p className="text-[12px] font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                  반려동물 사진을 업로드하세요
                </p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  정면, 전신 사진 권장 (최소 512x512px)
                </p>
              </div>
            )}
          </div>

          {uploadedImage && (
            <div className="mt-4 space-y-2">
              <Button
                size="lg"
                onClick={() => { setStep('gemini'); runGeminiSingle(); }}
                className="w-full"
              >
                🎨 스타트프레임 생성 (빠른 1장)
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => { setStep('gemini'); runGemini(); }}
                className="w-full"
              >
                3장 생성 (선택 가능, 더 오래 걸림)
              </Button>
            </div>
          )}
        </section>
      )}

      {/* ─── STEP 2: Gemini 생성 중 ─── */}
      {step === 'gemini' && geminiLoading && (
        <section>
          <div className="rounded-[16px] p-8 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
            <div className="w-16 h-16 rounded-full mx-auto mb-4 animate-pulse flex items-center justify-center"
              style={{ background: 'var(--accent-warm-bg)' }}>
              <span className="text-2xl">🎨</span>
            </div>
            <p className="text-[13px] font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
              NanoBanana 2 이미지 생성 중...
            </p>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              gemini-3.1-flash-image-preview · 약 15~45초 소요
            </p>
            <div className="mt-4 h-1 rounded-full overflow-hidden" style={{ background: 'var(--bg-input)' }}>
              <div className="h-full rounded-full animate-pulse" style={{ width: '60%', background: 'var(--accent-warm)' }} />
            </div>
          </div>
        </section>
      )}

      {/* Gemini 에러 */}
      {step === 'gemini' && !geminiLoading && geminiError && (
        <section>
          <div className="rounded-[16px] p-4" style={{ background: 'rgba(185,94,77,0.08)', border: '1px solid rgba(185,94,77,0.2)' }}>
            <p className="text-[12px] font-bold mb-1" style={{ color: 'var(--accent-red)' }}>❌ Gemini 실패</p>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{geminiError}</p>
          </div>
          <Button size="sm" variant="secondary" onClick={() => setStep('upload')} className="mt-3 w-full">
            다시 시도
          </Button>
        </section>
      )}

      {/* ─── STEP 3: 이미지 선택 ─── */}
      {step === 'select' && geminiImages.length > 0 && (
        <section>
          <p className="text-[12px] font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
            ✅ 스타트프레임 생성 완료 ({geminiElapsed})
          </p>
          <p className="text-[10px] mb-3" style={{ color: 'var(--text-muted)' }}>
            {geminiImages.length > 1 ? '마음에 드는 이미지를 선택하세요' : '생성된 이미지를 확인하세요'}
          </p>

          <div className={`grid gap-3 mb-4 ${geminiImages.length > 1 ? 'grid-cols-3' : 'grid-cols-1 max-w-[200px] mx-auto'}`}>
            {geminiImages.map((imgUrl, i) => (
              <div
                key={i}
                className="rounded-[12px] overflow-hidden cursor-pointer"
                style={{
                  border: selectedImage === imgUrl
                    ? '3px solid var(--accent-warm)'
                    : '2px solid var(--border-card)',
                  transition: 'border 0.2s',
                }}
                onClick={() => setSelectedImage(imgUrl)}
              >
                <img
                  src={`${API_ORIGIN}${imgUrl}`}
                  alt={`Option ${i + 1}`}
                  className="w-full aspect-[9/16] object-cover"
                />
                {selectedImage === imgUrl && (
                  <div className="text-center py-1" style={{ background: 'var(--accent-warm)', color: '#fff' }}>
                    <span className="text-[10px] font-bold">선택됨 ✓</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {selectedImage && (
            <div className="space-y-3">
              <p className="text-[11px] font-bold" style={{ color: 'var(--text-primary)' }}>
                베이스 영상 생성 (Kling 3.0)
              </p>
              <Button
                size="lg"
                onClick={() => runKling()}
                loading={klingLoading}
                disabled={klingLoading}
                className="w-full"
              >
                🎬 베이스 영상 생성 (숨쉬기)
              </Button>

              <details className="rounded-[12px] p-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
                <summary className="text-[11px] font-bold cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
                  🎭 모션 선택 (12종)
                </summary>
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {motions.map(m => (
                    <button
                      key={m.key}
                      onClick={() => runKling(m.key)}
                      disabled={klingLoading}
                      className="rounded-[10px] p-2 text-center"
                      style={{
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border-card)',
                        opacity: klingLoading ? 0.5 : 1,
                      }}
                    >
                      <span className="text-lg block">{m.emoji}</span>
                      <span className="text-[9px] block mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                        {m.label}
                      </span>
                    </button>
                  ))}
                </div>
              </details>
            </div>
          )}
        </section>
      )}

      {/* ─── STEP 4: Kling 영상 생성 ─── */}
      {(step === 'kling' || step === 'done') && (
        <section>
          {/* 상태 표시 */}
          {klingStatus && !klingVideoUrl && (
            <div className="rounded-[16px] p-6 text-center mb-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
              <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{ background: 'var(--accent-warm-bg)' }}>
                <span className={`text-2xl ${pollingActive ? 'animate-pulse' : ''}`}>🎬</span>
              </div>
              <p className="text-[13px] font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                Kling 3.0 영상 생성 중...
              </p>
              <p className="text-[11px] mb-2" style={{ color: 'var(--accent-warm)' }}>
                {klingStatus}
              </p>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                보통 3~5분 소요됩니다. 자동으로 확인합니다.
              </p>
              {pollingActive && (
                <div className="mt-3 h-1 rounded-full overflow-hidden" style={{ background: 'var(--bg-input)' }}>
                  <div className="h-full rounded-full animate-pulse" style={{ width: '40%', background: 'var(--accent-warm)' }} />
                </div>
              )}
            </div>
          )}

          {/* Kling 에러 */}
          {klingError && (
            <div className="rounded-[16px] p-4 mb-4" style={{ background: 'rgba(185,94,77,0.08)', border: '1px solid rgba(185,94,77,0.2)' }}>
              <p className="text-[12px] font-bold mb-1" style={{ color: 'var(--accent-red)' }}>❌ Kling 실패</p>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{klingError}</p>
            </div>
          )}

          {/* 영상 완료 */}
          {klingVideoUrl && (
            <div className="rounded-[16px] overflow-hidden mb-4" style={{ border: '1px solid var(--border-card)' }}>
              <div className="p-3 text-center" style={{ background: 'rgba(108,136,96,0.1)' }}>
                <p className="text-[12px] font-bold" style={{ color: 'var(--accent-green)' }}>
                  ✅ 홀로그램 영상 생성 완료!
                </p>
              </div>
              <video
                src={klingVideoUrl}
                controls
                autoPlay
                muted
                loop
                playsInline
                className="w-full"
                style={{ maxHeight: '400px', background: '#000' }}
              />
            </div>
          )}

          {/* 하단 버튼 */}
          <div className="space-y-2">
            {step === 'done' && selectedImage && (
              <>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => { setStep('select'); setKlingVideoUrl(''); setKlingStatus(''); setKlingError(''); }}
                  className="w-full"
                >
                  🎭 다른 모션으로 영상 만들기
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={resetAll}
                  className="w-full"
                >
                  📸 새 사진으로 시작
                </Button>
              </>
            )}
            {step === 'kling' && !pollingActive && !klingVideoUrl && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => { setStep('select'); setKlingError(''); setKlingStatus(''); }}
                className="w-full"
              >
                ← 이미지 선택으로 돌아가기
              </Button>
            )}
          </div>
        </section>
      )}

      {/* ─── 정보 카드 ─── */}
      <section className="mt-8">
        <div className="rounded-[14px] p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
          <h3 className="text-[11px] font-bold mb-2" style={{ color: 'var(--text-primary)' }}>현재 설정</h3>
          <div className="space-y-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
            <div className="flex justify-between">
              <span>이미지 생성</span>
              <span className="font-mono" style={{ color: 'var(--accent-warm)' }}>NanoBanana 2 (gemini-3.1-flash-image-preview)</span>
            </div>
            <div className="flex justify-between">
              <span>영상 생성</span>
              <span className="font-mono" style={{ color: 'var(--accent-warm)' }}>Kling 3.0 (kling-v3)</span>
            </div>
            <div className="flex justify-between">
              <span>영상 길이</span>
              <span>5초</span>
            </div>
            <div className="flex justify-between">
              <span>비율</span>
              <span>9:16 (세로형)</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
