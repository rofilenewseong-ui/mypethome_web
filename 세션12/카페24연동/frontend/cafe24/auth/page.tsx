'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGoogleLogin } from '@react-oauth/google';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/stores/useAuthStore';

const isDev = process.env.NODE_ENV === 'development';
const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

/**
 * Google 로그인 버튼 — GoogleOAuthProvider 내부에서만 렌더링
 * useGoogleLogin 훅은 Provider 컨텍스트가 필요하므로 별도 컴포넌트로 분리
 */
function GoogleLoginButton({
  onSuccess,
  onError,
}: {
  onSuccess: (accessToken: string) => void;
  onError: (msg: string) => void;
}) {
  const [loading, setLoading] = useState(false);

  const login = useGoogleLogin({
    flow: 'implicit',
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      onSuccess(tokenResponse.access_token);
    },
    onError: () => {
      onError('구글 로그인이 취소되었습니다.');
    },
  });

  return (
    <>
      <button
        onClick={() => login()}
        disabled={loading}
        className="w-full max-w-xs px-6 py-4 rounded-2xl text-sm font-bold transition-all active:scale-[0.97] flex items-center justify-center gap-3"
        style={{
          background: loading ? '#e8e8e8' : '#fff',
          color: loading ? '#999' : '#333',
          border: '1px solid #dadce0',
          boxShadow: loading ? 'none' : '0 1px 3px rgba(0,0,0,0.08)',
        }}
      >
        {loading ? (
          <>
            <span className="inline-block w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            로그인 중...
          </>
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google로 로그인
          </>
        )}
      </button>
      <p className="text-[10px] mt-2 text-center" style={{ color: 'var(--text-muted)' }}>
        Google 계정으로 간편하게 시작하세요
      </p>
    </>
  );
}

export default function Cafe24AuthPage() {
  const router = useRouter();
  const { loginWithToken } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [cafe24Loading, setCafe24Loading] = useState(false);
  const [devLoading, setDevLoading] = useState(false);

  const handleGoogleSuccess = async (accessToken: string) => {
    setError(null);
    try {
      const { data } = await authApi.googleAuth(accessToken);
      const { accessToken: jwt, refreshToken, user } = data.data;
      loginWithToken(jwt, user, refreshToken);
      router.replace('/entry');
    } catch (err: unknown) {
      console.error('Google login failed:', err);
      setError('구글 로그인에 실패했습니다. 다시 시도해주세요.');
    }
  };

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

      {/* Google 로그인 (Client ID 설정 시에만 표시) */}
      {googleClientId && (
        <>
          <div className="w-full max-w-xs flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ background: 'var(--border-card)' }} />
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>또는</span>
            <div className="flex-1 h-px" style={{ background: 'var(--border-card)' }} />
          </div>

          <GoogleLoginButton
            onSuccess={handleGoogleSuccess}
            onError={(msg) => setError(msg)}
          />
        </>
      )}

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
