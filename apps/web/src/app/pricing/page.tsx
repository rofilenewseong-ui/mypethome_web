'use client';

import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';

const TIERS = [
  {
    name: '스타터',
    icon: '🌱',
    credits: 120,
    price: '무료 (가입 시 지급)',
    desc: '프로필 1개 + 모션 2개',
    badge: null,
  },
  {
    name: '프로',
    icon: '⭐',
    credits: 500,
    price: '₩49,000',
    desc: '프로필 3개 + 모션 9개',
    badge: '인기',
  },
  {
    name: '프리미엄',
    icon: '💎',
    credits: 1000,
    price: '₩89,000',
    desc: '프로필 7개 + 모션 21개',
    badge: '최고 가치',
  },
];

const USAGE_TABLE = [
  { item: '프로필 생성 (AI 이미지 3장 + 베이스 영상)', cost: 40 },
  { item: '모션 추가 (각 1개)', cost: 40 },
  { item: '모션 삭제 환불', cost: -20 },
  { item: 'AI 이미지 재생성 (리트라이)', cost: 10 },
  { item: '프로필 복원', cost: 20 },
];

const INLINE_FAQ = [
  { q: '크레딧이 부족하면 어떻게 되나요?', a: '모션 추가나 프로필 생성 시 크레딧 부족 안내가 표시되며, 스토어에서 바로 충전할 수 있습니다.' },
  { q: '환불이 가능한가요?', a: '모션 삭제 시 사용한 크레딧의 50%가 자동 환불됩니다. 크레딧 구매 자체의 환불은 결제 후 7일 이내 미사용 크레딧에 한해 가능합니다.' },
  { q: '크레딧 유효기간이 있나요?', a: '크레딧은 구매일로부터 1년간 유효합니다.' },
];

export default function PricingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen px-6 pt-12 pb-10" style={{ background: 'var(--bg-page)' }}>
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="mb-6 text-xs"
        style={{ color: 'var(--text-muted)' }}
      >
        &larr; 뒤로가기
      </button>

      <h1
        className="text-lg font-bold text-center mb-2"
        style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
      >
        요금 안내
      </h1>
      <p className="text-xs text-center mb-8" style={{ color: 'var(--text-muted)' }}>
        크레딧으로 간편하게 이용하세요
      </p>

      {/* Tiers */}
      <div className="space-y-3">
        {TIERS.map((t) => (
          <div
            key={t.name}
            className="relative rounded-[14px] p-4"
            style={{
              background: 'var(--bg-card)',
              border: t.badge ? '2px solid var(--accent-warm)' : '1px solid var(--border-card)',
            }}
          >
            {t.badge && (
              <span
                className="absolute -top-2.5 right-4 rounded-full px-2 py-0.5 text-[9px] font-bold"
                style={{ background: 'var(--accent-warm)', color: 'var(--text-inverse)' }}
              >
                {t.badge}
              </span>
            )}
            <div className="flex items-center gap-3">
              <span className="text-2xl">{t.icon}</span>
              <div className="flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{t.name}</span>
                  <span className="text-lg font-bold" style={{ color: 'var(--accent-warm)' }}>{t.credits}C</span>
                </div>
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{t.desc}</p>
              </div>
              <span className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>{t.price}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Usage Table */}
      <h2 className="mt-10 mb-4 text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
        크레딧 사용 안내
      </h2>
      <div
        className="rounded-[14px] p-4"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)' }}
      >
        {USAGE_TABLE.map((row, i) => (
          <div
            key={i}
            className={`flex items-center justify-between py-2 ${i !== USAGE_TABLE.length - 1 ? 'border-b' : ''}`}
            style={{ borderColor: 'var(--border-card)' }}
          >
            <span className="text-[11px] flex-1 pr-3" style={{ color: 'var(--text-secondary)' }}>{row.item}</span>
            <span
              className="text-xs font-bold shrink-0"
              style={{ color: row.cost < 0 ? 'var(--accent-green)' : 'var(--accent-warm)' }}
            >
              {row.cost < 0 ? `${row.cost}C (환불)` : `${row.cost}C`}
            </span>
          </div>
        ))}
      </div>

      {/* Inline FAQ */}
      <h2 className="mt-10 mb-4 text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
        자주 묻는 질문
      </h2>
      <div className="space-y-3">
        {INLINE_FAQ.map((faq, i) => (
          <div
            key={i}
            className="rounded-[14px] p-4"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)' }}
          >
            <p className="text-xs font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Q. {faq.q}</p>
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>{faq.a}</p>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="mt-10 text-center">
        <div className="w-full max-w-[260px] mx-auto">
          <Button fullWidth size="lg" onClick={() => router.push('/entry')}>
            지금 시작하기
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-8 text-center">
        <div className="flex items-center justify-center gap-3 text-[10px]" style={{ color: 'var(--text-muted)' }}>
          <button onClick={() => router.push('/')} className="underline">홈</button>
          <span>|</span>
          <button onClick={() => router.push('/faq')} className="underline">FAQ</button>
          <span>|</span>
          <button onClick={() => router.push('/about')} className="underline">소개</button>
        </div>
      </footer>
    </div>
  );
}
