'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { petsApi } from '@/lib/api';
import MobileLayout from '@/components/layout/MobileLayout';
import { Card, Button, Skeleton, EmptyState, Avatar, Badge } from '@/components/ui';

interface Pet {
  id: string;
  name: string;
  breed: string;
  frontPhotoUrl: string;
  profileCount: number;
}

export default function NewProfileSelectPetPage() {
  const router = useRouter();
  const [pets, setPets] = useState<Pet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);

  useEffect(() => {
    const fetchPets = async () => {
      try {
        const { data } = await petsApi.list();
        const petsData = data?.data || data;

        if (Array.isArray(petsData) && petsData.length > 0) {
          setPets(
            petsData.map((p: Record<string, unknown>) => ({
              id: p.id as string,
              name: (p.name as string) || '이름 없음',
              breed: (p.breed as string) || '',
              frontPhotoUrl: (p.frontPhoto as string) || '',
              profileCount: (p.profileCount as number) || 0,
            }))
          );
        }
      } catch {
        // API 실패 시 빈 배열 유지
      } finally {
        setIsLoading(false);
      }
    };
    fetchPets();
  }, []);

  const handleNext = () => {
    if (!selectedPetId) return;
    router.push(`/pets/${selectedPetId}/profiles/new`);
  };

  return (
    <MobileLayout title="새 프로필 만들기" showBack>
      <div className="p-5 space-y-5 animate-fade-in">
        {/* 안내 */}
        <div className="text-center">
          <div className="text-4xl mb-3">🐾</div>
          <h2
            className="text-base font-bold mb-1"
            style={{ color: 'var(--text-primary)' }}
          >
            어떤 아이의 프로필을 만들까요?
          </h2>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            등록된 펫을 선택하면 베이스 영상과 모션을 생성할 수 있습니다
          </p>
        </div>

        {/* 펫 목록 */}
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton height="80px" count={2} />
          </div>
        ) : pets.length > 0 ? (
          <div className="space-y-3">
            {pets.map((pet) => (
              <button
                key={pet.id}
                onClick={() => setSelectedPetId(pet.id)}
                className="w-full rounded-[var(--radius-lg)] p-4 text-left transition-all active:scale-[0.98]"
                style={{
                  background:
                    selectedPetId === pet.id
                      ? 'rgba(107, 142, 94, 0.08)'
                      : 'var(--bg-card)',
                  border:
                    selectedPetId === pet.id
                      ? '2px solid var(--accent-green)'
                      : '1px solid var(--border-card)',
                  boxShadow:
                    selectedPetId === pet.id
                      ? '0 2px 8px rgba(107, 142, 94, 0.15)'
                      : 'var(--shadow-card)',
                }}
              >
                <div className="flex items-center gap-4">
                  <Avatar
                    src={pet.frontPhotoUrl || undefined}
                    fallback="🐾"
                    size="lg"
                  />
                  <div className="flex-1 min-w-0">
                    <h4
                      className="text-sm font-bold"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {pet.name}
                    </h4>
                    <p
                      className="text-[11px]"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {pet.breed}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge>프로필 {pet.profileCount}개</Badge>
                    </div>
                  </div>
                  {selectedPetId === pet.id && (
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0"
                      style={{
                        background: 'var(--accent-green)',
                        color: '#fff',
                      }}
                    >
                      ✓
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <Card hover={false}>
            <EmptyState
              emoji="🐾"
              title="등록된 펫이 없습니다"
              description={
                '프로필을 만들려면 먼저 펫을 등록해 주세요.\n사진과 기본 정보를 입력하면 됩니다.'
              }
              action={{
                label: '펫 등록하기',
                onClick: () => router.push('/pets/register'),
              }}
              className="py-8"
            />
          </Card>
        )}

        {/* 하단 버튼 */}
        {pets.length > 0 && (
          <div className="space-y-3">
            <Button
              fullWidth
              size="lg"
              disabled={!selectedPetId}
              onClick={handleNext}
            >
              {selectedPetId
                ? `${pets.find((p) => p.id === selectedPetId)?.name}의 프로필 만들기`
                : '펫을 선택해 주세요'}
            </Button>

            <Card hover={false}>
              <div className="flex items-start gap-2">
                <span className="text-sm flex-shrink-0">💡</span>
                <p
                  className="text-[10px]"
                  style={{ color: 'var(--text-muted)' }}
                >
                  의상 사진 → 자세 선택 → AI 이미지 생성 → 영상 생성
                  순서로 진행됩니다.
                  <br />
                  프로필 생성 시 40C (베이스 영상 1개)가 소모됩니다. 모션은 설정에서 추가 가능합니다.
                </p>
              </div>
            </Card>
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
