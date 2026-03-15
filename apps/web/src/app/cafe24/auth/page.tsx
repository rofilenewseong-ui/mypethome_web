'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/stores/useAuthStore';

const isDev = process.env.NODE_ENV === 'development';

export default function Cafe24AuthPage() {
  const router = useRouter();
  const { loginWithToken } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [cafe24Loading, setCafe24Loading] = useState(false);
  const [devLoading, setDevLoading] = useState(false);

  const handleCafe24Login = async () => {
    setCafe24Loading(true);
    setError(null);
    try {
      const { data } = await authApi.cafe24AuthUrl();
      const { url, state } = data.data;

      // CSRF state를 sessionStorage에 저장
      sessionStorage.setItem('cafe24_oauth_state', state);

      // 카페24 OAuth 페이지로 리다이렉트
      window.location.href = url;
    } catch (err: unknown) {
      const error = err as { response?: { status?: number } };
      if (error.response?.status === 503) {
        setError('카페24 연동이 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요.');
      } else {
        setError('인증 시작에 실패했습니다. 잠시 후 다시 시도해주세요.');
      }
      setCafe24Loading(false);
    }
  };

  const handleDevLogin = async () => {
    setDevLoading(true);
    setError(null);
    try {
      const { data } = await authApi.devLogin();
      const { accessToken, refreshToken, user } = data.data;
      loginWithToken(accessToken, user, refreshToken);
      router.replace('/entry');
    } catch (err: unknown) {
      console.error('Dev login failed:', err);
      setError('개발 로그인에 실패했습니다. 서버가 실행 중인지 확인해주세요.');
      setDevLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: 'var(--bg-warm)' }}
    >
      {/* 로고 */}
      <div
        className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center text-3xl"
        style={{ background: 'var(--gradient-holo)', border: '3px solid var(--border-card)' }}
      >
        🐾
      </div>
      <h1 className="text-lg font-extrabold mb-1" style={{ color: 'var(--text-primary)' }}>
        PetHolo
      </h1>
      <p className="text-xs mb-8" style={{ color: 'var(--text-muted)' }}>
        반려동물 홀로그램 서비스
      </p>

      {/* 에러 메시지 */}
      {error && (
        <div
          className="w-full max-w-xs mb-4 px-4 py-3 rounded-xl text-xs text-center"
          style={{
            background: 'rgba(220, 38, 38, 0.08)',
            border: '1px solid rgba(220, 38, 38, 0.15)',
            color: '#dc2626',
          }}
        >
          {error}
        </div>
      )}

      {/* Cafe24 로그인 버튼 */}
      <button
        onClick={handleCafe24Login}
        disabled={cafe24Loading}
        className="w-full max-w-xs px-6 py-4 rounded-2xl text-sm font-bold transition-all active:scale-[0.97] flex items-center justify-center gap-2"
        style={{
          background: cafe24Loading ? '#9ab3d9' : '#1a56db',
          color: '#fff',
          boxShadow: cafe24Loading
            ? 'none'
            : '0 4px 14px rgba(26, 86, 219, 0.3)',
        }}
      >
        {cafe24Loading ? (
          <>
            <span
              className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
            />
            연결 중...
          </>
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 9.5L12 4L21 9.5V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V9.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
              <path d="M9 21V13H15V21" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
            </svg>
            Cafe24 자사몰로 로그인
          </>
        )}
      </button>

      <p className="text-[10px] mt-3 text-center" style={{ color: 'var(--text-muted)' }}>
        coreflow5103 자사몰 회원 계정으로 로그인됩니다
      </p>

      {/* 개발 모드 구분선 + 버튼 */}
      {isDev && (
        <>
          <div className="w-full max-w-xs flex items-center gap-3 my-6">
            <div className="flex-1 h-px" style={{ background: 'var(--border-card)' }} />
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>또는</span>
            <div className="flex-1 h-px" style={{ background: 'var(--border-card)' }} />
          </div>

          <button
            onClick={handleDevLogin}
            disabled={devLoading}
            className="w-full max-w-xs px-6 py-3.5 rounded-2xl text-sm font-bold transition-all active:scale-[0.97]"
            style={{
              background: devLoading ? 'var(--bg-card)' : 'var(--accent-green)',
              color: devLoading ? 'var(--text-muted)' : '#fff',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            {devLoading ? '로그인 중...' : '개발 모드 로그인 (1000C)'}
          </button>

          <p className="text-[10px] mt-2 text-center" style={{ color: 'var(--text-muted)' }}>
            테스트 계정: dev@petholo.test
          </p>
        </>
      )}
    </div>
  );
}
