'use client';

import { useRouter } from 'next/navigation';
import MobileLayout from '@/components/layout/MobileLayout';

const menuCards = [
  {
    icon: '🐾',
    label: '내 펫 관리',
    lines: ['펫 등록 · 정보 수정', '새 펫 추가'],
    path: '/pets/manage',
  },
  {
    icon: '📁',
    label: '프로필 가기',
    lines: ['영상 프리셋 카드', '재생 · 모션 · 설정'],
    path: '/profiles',
  },
  {
    icon: '💬',
    label: '메신저',
    lines: ['강아지와 대화', '이모지 · 사진 공유'],
    path: '/messenger',
  },
  {
    icon: '🛒',
    label: '자사몰 이동',
    lines: ['홀로그램 구매', '크레딧 충전'],
    path: '/store',
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
  return (
    <MobileLayout>
      <div className="mobile-frame px-4 pb-8 pt-4">
        <div className="space-y-5">

          {/* 펫 카테고리 아이콘 */}
          <div className="flex justify-center gap-4">
            {petCategories.map((cat) => (
              <button
                key={cat.label}
                className="flex h-14 w-14 items-center justify-center rounded-[var(--radius-md)]"
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-card)',
                  boxShadow: '0 2px 8px rgba(86,58,42,0.06)',
                }}
              >
                <span className="text-2xl">{cat.emoji}</span>
              </button>
            ))}
          </div>

          {/* 스크롤 배너 */}
          <div
            className="overflow-hidden rounded-[var(--radius-sm)] py-2.5"
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
              <span className="px-4 text-sm font-semibold" style={{ color: 'var(--accent-orange)' }}>
                서비스가 오픈되었습니다! 소중한 반려동물의 추억을 홀로그램으로 만들어보세요 🐾
              </span>
              <span className="px-4 text-sm font-semibold" style={{ color: 'var(--accent-orange)' }}>
                서비스가 오픈되었습니다! 소중한 반려동물의 추억을 홀로그램으로 만들어보세요 🐾
              </span>
            </div>
          </div>

          {/* 메뉴 카드 2×2 */}
          <div className="grid grid-cols-2 gap-3">
            {menuCards.map((card) => (
              <button
                key={card.label}
                onClick={() => router.push(card.path)}
                className="soft-panel flex flex-col items-center px-4 py-5 text-center transition-transform active:scale-[0.97]"
              >
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-full"
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-card)',
                    boxShadow: '0 2px 8px rgba(86,58,42,0.06)',
                  }}
                >
                  <span className="text-2xl">{card.icon}</span>
                </div>
                <p
                  className="mt-3 text-sm font-bold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {card.label}
                </p>
                <div className="mt-1.5 space-y-0.5">
                  {card.lines.map((line) => (
                    <p
                      key={line}
                      className="text-[11px] leading-4"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {line}
                    </p>
                  ))}
                </div>
              </button>
            ))}
          </div>

          {/* AI 직접 테스트 — NanoBanana 2 + Kling 3.0 */}
          <button
            onClick={() => router.push('/admin/ai-demo')}
            className="w-full rounded-[var(--radius-lg)] p-4 flex items-center gap-4 transition-all active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, rgba(100,200,255,0.06), rgba(160,120,255,0.06))',
              border: '1px solid rgba(100,200,255,0.15)',
            }}
          >
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl"
              style={{
                background: 'linear-gradient(135deg, rgba(100,200,255,0.15), rgba(160,120,255,0.15))',
                border: '1px solid rgba(100,200,255,0.2)',
              }}
            >
              🤖
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                AI 직접 테스트
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                NanoBanana 2 (Gemini) · Kling 3.0 — 사진→영상 직접 생성
              </p>
            </div>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>→</span>
          </button>

        </div>
      </div>
    </MobileLayout>
  );
}
