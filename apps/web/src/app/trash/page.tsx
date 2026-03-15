'use client';

import { useState, useEffect } from 'react';
import { trashApi } from '@/lib/api';
import MobileLayout from '@/components/layout/MobileLayout';
import { Button, Modal, TabToggle, Skeleton, EmptyState, Alert, Badge } from '@/components/ui';

interface TrashItem {
  id: string;
  type: 'base' | 'motion';
  name: string;
  petName: string;
  deletedAt: Date;
  icon: string;
  restoreCost: number;
}

const demoTrashItems: TrashItem[] = [
  { id: '1', type: 'base', name: '코코 베이스 영상 #1', petName: '코코', deletedAt: new Date(2026, 2, 1), icon: '🎬', restoreCost: 20 },
  { id: '2', type: 'motion', name: '코코 앉기 모션', petName: '코코', deletedAt: new Date(2026, 1, 25), icon: '🎭', restoreCost: 20 },
  { id: '3', type: 'motion', name: '나비 발들기 모션', petName: '나비', deletedAt: new Date(2026, 1, 18), icon: '🎭', restoreCost: 20 },
];

type Tab = 'all' | 'base' | 'motion';

export default function TrashPage() {
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [items, setItems] = useState(demoTrashItems);
  const [isLoading, setIsLoading] = useState(true);
  const [restoreModal, setRestoreModal] = useState<TrashItem | null>(null);
  const [deleteModal, setDeleteModal] = useState<TrashItem | null>(null);

  useEffect(() => {
    const fetchTrash = async () => {
      try {
        const { data } = await trashApi.list();
        if (data?.data && data.data.length > 0) {
          setItems(
            data.data.map((item: Record<string, unknown>) => ({
              id: item.id as string,
              type: (item.itemType as string) === 'BASE_VIDEO' ? 'base' : 'motion',
              name: (item.name as string) || '삭제된 항목',
              petName: (item.petName as string) || '',
              deletedAt: new Date(item.createdAt as string),
              icon: (item.itemType as string) === 'BASE_VIDEO' ? '🎬' : '🎭',
              restoreCost: (item.restoreCost as number) || 20,
            }))
          );
        }
      } catch {
        // 데모 데이터 유지
      } finally {
        setIsLoading(false);
      }
    };
    fetchTrash();
  }, []);

  const filteredItems = activeTab === 'all' ? items : items.filter((item) => item.type === activeTab);

  const getDDay = (deletedAt: Date) => {
    const now = new Date();
    const deleteDate = new Date(deletedAt.getTime() + 30 * 24 * 60 * 60 * 1000);
    const diff = Math.ceil((deleteDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  const getDDayColor = (dday: number) => {
    if (dday <= 5) return 'var(--accent-red)';
    if (dday <= 14) return 'var(--accent-orange)';
    return 'var(--accent-green)';
  };

  const getDDayLabel = (dday: number) => {
    if (dday <= 5) return '긴급';
    if (dday <= 14) return '주의';
    return '안전';
  };

  const handleRestore = async (item: TrashItem) => {
    try {
      await trashApi.restore(item.id);
    } catch {
      // API 실패해도 UI 업데이트
    }
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    setRestoreModal(null);
  };

  const handleDelete = async (item: TrashItem) => {
    try {
      await trashApi.permanentDelete(item.id);
    } catch {
      // API 실패해도 UI 업데이트
    }
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    setDeleteModal(null);
  };

  const tabs = [
    { key: 'all', label: '전체' },
    { key: 'base', label: '베이스 영상', count: items.filter((i) => i.type === 'base').length },
    { key: 'motion', label: '모션', count: items.filter((i) => i.type === 'motion').length },
  ];

  return (
    <MobileLayout title="휴지통">
      <div className="p-5 space-y-4 animate-fade-in">
        {/* 안내 */}
        <Alert variant="warning">
          삭제된 항목은 30일간 보관됩니다. 이후 자동으로 삭제됩니다.
        </Alert>

        {/* 탭 */}
        <TabToggle
          tabs={tabs}
          activeTab={activeTab}
          onChange={(key) => setActiveTab(key as Tab)}
        />

        {/* 아이템 목록 */}
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton height="80px" count={3} />
          </div>
        ) : filteredItems.length > 0 ? (
          <div className="space-y-2">
            {filteredItems.map((item) => {
              const dday = getDDay(item.deletedAt);
              const ddayColor = getDDayColor(dday);
              const ddayLabel = getDDayLabel(dday);
              return (
                <div
                  key={item.id}
                  className="rounded-[var(--radius-md)] overflow-hidden"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)' }}
                >
                  <div className="flex items-center gap-3 p-3">
                    <div
                      className="w-10 h-10 rounded-[var(--radius-sm)] flex items-center justify-center text-lg flex-shrink-0"
                      style={{ background: 'var(--accent-warm-bg)' }}
                    >
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                        {item.name}
                      </p>
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        {item.petName} · 복구 비용 {item.restoreCost}C
                      </p>
                    </div>
                    <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                      <Badge color={ddayColor}>D-{dday}</Badge>
                      <span className="text-[7px] font-bold" style={{ color: ddayColor }}>
                        {ddayLabel}
                      </span>
                    </div>
                  </div>

                  <div
                    className="flex border-t"
                    style={{ borderColor: 'var(--border-card)' }}
                  >
                    <button
                      onClick={() => setRestoreModal(item)}
                      className="flex-1 py-2.5 text-[11px] font-semibold flex items-center justify-center gap-1 transition-all active:bg-[rgba(107,142,94,0.1)]"
                      style={{ color: 'var(--accent-green)' }}
                    >
                      ♻️ 복구하기
                    </button>
                    <div className="w-px" style={{ background: 'var(--border-card)' }} />
                    <button
                      onClick={() => setDeleteModal(item)}
                      className="flex-1 py-2.5 text-[11px] font-semibold flex items-center justify-center gap-1 transition-all active:bg-[rgba(196,92,74,0.1)]"
                      style={{ color: 'var(--accent-red)' }}
                    >
                      🗑️ 영구 삭제
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState emoji="🗑️" description="휴지통이 비어 있습니다." />
        )}
      </div>

      {/* 복구 확인 모달 */}
      <Modal isOpen={!!restoreModal} onClose={() => setRestoreModal(null)} title="항목 복구">
        {restoreModal && (
          <>
            <div className="text-center mb-4">
              <span className="text-3xl">{restoreModal.icon}</span>
              <p className="text-sm font-semibold mt-2" style={{ color: 'var(--text-primary)' }}>
                {restoreModal.name}
              </p>
              <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                {restoreModal.petName}
              </p>
            </div>
            <Alert variant="success">
              <div className="flex items-center justify-between mb-1">
                <span>복구 비용</span>
                <span className="font-bold" style={{ color: 'var(--accent-orange)' }}>{restoreModal.restoreCost}C</span>
              </div>
              <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
                복구 시 크레딧이 차감되며, 원래 위치로 돌아갑니다
              </p>
            </Alert>
            <div className="flex gap-3 mt-4">
              <Button variant="secondary" fullWidth onClick={() => setRestoreModal(null)}>취소</Button>
              <Button fullWidth onClick={() => handleRestore(restoreModal)}>♻️ 복구하기</Button>
            </div>
          </>
        )}
      </Modal>

      {/* 영구 삭제 확인 모달 */}
      <Modal isOpen={!!deleteModal} onClose={() => setDeleteModal(null)} title="영구 삭제">
        {deleteModal && (
          <>
            <div className="text-center mb-4">
              <span className="text-3xl">⚠️</span>
              <p className="text-sm font-semibold mt-2" style={{ color: 'var(--text-primary)' }}>
                {deleteModal.name}
              </p>
              <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                {deleteModal.petName}
              </p>
            </div>
            <Alert variant="error">
              <p className="text-center font-bold">이 작업은 되돌릴 수 없습니다</p>
              <p className="text-[9px] text-center mt-1" style={{ color: 'var(--text-muted)' }}>
                영구 삭제 시 크레딧이 환불되지 않습니다
              </p>
            </Alert>
            <div className="flex gap-3 mt-4">
              <Button variant="secondary" fullWidth onClick={() => setDeleteModal(null)}>취소</Button>
              <Button variant="danger" fullWidth onClick={() => handleDelete(deleteModal)}>🗑️ 영구 삭제</Button>
            </div>
          </>
        )}
      </Modal>
    </MobileLayout>
  );
}
