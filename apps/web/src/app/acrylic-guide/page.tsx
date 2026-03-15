'use client';

import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';

const SETUP_STEPS = [
  { step: 1, title: '아크릴 프리즘 꺼내기', desc: '포장을 벗기고 보호 필름을 제거하세요. 프리즘 표면에 지문이 묻지 않도록 가장자리를 잡아주세요.', icon: '📦' },
  { step: 2, title: '스마트폰 준비', desc: '스마트폰 화면 밝기를 최대로 설정하세요. 자동 꺼짐(화면 잠금)을 해제하세요.', icon: '📱' },
  { step: 3, title: '영상 재생', desc: 'PetHolo 앱에서 홀로그램 영상을 선택하고, 전용 플레이어에서 전체화면으로 재생하세요.', icon: '▶️' },
  { step: 4, title: '프리즘 배치', desc: '스마트폰을 평평한 곳에 놓고, 화면 위에 아크릴 프리즘을 올려놓으세요. 화면 중앙에 정확히 맞춰주세요.', icon: '🔺' },
  { step: 5, title: '감상하기', desc: '프리즘 측면에서 홀로그램을 감상하세요. 주변 조명을 어둡게 하면 더욱 선명합니다.', icon: '✨' },
];

const TIPS = [
  { title: '최적의 환경', items: ['어두운 방에서 감상', '직사광선 피하기', '스마트폰 밝기 최대'] },
  { title: '최적의 각도', items: ['눈높이와 수평으로', '프리즘에서 30~50cm 거리', '정면 또는 약간 위에서'] },
  { title: '영상 설정', items: ['전체화면 모드 사용', '세로 모드 유지 (9:16)', '반복 재생 설정'] },
];

const CARE_ITEMS = [
  { icon: '🧹', text: '부드러운 천(안경닦이)으로 닦기' },
  { icon: '💧', text: '물이나 세정제 직접 뿌리지 않기' },
  { icon: '📏', text: '떨어뜨리거나 강한 충격 주지 않기' },
  { icon: '🌡️', text: '고온 환경(차 안 등)에 방치하지 않기' },
  { icon: '📦', text: '사용 후 제공된 케이스에 보관하기' },
];

export default function AcrylicGuidePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen px-6 pt-12 pb-10" style={{ background: 'var(--bg-page)' }}>
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
        아크릴 프리즘 사용 가이드
      </h1>
      <p className="text-xs text-center mb-8" style={{ color: 'var(--text-muted)' }}>
        홀로그램을 가장 아름답게 감상하는 방법
      </p>

      {/* Setup Steps */}
      <section className="mb-8">
        <h2 className="text-sm font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          세팅 방법
        </h2>
        <div className="space-y-3">
          {SETUP_STEPS.map((s) => (
            <div
              key={s.step}
              className="flex gap-3 rounded-[14px] p-4"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)' }}
            >
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg"
                style={{ background: 'var(--accent-warm-bg)' }}
              >
                {s.icon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold" style={{ color: 'var(--accent-warm)' }}>
                    STEP {s.step}
                  </span>
                  <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                    {s.title}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  {s.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Tips */}
      <section className="mb-8">
        <h2 className="text-sm font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          감상 팁
        </h2>
        <div className="space-y-3">
          {TIPS.map((tip) => (
            <div
              key={tip.title}
              className="rounded-[14px] p-4"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)' }}
            >
              <p className="text-xs font-bold mb-2" style={{ color: 'var(--accent-warm)' }}>{tip.title}</p>
              {tip.items.map((item, i) => (
                <p key={i} className="text-[11px] py-0.5" style={{ color: 'var(--text-secondary)' }}>
                  • {item}
                </p>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* Care */}
      <section className="mb-8">
        <h2 className="text-sm font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          관리 / 청소 방법
        </h2>
        <div
          className="rounded-[14px] p-4"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)' }}
        >
          {CARE_ITEMS.map((item, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 py-2 ${i !== CARE_ITEMS.length - 1 ? 'border-b' : ''}`}
              style={{ borderColor: 'var(--border-card)' }}
            >
              <span>{item.icon}</span>
              <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{item.text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <div className="text-center">
        <div className="w-full max-w-[260px] mx-auto">
          <Button fullWidth size="lg" onClick={() => router.push('/entry')}>
            홀로그램 만들기
          </Button>
        </div>
      </div>

      <footer className="mt-8 text-center">
        <div className="flex items-center justify-center gap-3 text-[10px]" style={{ color: 'var(--text-muted)' }}>
          <button onClick={() => router.push('/')} className="underline">홈</button>
          <span>|</span>
          <button onClick={() => router.push('/photo-guide')} className="underline">사진 가이드</button>
          <span>|</span>
          <button onClick={() => router.push('/faq')} className="underline">FAQ</button>
        </div>
      </footer>
    </div>
  );
}
