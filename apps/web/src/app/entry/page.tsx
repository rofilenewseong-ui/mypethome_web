'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/useAuthStore';
import { petsApi } from '@/lib/api';

export default function EntryPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (isLoading) return;

    // 미인증 → 카페24 OAuth
    if (!isAuthenticated) {
      router.replace('/cafe24/auth');
      return;
    }

    // 인증됨 → 펫 보유 여부로 분기
    const checkPets = async () => {
      setChecking(true);
      try {
        const { data } = await petsApi.list();
        const pets: unknown[] = data?.data ?? [];
        if (pets.length > 0) {
          router.replace('/home');
        } else {
          router.replace('/pets/register');
        }
      } catch {
        router.replace('/home');
      }
    };

    checkPets();
  }, [isAuthenticated, isLoading, router]);

  return (
    <div
      className="flex min-h-screen items-center justify-center px-6"
      style={{ background: 'var(--bg-page)' }}
    >
      <div className="soft-panel w-full max-w-sm px-6 py-8 text-center">
        <div
          className="mx-auto h-12 w-12 animate-pulse-warm rounded-full"
          style={{ background: 'var(--gradient-holo)' }}
        />
        <p className="mt-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
          {checking ? '정보를 확인하고 있습니다.' : '화면을 준비하고 있습니다.'}
        </p>
      </div>
    </div>
  );
}
