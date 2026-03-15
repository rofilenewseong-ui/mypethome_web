'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { petsApi } from '@/lib/api';
import MobileLayout from '@/components/layout/MobileLayout';
import { Button, Card, Skeleton, EmptyState, Avatar, Badge } from '@/components/ui';

interface Pet {
  id: string;
  name: string;
  breed: string;
  frontPhotoUrl?: string;
  profileCount: number;
  createdAt?: string;
}

const demoPets: Pet[] = [
  { id: '1', name: '코코', breed: '포메라니안', profileCount: 2 },
  { id: '2', name: '나비', breed: '페르시안', profileCount: 1 },
];

export default function PetManagePage() {
  const router = useRouter();
  const [pets, setPets] = useState<Pet[]>(demoPets);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPets = async () => {
      try {
        const { data } = await petsApi.list();
        if (data?.data && data.data.length > 0) {
          setPets(
            data.data.map((p: Record<string, unknown>) => ({
              id: p.id as string,
              name: p.name as string,
              breed: (p.breed as string) || '',
              frontPhotoUrl: (p.frontPhoto as string) || '',
              profileCount: (p.profileCount as number) || 0,
              createdAt: p.createdAt as string,
            }))
          );
        }
      } catch {
        // 데모 데이터 유지
      } finally {
        setIsLoading(false);
      }
    };
    fetchPets();
  }, []);

  return (
    <MobileLayout title="펫 관리">
      <div className="p-5 space-y-5 animate-fade-in">
        <Button fullWidth onClick={() => router.push('/pets/register')}>
          + 새로운 아이 등록하기
        </Button>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton height="96px" count={2} />
          </div>
        ) : pets.length > 0 ? (
          <div className="space-y-3">
            {pets.map((pet) => (
              <Card key={pet.id} onClick={() => router.push(`/pets/${pet.id}`)}>
                <div className="flex items-center gap-4">
                  <Avatar
                    src={pet.frontPhotoUrl || undefined}
                    fallback="🐾"
                    size="xl"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                      {pet.name}
                    </h4>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      {pet.breed}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge>프로필 {pet.profileCount}</Badge>
                    </div>
                  </div>
                  <span className="text-lg" style={{ color: 'var(--text-muted)' }}>&rsaquo;</span>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card hover={false}>
            <EmptyState
              emoji="🐾"
              description={'아직 등록된 아이가 없습니다.\n그리운 아이를 등록해 보세요.'}
              className="py-8"
            />
          </Card>
        )}
      </div>
    </MobileLayout>
  );
}
