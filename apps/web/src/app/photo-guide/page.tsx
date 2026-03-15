'use client';

import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';

const GOOD_EXAMPLES = [
  { label: '밝고 선명한 정면', desc: '얼굴이 잘 보이는 정면 사진', icon: '😊' },
  { label: '전신이 보이는 사진', desc: '발끝까지 전체가 나온 사진', icon: '🐕' },
  { label: '단순한 배경', desc: '배경이 깔끔할수록 좋아요', icon: '🏠' },
  { label: '자연광 촬영', desc: '밝은 자연광이 가장 좋습니다', icon: '☀️' },
];

const BAD_EXAMPLES = [
  { label: '어둡거나 흐린 사진', desc: 'AI가 디테일을 인식하기 어렵습니다', icon: '🌑' },
  { label: '잘린 사진', desc: '얼굴이나 몸이 잘리면 결과가 부자연스럽습니다', icon: '✂️' },
  { label: '역광 사진', desc: '실루엣만 보이면 AI가 인식할 수 없습니다', icon: '🌅' },
  { label: '여러 동물이 함께', desc: '한 마리만 나온 사진을 사용해 주세요', icon: '🐾' },
];

const CHECKLIST = [
  '밝은 환경에서 촬영하기',
  '반려동물이 카메라를 바라보게 하기',
  '전신이 보이는 거리에서 촬영하기',
  '배경이 단순한 장소 선택하기',
  '사진 해상도 512x512 이상 확인하기',
  '흔들리지 않게 안정적으로 촬영하기',
];

export default function PhotoGuidePage() {
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
        사진 촬영 가이드
      </h1>
      <p className="text-xs text-center mb-8" style={{ color: 'var(--text-muted)' }}>
        좋은 사진이 아름다운 홀로그램을 만듭니다
      </p>

      {/* Good Examples */}
      <section className="mb-8">
        <h2 className="flex items-center gap-2 text-sm font-bold mb-3" style={{ color: 'var(--accent-green)' }}>
          ✅ 좋은 사진 예시
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {GOOD_EXAMPLES.map((ex) => (
            <div
              key={ex.label}
              className="rounded-[12px] p-3 text-center"
              style={{ background: 'rgba(108, 136, 96, 0.08)', border: '1px solid rgba(108, 136, 96, 0.2)' }}
            >
              <span className="text-2xl">{ex.icon}</span>
              <p className="text-[11px] font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{ex.label}</p>
              <p className="text-[9px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{ex.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bad Examples */}
      <section className="mb-8">
        <h2 className="flex items-center gap-2 text-sm font-bold mb-3" style={{ color: 'var(--accent-red)' }}>
          ❌ 피해야 할 사진
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {BAD_EXAMPLES.map((ex) => (
            <div
              key={ex.label}
              className="rounded-[12px] p-3 text-center"
              style={{ background: 'rgba(185, 94, 77, 0.06)', border: '1px solid rgba(185, 94, 77, 0.18)' }}
            >
              <span className="text-2xl">{ex.icon}</span>
              <p className="text-[11px] font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{ex.label}</p>
              <p className="text-[9px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{ex.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Checklist */}
      <section className="mb-8">
        <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
          📋 촬영 체크리스트
        </h2>
        <div
          className="rounded-[14px] p-4"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)' }}
        >
          {CHECKLIST.map((item, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 py-2 ${i !== CHECKLIST.length - 1 ? 'border-b' : ''}`}
              style={{ borderColor: 'var(--border-card)' }}
            >
              <span className="text-xs" style={{ color: 'var(--accent-warm)' }}>☐</span>
              <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{item}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Resolution Info */}
      <section className="mb-8">
        <div
          className="rounded-[14px] p-4 text-center"
          style={{ background: 'var(--accent-warm-bg)' }}
        >
          <p className="text-xs font-bold" style={{ color: 'var(--accent-warm)' }}>
            최소 해상도: 512 x 512 픽셀
          </p>
          <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
            해상도가 높을수록 더 선명한 홀로그램을 만들 수 있습니다
          </p>
        </div>
      </section>

      {/* CTA */}
      <div className="text-center">
        <div className="w-full max-w-[260px] mx-auto">
          <Button fullWidth size="lg" onClick={() => router.push('/entry')}>
            사진 준비 완료! 시작하기
          </Button>
        </div>
      </div>

      <footer className="mt-8 text-center">
        <div className="flex items-center justify-center gap-3 text-[10px]" style={{ color: 'var(--text-muted)' }}>
          <button onClick={() => router.push('/')} className="underline">홈</button>
          <span>|</span>
          <button onClick={() => router.push('/acrylic-guide')} className="underline">아크릴 가이드</button>
          <span>|</span>
          <button onClick={() => router.push('/faq')} className="underline">FAQ</button>
        </div>
      </footer>
    </div>
  );
}
