'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/useAuthStore';
import TopBar from './TopBar';

const sidebarLinks = [
  { label: '홈', path: '/home', icon: '🏠' },
  { label: '펫 관리', path: '/pets/manage', icon: '🐾' },
  { label: '프로필', path: '/profiles', icon: '🎬' },
  { label: '메신저', path: '/messenger', icon: '💬' },
  { label: '크레딧', path: '/settings', icon: '💰' },
  { label: '자사몰', path: 'https://coreflow5103.cafe24.com/category/My-Pet-Home/59/', icon: '🛒', external: true },
  { label: '휴지통', path: '/trash', icon: '🗑️' },
];

interface MobileLayoutProps {
  children: React.ReactNode;
  title?: string;
  showBack?: boolean;
  showCredits?: boolean;
  showMessage?: boolean;
  hasNewMessage?: boolean;
  showBackFloat?: boolean;
  rightAction?: React.ReactNode;
}

export default function MobileLayout({
  children,
  title,
  showBack = false,
  showCredits = true,
  showMessage = true,
  hasNewMessage = false,
  showBackFloat = true,
  rightAction,
}: MobileLayoutProps) {
  const [showSidebar, setShowSidebar] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-warm)', maxWidth: '430px', margin: '0 auto' }}>
      <TopBar
        title={title}
        showBack={showBack}
        showCredits={showCredits}
        onMenuOpen={() => setShowSidebar(true)}
        rightAction={rightAction}
      />

      <main
        style={{
          paddingTop: 'var(--topbar-height)',
        }}
      >
        {children}
      </main>

      {/* ============ 사이드 메뉴 ============ */}
      {showSidebar && (
        <>
          <div
            className="fixed inset-0 z-[60]"
            style={{ background: 'rgba(37, 27, 23, 0.28)' }}
            onClick={() => setShowSidebar(false)}
          />
          <aside className="fixed left-0 z-[70] w-full max-w-[300px] p-3" style={{ top: 0, bottom: 0, right: "auto" }}>
            <div className="soft-panel flex h-full flex-col px-5 py-5">
              {/* 유저 정보 + 닫기 */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {user?.name || '보호자'}님
                  </p>
                  <p className="mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    {user?.isVerified ? '정품 인증 완료' : '체험 모드'} · {user?.credits ?? 0}C
                  </p>
                </div>
                <button
                  onClick={() => setShowSidebar(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border"
                  style={{
                    borderColor: 'var(--border-card)',
                    color: 'var(--text-secondary)',
                  }}
                  aria-label="메뉴 닫기"
                >
                  ✕
                </button>
              </div>

              {/* 네비게이션 링크 */}
              <nav className="mt-5 flex-1 space-y-1 overflow-y-auto">
                {sidebarLinks.map((item) => {
                  const isActive = pathname === item.path || pathname?.startsWith(item.path + '/');
                  return (
                    <button
                      key={item.path}
                      onClick={() => {
                        setShowSidebar(false);
                        if ((item as { external?: boolean }).external) {
                          window.open(item.path, '_blank');
                        } else {
                          router.push(item.path);
                        }
                      }}
                      className="flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 py-3 text-left transition-colors"
                      style={{
                        background: isActive ? 'rgba(159, 120, 92, 0.1)' : 'transparent',
                      }}
                    >
                      <span className="text-base">{item.icon}</span>
                      <span
                        className="text-sm font-semibold"
                        style={{ color: isActive ? 'var(--accent-warm)' : 'var(--text-primary)' }}
                      >
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </nav>

              {/* 로그아웃 */}
              <button
                onClick={() => {
                  setShowSidebar(false);
                  useAuthStore.getState().logout();
                  router.replace('/entry');
                }}
                className="mt-4 rounded-[var(--radius-pill)] border px-4 py-3 text-sm font-semibold"
                style={{
                  borderColor: 'rgba(185, 94, 77, 0.22)',
                  color: 'var(--accent-red)',
                }}
              >
                로그아웃
              </button>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
