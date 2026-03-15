'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/useAuthStore';
import MobileLayout from '@/components/layout/MobileLayout';

const menuCards = [
  {
    icon: '📁',
    label: '프로필',
    desc: '영상 프리셋 카드',
    path: '/profiles',
  },
  {
    icon: '💬',
    label: '메신저',
    desc: '강아지와 대화',
    path: '/messenger',
    showBadge: true,
  },
  {
    icon: '🛒',
    label: '자사몰',
    desc: '홀로그램 구매',
    path: 'https://coreflow5103.cafe24.com/category/My-Pet-Home/59/',
    external: true,
  },
  {
    icon: '🐾',
    label: '내 펫 관리',
    desc: '펫 등록 · 정보 수정',
    path: '/pets/manage',
  },
  {
    icon: '📖',
    label: '제작 가이드',
    desc: '영상제작 가이드라인',
    path: '/photo-guide',
  },
];

const petCategories = [
  { emoji: '🐕', label: '강아지' },
  { emoji: '🐈', label: '고양이' },
  { emoji: '🎬', label: '영상' },
  { emoji: '✨', label: '새소식' },
];

export default function HomePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN';

  return (
    <MobileLayout>
      <div className="mobile-frame px-3 pb-6 pt-3">
        <div className="space-y-3">

          {/* 영상 영역 — 아크릴 제작 영상 */}
          <div
            className="relative overflow-hidden rounded-[var(--radius-lg)]"
            style={{
              aspectRatio: '16/9',
              background: 'linear-gradient(180deg, #1a1410, #251b17)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <span className="text-3xl animate-pulse" style={{ filter: 'drop-shadow(0 0 12px rgba(100,200,255,0.3))' }}>🐾</span>
              <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                아크릴 홀로그램 미리보기
              </p>
            </div>
            {/* 홀로그램 스캔라인 */}
            <div
              style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(100,200,255,0.02) 3px, rgba(100,200,255,0.02) 4px)',
              }}
            />
          </div>

          {/* 펫 카테고리 아이콘 — 축소 */}
          <div className="flex justify-center gap-3">
            {petCategories.map((cat) => (
              <button
                key={cat.label}
                className="flex h-11 w-11 items-center justify-center rounded-[10px]"
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-card)',
                  boxShadow: '0 2px 6px rgba(86,58,42,0.05)',
                }}
              >
                <span className="text-lg">{cat.emoji}</span>
              </button>
            ))}
          </div>

          {/* 스크롤 배너 */}
          <div
            className="overflow-hidden rounded-[10px] py-2"
            style={{
              background: 'linear-gradient(90deg, rgba(184,119,66,0.12), rgba(184,119,66,0.06))',
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                whiteSpace: 'nowrap',
                animation: 'marquee 18s linear infinite',
              }}
            >
              <span className="px-4 text-xs font-semibold" style={{ color: 'var(--accent-orange)' }}>
                서비스가 오픈되었습니다! 소중한 반려동물의 추억을 홀로그램으로 만들어보세요 🐾
              </span>
              <span className="px-4 text-xs font-semibold" style={{ color: 'var(--accent-orange)' }}>
                서비스가 오픈되었습니다! 소중한 반려동물의 추억을 홀로그램으로 만들어보세요 🐾
              </span>
            </div>
          </div>

          {/* 메뉴 카드 — 축소된 아이콘 + 5개 (가이드 포함) */}
          <div className="grid grid-cols-3 gap-2">
            {menuCards.map((card) => (
              <button
                key={card.label}
                onClick={() => card.external ? window.open(card.path, '_blank') : router.push(card.path)}
                className="soft-panel relative flex flex-col items-center px-2 py-3 text-center transition-transform active:scale-[0.97]"
              >
                {card.showBadge && (
                  <span
                    className="absolute top-2 right-2 h-2 w-2 rounded-full"
                    style={{ background: 'var(--accent-red)' }}
                  />
                )}
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full"
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-card)',
                  }}
                >
                  <span className="text-lg">{card.icon}</span>
                </div>
                <p
                  className="mt-2 text-[12px] font-bold leading-tight"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {card.label}
                </p>
                <p
                  className="mt-0.5 text-[9px] leading-tight"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {card.desc}
                </p>
              </button>
            ))}
          </div>

          {/* AI 직접 테스트 — 관리자만 표시 */}
          {isAdmin && (
            <button
              onClick={() => router.push('/admin/ai-demo')}
              className="w-full rounded-[var(--radius-md)] p-3 flex items-center gap-3 transition-all active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, rgba(100,200,255,0.06), rgba(160,120,255,0.06))',
                border: '1px solid rgba(100,200,255,0.15)',
              }}
            >
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base"
                style={{
                  background: 'linear-gradient(135deg, rgba(100,200,255,0.15), rgba(160,120,255,0.15))',
                  border: '1px solid rgba(100,200,255,0.2)',
                }}
              >
                🤖
              </div>
              <div className="flex-1 text-left">
                <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                  AI 직접 테스트
                </p>
                <p className="text-[9px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  NanoBanana 2 · Kling 3.0
                </p>
              </div>
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>→</span>
            </button>
          )}

        </div>
      </div>
    </MobileLayout>
  );
}
