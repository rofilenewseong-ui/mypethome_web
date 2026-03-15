'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';

interface FaqItem {
  q: string;
  a: string;
}

const FAQ_CATEGORIES: { label: string; icon: string; items: FaqItem[] }[] = [
  {
    label: '펫 등록',
    icon: '🐾',
    items: [
      { q: '어떤 사진이 좋나요?', a: '밝고 선명한 정면 사진과 전신이 보이는 사진이 가장 좋습니다. 배경이 단순하고, 반려동물이 카메라를 바라보는 사진을 추천합니다. 최소 512x512 해상도 이상이어야 합니다.' },
      { q: '사진은 몇 장 필요한가요?', a: '정면(얼굴) 사진 1장과 전신 사진 1장, 총 2장이 필요합니다. 선택적으로 의상/액세서리 사진 1장을 추가할 수 있습니다.' },
      { q: '강아지, 고양이 외 다른 동물도 가능한가요?', a: '현재는 강아지와 고양이에 최적화되어 있습니다. 다른 동물도 등록은 가능하지만 AI 생성 품질이 다를 수 있습니다.' },
    ],
  },
  {
    label: '프로필 생성',
    icon: '🎨',
    items: [
      { q: 'AI 이미지가 마음에 안 들면 어떻게 하나요?', a: 'AI가 3장의 후보 이미지를 생성합니다. 30분 안에 마음에 드는 것을 선택하면 됩니다. 모두 마음에 들지 않으면 10크레딧으로 재생성할 수 있습니다.' },
      { q: '30분 타이머가 지나면 어떻게 되나요?', a: '30분이 지나면 자동으로 첫 번째 이미지가 선택되어 베이스 영상이 생성됩니다.' },
      { q: '프로필은 몇 개까지 만들 수 있나요?', a: '크레딧이 충분하다면 제한 없이 만들 수 있습니다. 하나의 반려동물에 여러 프로필(다양한 포즈/의상)을 만들 수도 있습니다.' },
    ],
  },
  {
    label: '영상/모션',
    icon: '🎬',
    items: [
      { q: '영상 생성에 얼마나 걸리나요?', a: '베이스 영상은 약 3~5분, 모션 영상은 약 2~4분 정도 소요됩니다. AI 서버 상태에 따라 다소 차이가 있을 수 있습니다.' },
      { q: '모션은 몇 개까지 추가할 수 있나요?', a: '프로필당 최대 12가지 모션을 추가할 수 있습니다: 앞발 들기, 혀 내밀기, 고개 갸우뚱, 꼬리 흔들기, 숨쉬기, 귀 세우기, 눈 깜빡이기, 인사하기, 하품하기, 기지개, 두리번거리기, 즐거워하기.' },
      { q: '영상은 어떤 형식인가요?', a: '9:16 세로 비율의 MP4 영상으로, 스마트폰에서 최적화되어 있습니다. 홀로그램 아크릴 프리즘과 함께 사용할 수 있습니다.' },
    ],
  },
  {
    label: '크레딧/결제',
    icon: '💎',
    items: [
      { q: '크레딧은 어떻게 충전하나요?', a: '스토어에서 원하는 크레딧 패키지를 선택하여 결제하면 즉시 충전됩니다.' },
      { q: '환불 규정이 어떻게 되나요?', a: '모션 삭제 시 사용 크레딧의 50%가 자동 환불됩니다. 크레딧 구매 환불은 결제 후 7일 이내 미사용 크레딧에 한합니다.' },
      { q: '크레딧 유효기간이 있나요?', a: '크레딧은 구매일로부터 1년간 유효합니다. 가입 시 지급되는 무료 크레딧도 동일합니다.' },
    ],
  },
  {
    label: '기기/호환',
    icon: '📱',
    items: [
      { q: '어떤 기기에서 볼 수 있나요?', a: '모든 스마트폰과 태블릿에서 영상을 재생할 수 있습니다. 홀로그램 효과를 위해서는 아크릴 프리즘이 필요합니다.' },
      { q: '아크릴 프리즘은 어떻게 사용하나요?', a: '스마트폰 위에 아크릴 프리즘을 올려놓고, 전용 플레이어에서 영상을 재생하면 입체적인 홀로그램을 감상할 수 있습니다. 어두운 환경에서 최적의 효과를 볼 수 있습니다.' },
    ],
  },
];

export default function FaqPage() {
  const router = useRouter();
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  const toggle = (key: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const filtered = search.trim()
    ? FAQ_CATEGORIES.map((cat) => ({
        ...cat,
        items: cat.items.filter(
          (item) =>
            item.q.toLowerCase().includes(search.toLowerCase()) ||
            item.a.toLowerCase().includes(search.toLowerCase())
        ),
      })).filter((cat) => cat.items.length > 0)
    : FAQ_CATEGORIES;

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
        자주 묻는 질문
      </h1>
      <p className="text-xs text-center mb-6" style={{ color: 'var(--text-muted)' }}>
        궁금한 점을 빠르게 찾아보세요
      </p>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="검색어를 입력하세요..."
          className="w-full rounded-[12px] px-4 py-3 text-xs outline-none"
          style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border-input)',
            color: 'var(--text-primary)',
          }}
        />
      </div>

      {/* Categories */}
      {filtered.length === 0 ? (
        <p className="text-center text-xs py-8" style={{ color: 'var(--text-muted)' }}>
          검색 결과가 없습니다
        </p>
      ) : (
        <div className="space-y-6">
          {filtered.map((cat) => (
            <div key={cat.label}>
              <h2 className="flex items-center gap-2 mb-3">
                <span>{cat.icon}</span>
                <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{cat.label}</span>
              </h2>
              <div className="space-y-2">
                {cat.items.map((item, i) => {
                  const key = `${cat.label}-${i}`;
                  const isOpen = openItems.has(key);
                  return (
                    <div
                      key={key}
                      className="rounded-[14px] overflow-hidden"
                      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)' }}
                    >
                      <button
                        onClick={() => toggle(key)}
                        className="w-full flex items-center justify-between p-4 text-left"
                      >
                        <span className="text-xs font-semibold pr-3" style={{ color: 'var(--text-primary)' }}>
                          {item.q}
                        </span>
                        <span
                          className="text-xs shrink-0 transition-transform duration-200"
                          style={{
                            color: 'var(--text-muted)',
                            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                          }}
                        >
                          ▼
                        </span>
                      </button>
                      {isOpen && (
                        <div className="px-4 pb-4">
                          <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                            {item.a}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bottom */}
      <div
        className="mt-10 rounded-[14px] p-5 text-center"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)' }}
      >
        <p className="text-xs font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
          해결이 안 되셨나요?
        </p>
        <p className="text-[11px] mb-3" style={{ color: 'var(--text-muted)' }}>
          아래 버튼을 눌러 문의해 주세요
        </p>
        <Button size="sm" variant="secondary" onClick={() => router.push('/contact')}>
          문의하기
        </Button>
      </div>

      {/* Footer */}
      <footer className="mt-8 text-center">
        <div className="flex items-center justify-center gap-3 text-[10px]" style={{ color: 'var(--text-muted)' }}>
          <button onClick={() => router.push('/')} className="underline">홈</button>
          <span>|</span>
          <button onClick={() => router.push('/pricing')} className="underline">요금</button>
          <span>|</span>
          <button onClick={() => router.push('/about')} className="underline">소개</button>
        </div>
      </footer>
    </div>
  );
}
