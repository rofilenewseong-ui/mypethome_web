'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/useAuthStore';
import { useCreditsSync } from '@/hooks/useCreditsSync';

interface TopBarProps {
  title?: string;
  showBack?: boolean;
  showCredits?: boolean;
  onMenuOpen?: () => void;
  rightAction?: React.ReactNode;
}

export default function TopBar({
  title,
  showBack = false,
  showCredits = true,
  onMenuOpen,
  rightAction,
}: TopBarProps) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  useCreditsSync();
  const isLowCredits = user && user.credits < 40;

  return (
    <header
      className="fixed inset-x-0 top-0 z-50 px-3"
      style={{ paddingTop: 'calc(var(--safe-area-top) + 8px)' }}
    >
      <div
        className="mx-auto flex h-14 max-w-[454px] items-center justify-between rounded-[24px] border px-3"
        style={{
          background: 'rgba(255, 250, 245, 0.78)',
          borderColor: 'rgba(77, 55, 43, 0.08)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        {/* 왼쪽: 뒤로가기 or 햄버거 메뉴 */}
        <div className="flex min-w-[52px] items-center gap-2">
          {showBack ? (
            <button
              onClick={() => router.back()}
              className="flex h-9 w-9 items-center justify-center rounded-full border"
              style={{
                borderColor: 'var(--border-card)',
                color: 'var(--text-secondary)',
                background: 'rgba(255,255,255,0.36)',
              }}
              aria-label="뒤로가기"
            >
              ←
            </button>
          ) : (
            <button
              onClick={onMenuOpen}
              className="flex h-9 w-9 items-center justify-center rounded-full border"
              style={{
                borderColor: 'var(--border-card)',
                color: 'var(--text-secondary)',
                background: 'rgba(255,255,255,0.36)',
              }}
              aria-label="메뉴 열기"
            >
              <span className="text-lg leading-none">···</span>
            </button>
          )}
        </div>

        {/* 가운데: MY PET HOME */}
        <button
          onClick={() => router.push('/home')}
          className="absolute left-1/2 flex -translate-x-1/2 flex-col items-center"
          aria-label="홈으로 이동"
        >
          <span
            className="text-[12px] font-bold uppercase tracking-[0.24em]"
            style={{ color: 'var(--text-secondary)' }}
          >
            My Pet Home
          </span>
          {title ? (
            <span className="mt-1 text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>
              {title}
            </span>
          ) : (
            <span
              className="mt-1 text-[9px] uppercase tracking-[0.18em]"
              style={{ color: 'var(--text-muted)' }}
            >
              Quiet Companion
            </span>
          )}
        </button>

        {/* 오른쪽: 크레딧 */}
        <div className="flex min-w-[52px] items-center justify-end gap-2">
          {showCredits && user ? (
            <button
              onClick={() => router.push('/settings')}
              className="relative flex h-9 items-center gap-1 rounded-full border px-3 text-[11px] font-bold"
              style={{
                borderColor: isLowCredits ? 'rgba(185, 94, 77, 0.25)' : 'rgba(108, 136, 96, 0.18)',
                background: isLowCredits ? 'rgba(185, 94, 77, 0.1)' : 'rgba(108, 136, 96, 0.1)',
                color: isLowCredits ? 'var(--accent-red)' : 'var(--accent-green)',
              }}
            >
              {isLowCredits && (
                <span
                  className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
                  style={{ background: 'var(--accent-red)' }}
                />
              )}
              <span>C</span>
              <span>{user.credits}</span>
            </button>
          ) : null}

          {rightAction}
        </div>
      </div>
    </header>
  );
}
