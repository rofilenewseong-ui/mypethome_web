'use client';

import { useState, useEffect, useCallback } from 'react';
import Button from '@/components/ui/Button';

const API_ORIGIN = 'http://localhost:4000';
const API_BASE = API_ORIGIN + '/api';

interface AiConfig {
  mockMode: boolean;
  gemini: { hasApiKey: boolean; apiKeyPreview: string; model: string };
  kling: { apiUrl: string; hasAccessKey: boolean; accessKeyPreview: string; hasSecretKey: boolean };
  promptsFile: any;
}

interface TestResult {
  status: 'idle' | 'loading' | 'success' | 'error';
  data?: any;
  error?: string;
  elapsed?: string;
}

export default function AiTestPage() {
  const [config, setConfig] = useState<AiConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [geminiResult, setGeminiResult] = useState<TestResult>({ status: 'idle' });
  const [klingResult, setKlingResult] = useState<TestResult>({ status: 'idle' });
  const [klingTaskId, setKlingTaskId] = useState('');
  const [klingStatusResult, setKlingStatusResult] = useState<TestResult>({ status: 'idle' });
  const [geminiImageUrl, setGeminiImageUrl] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    setConfigLoading(true);
    try {
      const res = await fetch(`${API_BASE}/dev/ai/config`);
      const json = await res.json();
      if (json.success) setConfig(json.data);
    } catch (e) {
      console.error('Config fetch failed:', e);
    }
    setConfigLoading(false);
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const testGemini = async () => {
    setGeminiResult({ status: 'loading' });
    setGeminiImageUrl(null);
    try {
      const res = await fetch(`${API_BASE}/dev/ai/test-gemini`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (json.success) {
        setGeminiResult({ status: 'success', data: json.data, elapsed: json.data.elapsed });
        if (json.data.imageUrl) {
          setGeminiImageUrl(`${API_ORIGIN}${json.data.imageUrl}`);
        }
      } else {
        setGeminiResult({ status: 'error', error: json.message });
      }
    } catch (e) {
      setGeminiResult({ status: 'error', error: String(e) });
    }
  };

  const testKling = async () => {
    setKlingResult({ status: 'loading' });
    try {
      // Gemini 이미지가 있으면 그걸로 I2V 테스트, 없으면 연결 테스트만
      const body: any = {};
      if (geminiImageUrl) {
        body.imageUrl = geminiImageUrl;
      }
      const res = await fetch(`${API_BASE}/dev/ai/test-kling`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        setKlingResult({ status: 'success', data: json.data, elapsed: json.data.elapsed });
        if (json.data.taskId) setKlingTaskId(json.data.taskId);
      } else {
        setKlingResult({ status: 'error', error: json.message || json.data?.klingMessage });
      }
    } catch (e) {
      setKlingResult({ status: 'error', error: String(e) });
    }
  };

  const checkKlingStatus = async () => {
    if (!klingTaskId) return;
    setKlingStatusResult({ status: 'loading' });
    try {
      const res = await fetch(`${API_BASE}/dev/ai/test-kling/status/${klingTaskId}`);
      const json = await res.json();
      if (json.success) {
        setKlingStatusResult({ status: 'success', data: json.data });
      } else {
        setKlingStatusResult({ status: 'error', error: json.message });
      }
    } catch (e) {
      setKlingStatusResult({ status: 'error', error: String(e) });
    }
  };

  const StatusBadge = ({ ok, label }: { ok: boolean; label: string }) => (
    <span
      className="inline-block rounded-full px-2 py-0.5 text-[10px] font-bold"
      style={{
        background: ok ? 'rgba(108,136,96,0.15)' : 'rgba(185,94,77,0.12)',
        color: ok ? 'var(--accent-green)' : 'var(--accent-red)',
      }}
    >
      {ok ? '✓' : '✗'} {label}
    </span>
  );

  return (
    <div className="min-h-screen px-4 pt-10 pb-10" style={{ background: 'var(--bg-page)' }}>
      <h1 className="text-lg font-bold text-center mb-1" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
        AI Pipeline 테스트
      </h1>
      <p className="text-[10px] text-center mb-6" style={{ color: 'var(--text-muted)' }}>
        NanoBanana (Gemini) + Kling I2V 파이프라인 검증
      </p>

      {/* Config */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>현재 설정</h2>
          <button onClick={fetchConfig} className="text-[10px] underline" style={{ color: 'var(--accent-warm)' }}>새로고침</button>
        </div>
        {configLoading ? (
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>로딩 중...</p>
        ) : config ? (
          <div className="rounded-[14px] p-3 space-y-2" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
            <div className="flex items-center gap-2">
              <StatusBadge ok={!config.mockMode} label={config.mockMode ? 'MOCK 모드' : 'REAL 모드'} />
              {config.mockMode && (
                <span className="text-[9px]" style={{ color: 'var(--accent-red)' }}>
                  .env USE_MOCK_AI=false 로 변경 필요
                </span>
              )}
            </div>
            <div className="border-t pt-2" style={{ borderColor: 'var(--border-card)' }}>
              <p className="text-[10px] font-bold mb-1" style={{ color: 'var(--text-secondary)' }}>Gemini</p>
              <div className="flex flex-wrap gap-1">
                <StatusBadge ok={config.gemini.hasApiKey} label={config.gemini.hasApiKey ? 'API Key' : 'No Key'} />
                <span className="text-[9px] px-1 py-0.5 rounded" style={{ background: 'var(--bg-input)', color: 'var(--text-muted)' }}>
                  {config.gemini.model}
                </span>
              </div>
            </div>
            <div className="border-t pt-2" style={{ borderColor: 'var(--border-card)' }}>
              <p className="text-[10px] font-bold mb-1" style={{ color: 'var(--text-secondary)' }}>Kling</p>
              <div className="flex flex-wrap gap-1">
                <StatusBadge ok={config.kling.hasAccessKey} label={config.kling.hasAccessKey ? 'Access Key' : 'No Key'} />
                <StatusBadge ok={config.kling.hasSecretKey} label={config.kling.hasSecretKey ? 'Secret Key' : 'No Secret'} />
              </div>
            </div>
            <div className="border-t pt-2" style={{ borderColor: 'var(--border-card)' }}>
              <p className="text-[10px] font-bold mb-1" style={{ color: 'var(--text-secondary)' }}>Prompts</p>
              {typeof config.promptsFile === 'object' && config.promptsFile.exists ? (
                <div className="flex flex-wrap gap-1">
                  <StatusBadge ok={true} label="prompts.secret.json" />
                  <StatusBadge ok={config.promptsFile.hasStartFrameBare} label="Bare Prompt" />
                  <StatusBadge ok={config.promptsFile.hasStartFrameOutfit} label="Outfit Prompt" />
                  <StatusBadge ok={config.promptsFile.hasBaseVideoPrompt} label="Video Prompt" />
                  <span className="text-[9px] px-1 py-0.5 rounded" style={{ background: 'var(--bg-input)', color: 'var(--text-muted)' }}>
                    Motions: {config.promptsFile.motionCount}개
                  </span>
                </div>
              ) : (
                <StatusBadge ok={false} label={String(config.promptsFile)} />
              )}
            </div>
          </div>
        ) : (
          <p className="text-[11px]" style={{ color: 'var(--accent-red)' }}>
            API 서버 연결 실패 — localhost:4000 실행 중인지 확인하세요
          </p>
        )}
      </section>

      {/* Gemini Test */}
      <section className="mb-6">
        <h2 className="text-xs font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          1. Gemini 이미지 생성 테스트
        </h2>
        <p className="text-[10px] mb-3" style={{ color: 'var(--text-muted)' }}>
          기본 프롬프트로 강아지 이미지 1장 생성 (약 10~30초 소요)
        </p>
        <Button
          size="sm"
          onClick={testGemini}
          loading={geminiResult.status === 'loading'}
          disabled={geminiResult.status === 'loading'}
        >
          Gemini 테스트 실행
        </Button>

        {geminiResult.status === 'loading' && (
          <div className="mt-3 rounded-[12px] p-3" style={{ background: 'var(--accent-warm-bg)' }}>
            <p className="text-[11px] animate-pulse" style={{ color: 'var(--accent-warm)' }}>
              Gemini API 호출 중... (10~30초 소요)
            </p>
          </div>
        )}

        {geminiResult.status === 'success' && (
          <div className="mt-3 rounded-[12px] p-3" style={{ background: 'rgba(108,136,96,0.08)', border: '1px solid rgba(108,136,96,0.2)' }}>
            <p className="text-[11px] font-bold" style={{ color: 'var(--accent-green)' }}>
              ✅ Gemini 성공 ({geminiResult.elapsed})
            </p>
            <pre className="text-[9px] mt-1 whitespace-pre-wrap" style={{ color: 'var(--text-muted)' }}>
              {JSON.stringify(geminiResult.data, null, 2)}
            </pre>
            {geminiImageUrl && (
              <div className="mt-2">
                <p className="text-[10px] font-bold mb-1" style={{ color: 'var(--text-secondary)' }}>생성된 이미지:</p>
                <img
                  src={geminiImageUrl}
                  alt="Gemini generated"
                  className="w-full max-w-[200px] rounded-[8px] border"
                  style={{ borderColor: 'var(--border-card)' }}
                />
              </div>
            )}
          </div>
        )}

        {geminiResult.status === 'error' && (
          <div className="mt-3 rounded-[12px] p-3" style={{ background: 'rgba(185,94,77,0.08)', border: '1px solid rgba(185,94,77,0.2)' }}>
            <p className="text-[11px] font-bold" style={{ color: 'var(--accent-red)' }}>
              ❌ Gemini 실패
            </p>
            <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
              {geminiResult.error}
            </p>
          </div>
        )}
      </section>

      {/* Kling Test */}
      <section className="mb-6">
        <h2 className="text-xs font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          2. Kling I2V 테스트
        </h2>
        <p className="text-[10px] mb-3" style={{ color: 'var(--text-muted)' }}>
          {geminiImageUrl
            ? 'Gemini 생성 이미지로 I2V 영상 생성 요청'
            : 'JWT 인증 연결 테스트 (Gemini 이미지 먼저 생성하면 I2V 가능)'}
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={testKling}
            loading={klingResult.status === 'loading'}
            disabled={klingResult.status === 'loading'}
          >
            Kling {geminiImageUrl ? 'I2V' : '인증'} 테스트
          </Button>
        </div>

        {klingResult.status === 'loading' && (
          <div className="mt-3 rounded-[12px] p-3" style={{ background: 'var(--accent-warm-bg)' }}>
            <p className="text-[11px] animate-pulse" style={{ color: 'var(--accent-warm)' }}>
              Kling API 호출 중...
            </p>
          </div>
        )}

        {klingResult.status === 'success' && (
          <div className="mt-3 rounded-[12px] p-3" style={{ background: 'rgba(108,136,96,0.08)', border: '1px solid rgba(108,136,96,0.2)' }}>
            <p className="text-[11px] font-bold" style={{ color: 'var(--accent-green)' }}>
              ✅ Kling 성공 ({klingResult.elapsed})
            </p>
            <pre className="text-[9px] mt-1 whitespace-pre-wrap" style={{ color: 'var(--text-muted)' }}>
              {JSON.stringify(klingResult.data, null, 2)}
            </pre>
          </div>
        )}

        {klingResult.status === 'error' && (
          <div className="mt-3 rounded-[12px] p-3" style={{ background: 'rgba(185,94,77,0.08)', border: '1px solid rgba(185,94,77,0.2)' }}>
            <p className="text-[11px] font-bold" style={{ color: 'var(--accent-red)' }}>
              ❌ Kling 실패
            </p>
            <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
              {klingResult.error}
            </p>
          </div>
        )}
      </section>

      {/* Kling Status Check */}
      {klingTaskId && (
        <section className="mb-6">
          <h2 className="text-xs font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            3. Kling 영상 상태 확인
          </h2>
          <p className="text-[10px] mb-3" style={{ color: 'var(--text-muted)' }}>
            Task ID: {klingTaskId}
          </p>
          <Button
            size="sm"
            variant="secondary"
            onClick={checkKlingStatus}
            loading={klingStatusResult.status === 'loading'}
          >
            상태 조회
          </Button>

          {klingStatusResult.status === 'success' && (
            <div className="mt-3 rounded-[12px] p-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
              <pre className="text-[9px] whitespace-pre-wrap" style={{ color: 'var(--text-muted)' }}>
                {JSON.stringify(klingStatusResult.data, null, 2)}
              </pre>
              {klingStatusResult.data?.videoUrl && (
                <div className="mt-2">
                  <p className="text-[10px] font-bold mb-1" style={{ color: 'var(--accent-green)' }}>영상 생성 완료!</p>
                  <video
                    src={klingStatusResult.data.videoUrl}
                    controls
                    autoPlay
                    muted
                    loop
                    className="w-full max-w-[200px] rounded-[8px]"
                  />
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* Pipeline Summary */}
      <section className="mb-6">
        <div className="rounded-[14px] p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
          <h3 className="text-xs font-bold mb-2" style={{ color: 'var(--text-primary)' }}>파이프라인 흐름</h3>
          <div className="space-y-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
            <p>1. 📸 사용자 사진 2~3장 (얼굴 + 전신 + 옷)</p>
            <p>2. 🎨 Gemini → 스타트프레임 이미지 3장 생성 (30분 내 선택)</p>
            <p>3. 🎬 Kling I2V → 선택된 이미지로 베이스 영상 생성 (3~5분)</p>
            <p>4. ✨ 12가지 모션 영상 추가 생성 (각 2~4분)</p>
          </div>
        </div>
      </section>

      {/* Troubleshooting */}
      <section>
        <div className="rounded-[14px] p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
          <h3 className="text-xs font-bold mb-2" style={{ color: 'var(--text-primary)' }}>트러블슈팅</h3>
          <div className="space-y-2 text-[10px]" style={{ color: 'var(--text-muted)' }}>
            <div>
              <p className="font-bold" style={{ color: 'var(--text-secondary)' }}>Mock 모드에서 벗어나려면:</p>
              <p className="font-mono text-[9px]">apps/api/.env → USE_MOCK_AI=false</p>
            </div>
            <div>
              <p className="font-bold" style={{ color: 'var(--text-secondary)' }}>Gemini 모델 변경:</p>
              <p className="font-mono text-[9px]">apps/api/.env → GEMINI_MODEL=모델명</p>
            </div>
            <div>
              <p className="font-bold" style={{ color: 'var(--text-secondary)' }}>Kling API 오류:</p>
              <p>KLING_ACCESS_KEY, KLING_SECRET_KEY 확인</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
