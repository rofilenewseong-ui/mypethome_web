'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import { useToastStore } from '@/stores/useToastStore';

const CATEGORIES = ['일반 문의', '결제/환불', '기술 지원', '제안/건의', '기타'];

export default function ContactPage() {
  const router = useRouter();
  const { addToast } = useToastStore();
  const [form, setForm] = useState({ name: '', email: '', category: CATEGORIES[0], message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      addToast('모든 필수 항목을 입력해 주세요.', 'warning');
      return;
    }
    setSubmitting(true);
    // Simply show success — real API integration will be added later
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 800);
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: 'var(--bg-page)' }}>
        <div className="text-center">
          <div className="text-4xl mb-4">✉️</div>
          <h2 className="text-sm font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            문의가 접수되었습니다
          </h2>
          <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>
            빠른 시간 내에 답변 드리겠습니다
          </p>
          <Button size="md" onClick={() => router.push('/')}>
            홈으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  const inputStyle = {
    background: 'var(--bg-input)',
    border: '1px solid var(--border-input)',
    color: 'var(--text-primary)',
  };

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
        문의하기
      </h1>
      <p className="text-xs text-center mb-8" style={{ color: 'var(--text-muted)' }}>
        궁금한 점이나 불편한 점을 알려주세요
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            이름 *
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="이름을 입력하세요"
            className="w-full rounded-[12px] px-4 py-3 text-xs outline-none"
            style={inputStyle}
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            이메일 *
          </label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="답변 받을 이메일을 입력하세요"
            className="w-full rounded-[12px] px-4 py-3 text-xs outline-none"
            style={inputStyle}
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            카테고리
          </label>
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="w-full rounded-[12px] px-4 py-3 text-xs outline-none appearance-none"
            style={inputStyle}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            내용 *
          </label>
          <textarea
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            placeholder="문의 내용을 입력하세요"
            rows={5}
            className="w-full rounded-[12px] px-4 py-3 text-xs outline-none resize-none"
            style={inputStyle}
          />
        </div>

        <Button fullWidth size="lg" type="submit" loading={submitting}>
          문의 보내기
        </Button>
      </form>

      {/* FAQ link */}
      <div
        className="mt-8 rounded-[14px] p-4 text-center"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)' }}
      >
        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
          자주 묻는 질문에서 바로 답을 찾아보세요
        </p>
        <button
          onClick={() => router.push('/faq')}
          className="mt-1 text-xs font-semibold underline"
          style={{ color: 'var(--accent-warm)' }}
        >
          FAQ 바로가기
        </button>
      </div>

      {/* Footer */}
      <footer className="mt-8 text-center">
        <div className="flex items-center justify-center gap-3 text-[10px]" style={{ color: 'var(--text-muted)' }}>
          <button onClick={() => router.push('/')} className="underline">홈</button>
          <span>|</span>
          <button onClick={() => router.push('/terms')} className="underline">이용약관</button>
          <span>|</span>
          <button onClick={() => router.push('/privacy')} className="underline">개인정보처리방침</button>
        </div>
      </footer>
    </div>
  );
}
