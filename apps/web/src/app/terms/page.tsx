'use client';

import { useRouter } from 'next/navigation';

const SECTIONS = [
  {
    title: '제1조 (목적)',
    content:
      '이 약관은 PetHolo(이하 "서비스")가 제공하는 반려동물 홀로그램 생성 서비스의 이용과 관련하여 회사와 회원 간의 권리, 의무 및 기타 필요한 사항을 규정함을 목적으로 합니다.',
  },
  {
    title: '제2조 (정의)',
    content:
      '"서비스"란 회사가 제공하는 AI 기반 반려동물 이미지 생성, 영상 변환, 홀로그램 디스플레이 관련 일체의 서비스를 말합니다. "회원"이란 서비스에 가입하여 이용계약을 체결한 자를 말합니다. "크레딧"이란 서비스 내에서 콘텐츠 생성에 사용되는 가상 재화를 말합니다.',
  },
  {
    title: '제3조 (서비스 이용)',
    content:
      '서비스는 Cafe24 계정을 통해 가입 및 로그인할 수 있습니다. 회원은 서비스를 통해 반려동물 사진을 업로드하고, AI를 활용한 이미지 생성 및 영상 변환 서비스를 이용할 수 있습니다. 서비스 이용에는 크레딧이 필요하며, 크레딧은 가입 시 무료로 지급되거나 유료로 구매할 수 있습니다.',
  },
  {
    title: '제4조 (크레딧 및 결제)',
    content:
      '가입 시 120 크레딧이 무료 지급됩니다. 프로필 생성: 40크레딧, 모션 추가: 40크레딧, AI 이미지 재생성: 10크레딧, 프로필 복원: 20크레딧이 소요됩니다. 모션 삭제 시 사용 크레딧의 50%(20크레딧)가 환불됩니다. 크레딧 유효기간은 구매일로부터 1년입니다.',
  },
  {
    title: '제5조 (환불 규정)',
    content:
      '크레딧 구매 후 7일 이내 미사용 크레딧에 한해 환불이 가능합니다. 일부 사용 시 미사용 크레딧에 대해 환불이 가능합니다. 무료 지급된 크레딧은 환불 대상이 아닙니다. 환불 신청은 고객센터를 통해 접수됩니다.',
  },
  {
    title: '제6조 (콘텐츠 소유권)',
    content:
      '회원이 업로드한 반려동물 사진의 저작권은 회원에게 있습니다. AI를 통해 생성된 이미지 및 영상의 저작권은 회원에게 귀속됩니다. 회사는 서비스 개선 및 마케팅 목적으로 생성된 콘텐츠를 익명화하여 사용할 수 있으며, 회원은 이에 동의한 것으로 간주합니다.',
  },
  {
    title: '제7조 (면책 조항)',
    content:
      'AI 생성물의 품질은 입력 사진의 품질에 따라 달라질 수 있으며, 회사는 특정 수준의 결과물을 보장하지 않습니다. 천재지변, 서버 장애 등 불가항력적인 사유로 인한 서비스 중단에 대해 회사는 책임을 지지 않습니다. 회원의 귀책 사유로 인한 손해에 대해 회사는 책임을 지지 않습니다.',
  },
  {
    title: '제8조 (서비스 변경 및 중단)',
    content:
      '회사는 서비스의 내용, 운영상 또는 기술적 필요에 따라 서비스를 변경하거나 중단할 수 있습니다. 서비스 변경 또는 중단 시 회원에게 사전 고지합니다.',
  },
  {
    title: '부칙',
    content: '이 약관은 2025년 1월 1일부터 시행됩니다.',
  },
];

export default function TermsPage() {
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
        이용약관
      </h1>
      <p className="text-[10px] text-center mb-8" style={{ color: 'var(--text-muted)' }}>
        최종 수정일: 2025년 1월 1일
      </p>

      <div className="space-y-5">
        {SECTIONS.map((s, i) => (
          <div key={i}>
            <h2 className="text-xs font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              {s.title}
            </h2>
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {s.content}
            </p>
          </div>
        ))}
      </div>

      {/* Footer */}
      <footer className="mt-10 text-center">
        <div className="flex items-center justify-center gap-3 text-[10px]" style={{ color: 'var(--text-muted)' }}>
          <button onClick={() => router.push('/')} className="underline">홈</button>
          <span>|</span>
          <button onClick={() => router.push('/privacy')} className="underline">개인정보처리방침</button>
          <span>|</span>
          <button onClick={() => router.push('/faq')} className="underline">FAQ</button>
        </div>
      </footer>
    </div>
  );
}
