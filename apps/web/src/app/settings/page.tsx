'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/useAuthStore';
import { creditsApi } from '@/lib/api';
import MobileLayout from '@/components/layout/MobileLayout';
import { Button, Modal, Skeleton } from '@/components/ui';
import { useToastStore } from '@/stores/useToastStore';

interface CreditHistory {
  id: string;
  icon: string;
  name: string;
  date: string;
  amount: number;
}

const demoCreditHistory: CreditHistory[] = [
  { id: '1', icon: '🎬', name: '베이스 영상 생성', date: '03.03', amount: -40 },
  { id: '2', icon: '🎭', name: '모션 생성', date: '03.02', amount: -40 },
  { id: '3', icon: '♻️', name: '삭제 환불 (50%)', date: '03.01', amount: 20 },
  { id: '4', icon: '🎁', name: '정품 인증 보너스', date: '02.28', amount: 120 },
];

type SettingsView = 'home' | 'history' | 'config';

export default function SettingsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const addToast = useToastStore((s) => s.addToast);
  const updateCredits = useAuthStore((s) => s.updateCredits);
  const [view, setView] = useState<SettingsView>('home');
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [code, setCode] = useState('');
  const [creditHistory, setCreditHistory] = useState(demoCreditHistory);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [codeError, setCodeError] = useState('');
  const [codeLoading, setCodeLoading] = useState(false);
  const [notifications, setNotifications] = useState({
    messenger: true,
    videoComplete: true,
    announcements: false,
    promotions: false,
  });

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    const fetchCredits = async () => {
      try {
        const [balanceRes, historyRes] = await Promise.allSettled([
          creditsApi.balance(),
          creditsApi.history(),
        ]);
        if (balanceRes.status === 'fulfilled' && balanceRes.value.data?.data) {
          updateCredits(balanceRes.value.data.data.credits);
        }
        if (historyRes.status === 'fulfilled' && historyRes.value.data?.data) {
          const items = historyRes.value.data.data;
          if (items.length > 0) {
            setCreditHistory(
              items.map((item: Record<string, unknown>) => ({
                id: item.id as string,
                icon: (item.type === 'EARN' || item.type === 'REFUND') ? '💰' : '🎬',
                name: item.description as string,
                date: new Date(item.createdAt as string).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' }),
                amount: item.amount as number,
              }))
            );
          }
        }
      } catch {
        // 데모 데이터 유지
      } finally {
        setIsLoadingHistory(false);
      }
    };
    fetchCredits();
  }, [updateCredits]);

  return (
    <MobileLayout showCredits={false}>
      <div className="p-5 space-y-5 animate-fade-in">

        {view === 'home' && (
          <>
            {/* 보유 크레딧 — 발바닥 아이콘 */}
            <div
              className="rounded-[var(--radius-lg)] p-8 text-center"
              style={{ background: 'rgba(107, 142, 94, 0.06)', border: '1px solid rgba(107, 142, 94, 0.15)' }}
            >
              <span className="text-4xl">🐾</span>
              <div className="text-5xl font-extrabold mt-3" style={{ color: 'var(--accent-green)' }}>
                {user?.credits ?? 0}
              </div>
              <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>보유 크레딧</p>
            </div>

            {/* 메뉴 아이콘 3개 */}
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => window.open('https://coreflow5103.cafe24.com/category/My-Pet-Home/59/', '_blank')}
                className="flex flex-col items-center gap-2 rounded-[var(--radius-lg)] py-4 transition-transform active:scale-[0.97]"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)' }}
              >
                <span className="text-2xl">💎</span>
                <span className="text-[11px] font-bold" style={{ color: 'var(--text-primary)' }}>충전하기</span>
              </button>
              <button
                onClick={() => setShowCodeModal(true)}
                className="flex flex-col items-center gap-2 rounded-[var(--radius-lg)] py-4 transition-transform active:scale-[0.97]"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)' }}
              >
                <span className="text-2xl">🔑</span>
                <span className="text-[11px] font-bold" style={{ color: 'var(--text-primary)' }}>코드 입력</span>
              </button>
              <button
                onClick={() => setView('history')}
                className="flex flex-col items-center gap-2 rounded-[var(--radius-lg)] py-4 transition-transform active:scale-[0.97]"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)' }}
              >
                <span className="text-2xl">📋</span>
                <span className="text-[11px] font-bold" style={{ color: 'var(--text-primary)' }}>사용 내역</span>
              </button>
            </div>

          </>
        )}

        {view === 'history' && (
          <>
            {/* 뒤로가기 */}
            <button
              onClick={() => setView('home')}
              className="flex items-center gap-2 text-sm font-semibold"
              style={{ color: 'var(--text-secondary)' }}
            >
              ← 사용 내역
            </button>

            {/* 내역 리스트 */}
            <div className="space-y-2">
              {isLoadingHistory ? (
                <Skeleton height="56px" count={4} />
              ) : creditHistory.length === 0 ? (
                <div className="text-center py-8">
                  <span className="text-3xl">📭</span>
                  <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>사용 내역이 없습니다</p>
                </div>
              ) : (
                creditHistory.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 rounded-[var(--radius-sm)]"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)' }}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <div className="flex-1">
                      <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{item.name}</p>
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{item.date}</p>
                    </div>
                    <span
                      className="text-sm font-bold"
                      style={{ color: item.amount > 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}
                    >
                      {item.amount > 0 ? '+' : ''}{item.amount}C
                    </span>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* 코드 입력 모달 */}
      <Modal isOpen={showCodeModal} onClose={() => setShowCodeModal(false)} title="코드 입력">
        <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
          안내받으신 코드를 입력해 주세요.
        </p>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="XXXX-XXXX-XXXX"
          className="w-full rounded-[var(--radius-sm)] px-4 py-3 text-sm text-center font-mono tracking-widest outline-none"
          style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-primary)' }}
        />
        {codeError && (
          <p className="text-[11px] mt-1 mb-2" style={{ color: 'var(--accent-red)' }}>{codeError}</p>
        )}
        <div className="flex gap-3 mt-4">
          <Button variant="secondary" fullWidth onClick={() => { setShowCodeModal(false); setCodeError(''); }}>
            취소
          </Button>
          <Button fullWidth disabled={code.length < 6} loading={codeLoading} onClick={async () => {
            setCodeError('');
            setCodeLoading(true);
            try {
              const { data } = await creditsApi.redeemCode(code);
              if (data?.data?.credits) updateCredits(data.data.credits);
              addToast('코드가 확인되었습니다.', 'success');
              setShowCodeModal(false);
              setCode('');
            } catch (err: unknown) {
              const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || '유효하지 않은 코드입니다.';
              setCodeError(msg);
            } finally {
              setCodeLoading(false);
            }
          }}>
            확인
          </Button>
        </div>
      </Modal>
    </MobileLayout>
  );
}
