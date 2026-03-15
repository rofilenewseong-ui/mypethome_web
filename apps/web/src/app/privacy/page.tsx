'use client';

import { useRouter } from 'next/navigation';

const SECTIONS = [
  {
    title: '1. 수집하는 개인정보 항목',
    content:
      '필수 항목: Cafe24 계정 정보 (이름, 이메일, 고유 ID). 선택 항목: 반려동물 사진, 반려동물 이름 및 정보. 자동 수집: 서비스 이용 기록, 접속 로그, 기기 정보.',
  },
  {
    title: '2. 개인정보의 이용 목적',
    content:
      '회원 가입 및 서비스 이용을 위한 본인 확인. AI 기반 반려동물 이미지 생성 및 영상 변환 서비스 제공. 크레딧 관리 및 결제 처리. 서비스 개선 및 통계 분석. 고객 문의 대응 및 공지사항 전달.',
  },
  {
    title: '3. 제3자 제공',
    content:
      '회사는 원칙적으로 회원의 개인정보를 외부에 제공하지 않습니다. 다만, 서비스 제공을 위해 아래 제3자에게 필요한 최소한의 정보를 제공합니다: Cafe24 (인증 및 결제), Google Cloud / Firebase (데이터 저장 및 인증), Google Gemini API (AI 이미지 생성 - 반려동물 사진 전송), Kling AI API (영상 변환 - 생성된 이미지 전송).',
  },
  {
    title: '4. 개인정보 보유 및 이용 기간',
    content:
      '회원 탈퇴 시까지 보유합니다. 탈퇴 후 30일 이내에 모든 개인정보를 파기합니다. 관계 법령에 의한 보존 의무가 있는 경우 해당 기간 동안 보관합니다: 전자상거래 관련 기록 5년, 접속 기록 3개월.',
  },
  {
    title: '5. 개인정보 파기 절차 및 방법',
    content:
      '보유 기간이 경과하거나 처리 목적이 달성된 경우, 지체 없이 해당 개인정보를 파기합니다. 전자적 파일: 복구 불가능한 방법으로 영구 삭제. 종이 문서: 분쇄기로 파쇄.',
  },
  {
    title: '6. 이용자의 권리 및 행사 방법',
    content:
      '회원은 언제든지 자신의 개인정보를 조회, 수정, 삭제할 수 있습니다. 서비스 설정 페이지 또는 고객센터를 통해 요청할 수 있습니다. 개인정보 삭제 요청 시, 관련 서비스 이용이 제한될 수 있습니다.',
  },
  {
    title: '7. 개인정보 보호책임자',
    content:
      '회사는 개인정보 처리에 관한 업무를 총괄하는 개인정보 보호책임자를 지정하고 있습니다. 개인정보 관련 문의사항은 문의하기 페이지를 통해 접수해 주세요.',
  },
  {
    title: '8. 개인정보 처리방침 변경',
    content:
      '이 개인정보 처리방침은 법령 및 회사 정책 변경에 따라 수정될 수 있습니다. 변경 시 서비스 내 공지사항을 통해 안내합니다.',
  },
];

export default function PrivacyPage() {
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
        개인정보 처리방침
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
          <button onClick={() => router.push('/terms')} className="underline">이용약관</button>
          <span>|</span>
          <button onClick={() => router.push('/faq')} className="underline">FAQ</button>
        </div>
      </footer>
    </div>
  );
}
