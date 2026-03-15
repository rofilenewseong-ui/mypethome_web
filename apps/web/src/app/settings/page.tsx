'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/useAuthStore';
import { creditsApi } from '@/lib/api';
import MobileLayout from '@/components/layout/MobileLayout';
import { Card, Button, Modal, TabToggle, ListItem, Toggle, Badge, Skeleton, Avatar } from '@/components/ui';
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

// 크레딧 가격표 (목업 07 기반)
const creditPriceList = [
  { name: '프로필 생성 (베이스1 + 모션2)', cost: 120, icon: '🎬' },
  { name: '추가 모션 1개', cost: 40, icon: '🎭' },
  { name: 'AI 이미지 재생성', cost: 10, icon: '🔄' },
];

const settingsTabs = [
  { key: 'credits', label: '💰 크레딧' },
  { key: 'settings', label: '⚙️ 설정' },
];

export default function SettingsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const addToast = useToastStore((s) => s.addToast);
  const logout = useAuthStore((s) => s.logout);
  const refreshCredits = useAuthStore((s) => s.refreshCredits);
  const [activeTab, setActiveTab] = useState('credits');
  const updateCredits = useAuthStore((s) => s.updateCredits);
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

  // 크레딧 요약 계산 (목업 07 기반)
  const creditSummary = {
    totalIssued: creditHistory.filter((h) => h.amount > 0).reduce((sum, h) => sum + h.amount, 0),
    totalUsed: Math.abs(creditHistory.filter((h) => h.amount < 0).reduce((sum, h) => sum + h.amount, 0)),
    totalRefunded: creditHistory.filter((h) => h.amount > 0 && h.name.includes('환불')).reduce((sum, h) => sum + h.amount, 0),
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
        {/* 탭 전환 */}
        <TabToggle tabs={settingsTabs} activeTab={activeTab} onChange={setActiveTab} />

        {activeTab === 'credits' ? (
          <div className="space-y-5">
            {/* 잔액 카드 */}
            <div
              className="rounded-[var(--radius-lg)] p-6 text-center"
              style={{ background: 'rgba(107, 142, 94, 0.06)', border: '1px solid rgba(107, 142, 94, 0.15)' }}
            >
              <span className="text-3xl">💰</span>
              <div className="text-5xl font-extrabold mt-2" style={{ color: 'var(--accent-green)' }}>
                {user?.credits ?? 0}
              </div>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>보유 크레딧</p>
            </div>

            {/* 크레딧 요약 박스 (목업 07 기반) */}
            <div
              className="rounded-[var(--radius-lg)] p-4"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)' }}
            >
              <h4 className="text-[11px] font-bold mb-3" style={{ color: 'var(--text-secondary)' }}>
                크레딧 요약
              </h4>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-lg font-bold" style={{ color: 'var(--accent-green)' }}>
                    {creditSummary.totalIssued}
                  </p>
                  <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>총 발급</p>
                </div>
                <div>
                  <p className="text-lg font-bold" style={{ color: 'var(--accent-red)' }}>
                    {creditSummary.totalUsed}
                  </p>
                  <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>사용</p>
                </div>
                <div>
                  <p className="text-lg font-bold" style={{ color: 'var(--accent-orange)' }}>
                    {creditSummary.totalRefunded}
                  </p>
                  <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>환불</p>
                </div>
              </div>
            </div>

            {/* 액션 버튼 */}
            <div className="flex gap-3">
              <Button fullWidth onClick={() => router.push('/store')}>
                충전하기
              </Button>
              <Button fullWidth variant="secondary" onClick={() => setShowCodeModal(true)}>
                코드 입력
              </Button>
            </div>

            {/* 사용 내역 */}
            <section>
              <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
                사용 내역
              </h3>
              <div className="space-y-2">
                {isLoadingHistory ? (
                  <Skeleton height="56px" count={3} />
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
            </section>

            {/* 크레딧 가격표 (목업 07) */}
            <section>
              <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
                크레딧 사용 안내
              </h3>
              <Card hover={false}>
                <div className="space-y-3">
                  {creditPriceList.map((item) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{item.icon}</span>
                        <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{item.name}</span>
                      </div>
                      <span className="text-[12px] font-bold" style={{ color: 'var(--accent-orange)' }}>
                        {item.cost}C
                      </span>
                    </div>
                  ))}
                  <div className="border-t pt-3 mt-3" style={{ borderColor: 'var(--border-card)' }}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">♻️</span>
                        <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>삭제 시 환불</span>
                      </div>
                      <span className="text-[12px] font-bold" style={{ color: 'var(--accent-green)' }}>50%</span>
                    </div>
                    <p className="text-[9px] ml-6" style={{ color: 'var(--text-muted)' }}>
                      사용 비용의 50%가 크레딧으로 환불됩니다
                    </p>
                  </div>
                </div>
              </Card>
            </section>
          </div>
        ) : (
          /* ============ 설정 탭 ============ */
          <div className="space-y-5">
            {/* 인증 상태 카드 (목업 07 기반) */}
            <Card hover={false}>
              <div className="flex items-center gap-3">
                <Avatar
                  fallback={user?.isVerified ? '✅' : '🥉'}
                  size="md"
                />
                <div className="flex-1">
                  <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                    {user?.isVerified ? '정품 인증 완료' : '체험 모드'}
                  </p>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    {user?.isVerified ? '정품 인증 완료 · 전체 기능 이용 가능' : '체험 모드 · 샘플 체험'}
                  </p>
                </div>
                <Badge variant="status" className="text-white" >
                  {user?.isVerified ? '인증됨' : '체험'}
                </Badge>
              </div>
            </Card>

            {/* 계정 정보 */}
            <section>
              <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>계정 정보</h3>
              <Card hover={false}>
                <div className="space-y-3">
                  <ListItem icon="📧" label="이메일" trailing={<span className="text-[12px] font-medium" style={{ color: 'var(--text-muted)' }}>{user?.email || '미연동'}</span>} />
                  <ListItem icon="👤" label="이름" trailing={<span className="text-[12px] font-medium" style={{ color: 'var(--text-muted)' }}>{user?.name || '보호자'}</span>} />
                  <ListItem icon="🏠" label="자사몰 연동" trailing={<span className="text-[12px] font-medium" style={{ color: 'var(--text-muted)' }}>{user?.isVerified ? '연동됨' : '미연동'}</span>} />
                </div>
              </Card>
            </section>

            {/* 알림 설정 */}
            <section>
              <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>알림 설정</h3>
              <Card hover={false}>
                <div className="space-y-3">
                  <ListItem icon="💬" label="메신저 답장" trailing={<Toggle enabled={notifications.messenger} onChange={() => toggleNotification('messenger')} />} />
                  <ListItem icon="🎬" label="영상 생성 완료" trailing={<Toggle enabled={notifications.videoComplete} onChange={() => toggleNotification('videoComplete')} />} />
                  <ListItem icon="📢" label="공지사항" trailing={<Toggle enabled={notifications.announcements} onChange={() => toggleNotification('announcements')} />} />
                  <ListItem icon="📬" label="소식" trailing={<Toggle enabled={notifications.promotions} onChange={() => toggleNotification('promotions')} />} />
                </div>
              </Card>
            </section>

            {/* 기타 */}
            <section>
              <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>기타</h3>
              <Card hover={false}>
                <div className="space-y-1">
                  <ListItem icon="🗑️" label="휴지통" trailing={<Badge variant="count">3</Badge>} onClick={() => router.push('/trash')} />
                  <ListItem icon="📄" label="이용약관" onClick={() => router.push('/terms')} />
                  <ListItem icon="🔒" label="개인정보 처리방침" onClick={() => router.push('/privacy')} />
                  <ListItem icon="ℹ️" label="앱 버전" trailing={<span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>v1.0.0</span>} />
                  <div className="border-t pt-2 mt-2" style={{ borderColor: 'var(--border-card)' }}>
                    <button
                      onClick={() => { logout(); router.replace('/entry'); }}
                      className="w-full text-left py-2 text-xs font-semibold"
                      style={{ color: 'var(--accent-red)' }}
                    >
                      🚪 로그아웃
                    </button>
                  </div>
                </div>
              </Card>
            </section>
          </div>
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
