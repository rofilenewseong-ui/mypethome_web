'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { authApi, petsApi } from '@/lib/api';
import { useAuthStore } from '@/stores/useAuthStore';

function Cafe24CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const { loginWithToken } = useAuthStore();

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');

      if (!code) {
        setError('인증 코드가 없습니다. 다시 시도해주세요.');
        return;
      }

      // CSRF state 검증 (양쪽 모두 존재해야 통과)
      const savedState = sessionStorage.getItem('cafe24_oauth_state');
      if (!state || !savedState || state !== savedState) {
        setError('보안 검증에 실패했습니다. 다시 시도해주세요.');
        sessionStorage.removeItem('cafe24_oauth_state');
        return;
      }
      sessionStorage.removeItem('cafe24_oauth_state');

      try {
        const { data } = await authApi.cafe24Auth(code);
        const { accessToken, refreshToken, user } = data.data;

        // 로그인 처리 (refreshToken 포함)
        loginWithToken(accessToken, user, refreshToken);

        // 펫 보유 여부로 분기
        try {
          const petsRes = await petsApi.list();
          const pets: unknown[] = petsRes.data?.data ?? [];
          router.replace(pets.length > 0 ? '/home' : '/pets/register');
        } catch {
          router.replace('/home');
        }
      } catch (err: unknown) {
        const error = err as { response?: { data?: { error?: string }; status?: number } };
        if (error.response?.status === 503) {
          setError('카페24 연동이 아직 준비되지 않았습니다.');
        } else if (error.response?.status === 401) {
          setError('카페24 인증에 실패했습니다. 다시 시도해주세요.');
        } else {
          setError(error.response?.data?.error || '로그인 처리 중 오류가 발생했습니다.');
        }
      }
    };

    handleCallback();
  }, [searchParams, loginWithToken, router]);

  if (error) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6"
        style={{ background: 'var(--bg-warm)' }}
      >
        <div
          className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl"
          style={{
            background: 'rgba(220, 38, 38, 0.1)',
            border: '1px solid rgba(220, 38, 38, 0.2)',
          }}
        >
          ⚠️
        </div>
        <p className="text-sm text-center mb-4" style={{ color: 'var(--text-primary)' }}>
          {error}
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => router.push('/cafe24/auth')}
            className="text-xs px-4 py-2 rounded-lg"
            style={{ background: 'var(--accent-sage)', color: 'white' }}
          >
            다시 시도
          </button>
          <button
            onClick={() => router.push('/entry')}
            className="text-xs underline"
            style={{ color: 'var(--text-muted)' }}
          >
            홈으로
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: 'var(--bg-warm)' }}
    >
      <div className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full mb-4"
        style={{ borderColor: 'var(--accent-sage)', borderTopColor: 'transparent' }}
      />
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        로그인 처리 중...
      </p>
    </div>
  );
}

export default function Cafe24CallbackPage() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen flex items-center justify-center"
          style={{ background: 'var(--bg-warm)' }}
        >
          <div className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full"
            style={{ borderColor: 'var(--accent-sage)', borderTopColor: 'transparent' }}
          />
        </div>
      }
    >
      <Cafe24CallbackContent />
    </Suspense>
  );
}
