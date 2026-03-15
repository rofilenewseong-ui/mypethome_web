'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';

// ─── Data ────────────────────────────────────────────────
const STEPS = [
  { num: '01', title: '사진 등록', desc: '반려동물의 정면 사진 한 장만 올려주세요', icon: '📸' },
  { num: '02', title: 'AI 합성', desc: 'AI가 홀로그램용 고품질 영상을 생성합니다', icon: '🎨' },
  { num: '03', title: '홀로그램 완성', desc: '아크릴 프리즘 위에서 살아 움직여요', icon: '✨' },
];

const MOTIONS = [
  { label: '앞발 들기', emoji: '🐾' },
  { label: '혀 내밀기', emoji: '😛' },
  { label: '고개 갸우뚱', emoji: '🤔' },
  { label: '꼬리 흔들기', emoji: '🐕' },
  { label: '숨쉬기', emoji: '🌬️' },
  { label: '귀 쫑긋', emoji: '🐰' },
  { label: '눈 깜빡', emoji: '😌' },
  { label: '인사하기', emoji: '👋' },
  { label: '하품하기', emoji: '🥱' },
  { label: '기지개', emoji: '🐈' },
  { label: '두리번', emoji: '👀' },
  { label: '방긋 웃기', emoji: '😊' },
];

const CREDITS_TABLE = [
  { item: '프로필 생성 (베이스 영상)', cost: '40C', accent: false },
  { item: '모션 추가 (각)', cost: '40C', accent: false },
  { item: '모션 삭제 환불', cost: '20C (50%)', accent: true },
];

const LANDING_FAQ = [
  {
    q: '어떤 사진이 좋나요?',
    a: '밝고 선명한 정면 사진이 가장 좋습니다. 배경이 단순하고 반려동물이 카메라를 바라보는 사진을 추천합니다.',
  },
  {
    q: '영상 생성에 얼마나 걸리나요?',
    a: '베이스 영상은 약 3~5분, 모션 영상은 약 2~4분 정도 소요됩니다. 생성이 완료되면 자동으로 알림을 보내드립니다.',
  },
  {
    q: '강아지, 고양이 외 다른 동물도 가능한가요?',
    a: '현재는 강아지와 고양이에 최적화되어 있습니다. 다른 동물도 등록은 가능하지만 AI 생성 품질이 다를 수 있습니다.',
  },
  {
    q: '크레딧 유효기간이 있나요?',
    a: '크레딧은 구매일로부터 1년간 유효합니다. 가입 시 지급되는 무료 크레딧도 동일합니다.',
  },
];

const METRICS = [
  { value: '12', label: '모션 종류' },
  { value: '4K', label: '고해상도' },
  { value: '5초', label: '영상 길이' },
];

// ─── Component ───────────────────────────────────────────
export default function LandingPage() {
  const router = useRouter();
  const [openFaq, setOpenFaq] = useState<Set<number>>(new Set());
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);

  // Scroll-triggered fade-in
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).style.opacity = '1';
            (entry.target as HTMLElement).style.transform = 'translateY(0)';
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -30px 0px' },
    );

    sectionRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const setSectionRef = useCallback(
    (idx: number) => (el: HTMLElement | null) => {
      sectionRefs.current[idx] = el;
    },
    [],
  );

  const handleStart = () => router.push('/entry');

  const toggleFaq = (i: number) => {
    setOpenFaq((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  // Shared hidden-until-visible style
  const fadeStyle = (delay = 0): React.CSSProperties => ({
    opacity: 0,
    transform: 'translateY(24px)',
    transition: `opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1) ${delay}s, transform 0.6s cubic-bezier(0.22, 1, 0.36, 1) ${delay}s`,
  });

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-page)' }}>

      {/* ═══════════════════════════════════════════════════════
          SECTION 1 — Hero
      ═══════════════════════════════════════════════════════ */}
      <section className="relative flex flex-col items-center px-6 pt-20 pb-14 text-center overflow-hidden">
        {/* Ambient orbs */}
        <div
          className="absolute animate-float-slow"
          style={{
            top: '-40px', right: '-30px', width: '200px', height: '200px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(159,120,92,0.15) 0%, transparent 70%)',
            filter: 'blur(50px)',
            pointerEvents: 'none',
          }}
        />
        <div
          className="absolute animate-float-slow"
          style={{
            bottom: '20px', left: '-40px', width: '160px', height: '160px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(194,160,103,0.12) 0%, transparent 70%)',
            filter: 'blur(40px)',
            pointerEvents: 'none',
            animationDelay: '-3.5s',
          }}
        />

        {/* Eyebrow */}
        <div
          className="eyebrow mb-5"
          style={{ animationDelay: '0.1s', animationFillMode: 'both' }}
        >
          AI Hologram Memorial
        </div>

        {/* Headline */}
        <h1
          className="text-[28px] leading-[1.18] font-bold mb-4"
          style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)', letterSpacing: '-0.03em' }}
        >
          사진 한 장이면,
          <br />
          다시 만날 수 있어요
        </h1>

        {/* Subheadline */}
        <p className="text-[14px] leading-relaxed mb-7" style={{ color: 'var(--text-soft)' }}>
          AI가 소중한 반려동물의 모습을
          <br />
          살아 움직이는 홀로그램으로 되살립니다
        </p>

        {/* CTA */}
        <div className="w-full max-w-[280px]">
          <Button fullWidth size="lg" onClick={handleStart}>
            지금 시작하기
          </Button>
        </div>
        <p className="mt-3 text-[10px]" style={{ color: 'var(--text-muted)' }}>
          가입 시 120 크레딧 무료 제공
        </p>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 2 — Hologram Simulation (Dark)
      ═══════════════════════════════════════════════════════ */}
      <section
        ref={setSectionRef(0)}
        className="mx-4 rounded-[24px] py-14 px-6 flex flex-col items-center"
        style={{
          ...fadeStyle(),
          background: 'linear-gradient(180deg, #1a1410 0%, #251b17 40%, #1e1612 100%)',
          boxShadow: '0 24px 60px rgba(37,27,23,0.4)',
        }}
      >
        {/* Hologram Frame */}
        <div className="relative animate-holo-float" style={{ width: '180px' }}>
          {/* Main frame */}
          <div
            className="animate-holo-glow"
            style={{
              width: '100%',
              aspectRatio: '9/16',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.10)',
              background: `
                radial-gradient(ellipse at 50% 35%, rgba(159, 120, 92, 0.25) 0%, transparent 55%),
                radial-gradient(ellipse at 50% 65%, rgba(100, 200, 255, 0.06) 0%, transparent 45%),
                linear-gradient(180deg, rgba(30, 22, 18, 0.95), rgba(37, 27, 23, 0.98))
              `,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Paw icon center */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span
                className="text-5xl animate-pulse-warm"
                style={{ filter: 'drop-shadow(0 0 20px rgba(100,200,255,0.3))' }}
              >
                🐾
              </span>
            </div>

            {/* Scan lines */}
            <div
              style={{
                position: 'absolute', inset: 0,
                background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(100, 200, 255, 0.025) 3px, rgba(100, 200, 255, 0.025) 4px)',
                pointerEvents: 'none',
              }}
            />

            {/* Moving scan bar */}
            <div
              className="animate-holo-scan"
              style={{
                position: 'absolute', left: 0, right: 0, height: '40px',
                background: 'linear-gradient(180deg, transparent, rgba(100,200,255,0.06), transparent)',
                pointerEvents: 'none',
              }}
            />
          </div>

          {/* Reflection */}
          <div
            style={{
              width: '100%', height: '60px',
              marginTop: '-2px',
              background: 'linear-gradient(180deg, rgba(100,200,255,0.06), transparent)',
              borderRadius: '0 0 10px 10px',
              transform: 'scaleY(-0.5)',
              opacity: 0.4,
              pointerEvents: 'none',
            }}
          />
        </div>

        {/* Description */}
        <p className="mt-6 text-[11px] text-center leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
          아크릴 프리즘 위에 스마트폰을 올려놓으면
          <br />
          입체적인 홀로그램이 나타납니다
        </p>
        <p className="mt-2 text-[9px]" style={{ color: 'rgba(100,200,255,0.5)' }}>
          실제 홀로그램 미리보기
        </p>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 3 — How It Works (3 Steps)
      ═══════════════════════════════════════════════════════ */}
      <section ref={setSectionRef(1)} className="px-6 py-14" style={fadeStyle(0.1)}>
        <p className="section-heading text-center mb-1">How it works</p>
        <h2
          className="text-center text-[18px] font-bold mb-7"
          style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
        >
          간단 3단계로 완성
        </h2>

        <div className="relative">
          {/* Vertical connecting line */}
          <div
            className="absolute"
            style={{
              left: '27px', top: '44px', bottom: '44px', width: '2px',
              background: 'repeating-linear-gradient(180deg, var(--border-card) 0px, var(--border-card) 4px, transparent 4px, transparent 8px)',
            }}
          />

          <div className="space-y-3 relative">
            {STEPS.map((s, i) => (
              <div
                key={i}
                className="flex items-center gap-4 rounded-[16px] p-4"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', backdropFilter: 'blur(10px)' }}
              >
                {/* Step number circle */}
                <div
                  className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full text-[13px] font-bold"
                  style={{ background: 'var(--gradient-warm)', color: 'var(--text-inverse)', boxShadow: '0 4px 14px rgba(159,120,92,0.25)' }}
                >
                  {s.num}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>
                      {s.title}
                    </span>
                    <span className="text-sm">{s.icon}</span>
                  </div>
                  <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    {s.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 4 — 12 Motion Types
      ═══════════════════════════════════════════════════════ */}
      <section ref={setSectionRef(2)} className="px-6 pb-14" style={fadeStyle(0.1)}>
        <h2
          className="text-center text-[18px] font-bold mb-1"
          style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
        >
          12가지 살아있는 모션
        </h2>
        <p className="text-center text-[12px] mb-6" style={{ color: 'var(--text-muted)' }}>
          자연스러운 움직임으로 추억에 생명을
        </p>

        <div className="grid grid-cols-4 gap-2">
          {MOTIONS.map((m, i) => (
            <div
              key={i}
              className="flex flex-col items-center gap-1 rounded-[12px] py-3 px-1 transition-transform duration-200 active:scale-[0.95]"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)' }}
            >
              <span className="text-xl">{m.emoji}</span>
              <span className="text-[9px] font-semibold text-center leading-tight" style={{ color: 'var(--text-secondary)' }}>
                {m.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 5 — Pricing
      ═══════════════════════════════════════════════════════ */}
      <section ref={setSectionRef(3)} className="px-6 pb-14" style={fadeStyle(0.1)}>
        <h2
          className="text-center text-[18px] font-bold mb-6"
          style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
        >
          투명한 가격 안내
        </h2>

        <div
          className="rounded-[16px] p-4"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', backdropFilter: 'blur(10px)' }}
        >
          <div className="space-y-2.5">
            {CREDITS_TABLE.map((row, i) => (
              <div
                key={i}
                className="flex items-center justify-between pb-2.5"
                style={{ borderBottom: i < CREDITS_TABLE.length - 1 ? '1px solid var(--border-card)' : 'none' }}
              >
                <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>{row.item}</span>
                <span
                  className="text-[12px] font-bold"
                  style={{ color: row.accent ? 'var(--accent-green)' : 'var(--accent-warm)' }}
                >
                  {row.cost}
                </span>
              </div>
            ))}
          </div>

          {/* Promo badge */}
          <div
            className="mt-3 rounded-[12px] p-3 text-center"
            style={{ background: 'var(--accent-warm-bg)' }}
          >
            <p className="text-[12px] font-bold" style={{ color: 'var(--accent-warm)' }}>
              가입 시 120크레딧 무료
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              프로필 1개 + 모션 2개 생성 가능
            </p>
          </div>
        </div>

        <div className="mt-3 text-center">
          <button
            onClick={() => router.push('/pricing')}
            className="text-[11px] underline"
            style={{ color: 'var(--text-muted)' }}
          >
            자세한 요금 안내 보기
          </button>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 6 — Trust / Social Proof
      ═══════════════════════════════════════════════════════ */}
      <section ref={setSectionRef(4)} className="px-6 pb-14" style={fadeStyle(0.1)}>
        {/* Metrics bar */}
        <div
          className="flex items-center justify-center rounded-[16px] py-5"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', backdropFilter: 'blur(10px)' }}
        >
          {METRICS.map((m, i) => (
            <div key={i} className="flex items-center">
              <div className="text-center px-5">
                <p className="text-[20px] font-bold" style={{ color: 'var(--accent-warm)' }}>{m.value}</p>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{m.label}</p>
              </div>
              {i < METRICS.length - 1 && (
                <div className="h-8 w-px" style={{ background: 'var(--border-card)' }} />
              )}
            </div>
          ))}
        </div>

        {/* Tech badges */}
        <div className="flex items-center justify-center gap-2 mt-3">
          <span className="kpi-pill text-[10px]">
            <span style={{ color: 'var(--accent-holo)' }}>AI</span> NanoBanana 2
          </span>
          <span className="kpi-pill text-[10px]">
            <span style={{ color: 'var(--accent-holo)' }}>Video</span> Kling 3.0
          </span>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 7 — FAQ Accordion
      ═══════════════════════════════════════════════════════ */}
      <section ref={setSectionRef(5)} className="px-6 pb-14" style={fadeStyle(0.1)}>
        <h2
          className="text-center text-[18px] font-bold mb-6"
          style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
        >
          자주 묻는 질문
        </h2>

        <div className="space-y-2">
          {LANDING_FAQ.map((item, i) => (
            <div
              key={i}
              className="rounded-[14px] overflow-hidden"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)' }}
            >
              <button
                onClick={() => toggleFaq(i)}
                className="w-full flex items-center justify-between px-4 py-3.5 text-left"
              >
                <span className="text-[12px] font-semibold pr-3" style={{ color: 'var(--text-primary)' }}>
                  {item.q}
                </span>
                <span
                  className="text-[10px] shrink-0 transition-transform duration-200"
                  style={{
                    color: 'var(--text-muted)',
                    transform: openFaq.has(i) ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                >
                  ▼
                </span>
              </button>
              {openFaq.has(i) && (
                <div className="px-4 pb-4">
                  <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    {item.a}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-3 text-center">
          <button
            onClick={() => router.push('/faq')}
            className="text-[11px] underline"
            style={{ color: 'var(--text-muted)' }}
          >
            더 많은 질문 보기
          </button>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 8 — Final CTA
      ═══════════════════════════════════════════════════════ */}
      <section ref={setSectionRef(6)} className="px-6 pb-14 text-center" style={fadeStyle(0.1)}>
        {/* Decorative orb */}
        <div
          className="w-12 h-12 rounded-full mx-auto mb-5 animate-pulse-warm"
          style={{ background: 'var(--gradient-holo)', boxShadow: '0 8px 30px rgba(159,120,92,0.2)' }}
        />

        <h2
          className="text-[20px] font-bold leading-snug mb-3"
          style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
        >
          소중한 추억을,
          <br />
          다시 곁에
        </h2>
        <p className="text-[13px] mb-7" style={{ color: 'var(--text-soft)' }}>
          사진 한 장으로 시작하세요
        </p>

        <div className="w-full max-w-[280px] mx-auto">
          <Button fullWidth size="lg" onClick={handleStart}>
            무료로 시작하기
          </Button>
        </div>
        <p className="mt-3 text-[10px]" style={{ color: 'var(--text-muted)' }}>
          120크레딧 무료 제공
        </p>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 9 — Footer
      ═══════════════════════════════════════════════════════ */}
      <footer className="px-6 pb-10">
        <div className="memory-divider mb-6" />
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
          <button onClick={() => router.push('/terms')} className="underline">이용약관</button>
          <span>|</span>
          <button onClick={() => router.push('/privacy')} className="underline">개인정보처리방침</button>
          <span>|</span>
          <button onClick={() => router.push('/faq')} className="underline">FAQ</button>
          <span>|</span>
          <button onClick={() => router.push('/contact')} className="underline">문의하기</button>
          <span>|</span>
          <button onClick={() => router.push('/about')} className="underline">소개</button>
        </div>
        <p className="mt-3 text-center text-[9px]" style={{ color: 'var(--text-muted)' }}>
          &copy; 2025 PetHolo. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
