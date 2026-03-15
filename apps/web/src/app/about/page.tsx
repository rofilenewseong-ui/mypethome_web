'use client';

import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';

const MILESTONES = [
  { year: '2024', event: '서비스 기획 및 AI 파이프라인 개발' },
  { year: '2025', event: 'Gemini + Kling AI 기반 영상 생성 시스템 구축' },
  { year: '2025', event: '아크릴 홀로그램 프리즘 제품 출시' },
  { year: '2025', event: '정식 서비스 런칭 및 사용자 모집' },
];

const TECH_STACK = [
  { name: 'Google Gemini', desc: 'AI 이미지 생성' },
  { name: 'Kling AI', desc: 'Image-to-Video 변환' },
  { name: 'Firebase', desc: '인증 및 데이터베이스' },
  { name: 'Next.js', desc: '프론트엔드 프레임워크' },
];

export default function AboutPage() {
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
        PetHolo 소개
      </h1>
      <p className="text-xs text-center mb-10" style={{ color: 'var(--text-muted)' }}>
        모든 반려동물의 추억을 영원히
      </p>

      {/* Mission */}
      <section className="mb-8">
        <div
          className="rounded-[14px] p-5 text-center"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)' }}
        >
          <div
            className="mx-auto mb-4 h-14 w-14 rounded-full"
            style={{ background: 'var(--gradient-holo)' }}
          />
          <h2 className="text-sm font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            우리의 미션
          </h2>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            반려동물과 함께한 소중한 시간을 최첨단 AI 기술로
            <br />
            살아 움직이는 홀로그램으로 간직합니다.
            <br />
            사진 한 장이면 충분합니다.
          </p>
        </div>
      </section>

      {/* Service */}
      <section className="mb-8">
        <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
          서비스 소개
        </h2>
        <div
          className="rounded-[14px] p-4 space-y-3"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)' }}
        >
          <div>
            <p className="text-xs font-bold" style={{ color: 'var(--accent-warm)' }}>AI 이미지 합성</p>
            <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
              Google Gemini AI가 반려동물 사진을 분석하여 홀로그램에 최적화된 고품질 이미지를 생성합니다.
            </p>
          </div>
          <div className="border-t" style={{ borderColor: 'var(--border-card)' }} />
          <div>
            <p className="text-xs font-bold" style={{ color: 'var(--accent-warm)' }}>모션 비디오 생성</p>
            <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
              Kling AI가 정지 이미지를 자연스럽게 움직이는 영상으로 변환합니다. 12가지 다양한 모션을 선택할 수 있습니다.
            </p>
          </div>
          <div className="border-t" style={{ borderColor: 'var(--border-card)' }} />
          <div>
            <p className="text-xs font-bold" style={{ color: 'var(--accent-warm)' }}>홀로그램 디스플레이</p>
            <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
              아크릴 프리즘과 스마트폰만 있으면 어디서든 3D 홀로그램을 감상할 수 있습니다.
            </p>
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="mb-8">
        <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
          기술 스택
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {TECH_STACK.map((t) => (
            <div
              key={t.name}
              className="rounded-[12px] p-3 text-center"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)' }}
            >
              <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{t.name}</p>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{t.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Milestones */}
      <section className="mb-8">
        <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
          연혁
        </h2>
        <div
          className="rounded-[14px] p-4"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)' }}
        >
          {MILESTONES.map((m, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 ${i !== MILESTONES.length - 1 ? 'pb-3 mb-3 border-b' : ''}`}
              style={{ borderColor: 'var(--border-card)' }}
            >
              <span className="text-[10px] font-bold shrink-0 mt-0.5" style={{ color: 'var(--accent-warm)' }}>
                {m.year}
              </span>
              <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                {m.event}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <div className="mt-6 text-center">
        <div className="w-full max-w-[260px] mx-auto">
          <Button fullWidth size="lg" onClick={() => router.push('/entry')}>
            서비스 시작하기
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-8 text-center">
        <div className="flex items-center justify-center gap-3 text-[10px]" style={{ color: 'var(--text-muted)' }}>
          <button onClick={() => router.push('/')} className="underline">홈</button>
          <span>|</span>
          <button onClick={() => router.push('/pricing')} className="underline">요금</button>
          <span>|</span>
          <button onClick={() => router.push('/faq')} className="underline">FAQ</button>
        </div>
      </footer>
    </div>
  );
}
