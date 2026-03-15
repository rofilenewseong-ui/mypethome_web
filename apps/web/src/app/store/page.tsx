'use client';

import { useState } from 'react';
import MobileLayout from '@/components/layout/MobileLayout';
import { Card, Button, Modal, Badge } from '@/components/ui';
import { useToastStore } from '@/stores/useToastStore';
import { useCreditsSync } from '@/hooks/useCreditsSync';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  badge?: string;
  emoji: string;
  creditAmount?: number;

}

const demoProducts: Product[] = [
  {
    id: '1',
    name: '홀로그램 아크릴 세트',
    description: '아크릴 프리즘 + Silver 등급 + 120 크레딧',
    price: 69000,
    originalPrice: 99000,
    discount: 30,
    badge: 'BEST',
    emoji: '💎',
    creditAmount: 120,

  },
  {
    id: '2',
    name: '120 크레딧',
    description: '영상 3개분의 크레딧이 충전됩니다',
    price: 29000,
    emoji: '💰',
    badge: '충전',
    creditAmount: 120,
  },
  {
    id: '3',
    name: '40 크레딧',
    description: '영상 1개 또는 모션 1개를 만드실 수 있습니다',
    price: 12000,
    emoji: '🪙',
    creditAmount: 40,
  },
];

export default function StorePage() {
  const addToast = useToastStore((s) => s.addToast);
  useCreditsSync();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showRedirectModal, setShowRedirectModal] = useState(false);

  const openMall = () => {
    const mallId = process.env.NEXT_PUBLIC_CAFE24_MALL_ID;
    if (mallId) {
      setShowRedirectModal(true);
    } else {
      addToast('자사몰 준비 중입니다. 곧 오픈됩니다!', 'info');
    }
  };

  const confirmRedirect = () => {
    const mallId = process.env.NEXT_PUBLIC_CAFE24_MALL_ID;
    setShowRedirectModal(false);
    if (mallId) {
      window.open(`https://${mallId}.cafe24.com`, '_blank');
    }
  };

  return (
    <MobileLayout title="자사몰">
      <div className="p-5 space-y-5 animate-fade-in">
        {/* 헤더 */}
        <div
          className="rounded-[var(--radius-lg)] p-5 text-center"
          style={{ background: 'linear-gradient(135deg, #2DB400, #1A9400)' }}
        >
          <span className="text-3xl">💎</span>
          <h2 className="text-lg font-bold text-white mt-2">자사몰</h2>
          <p className="text-[11px] text-white/70 mt-1">
            아크릴 프리즘과 크레딧을 신청하실 수 있습니다.
          </p>
        </div>

        {/* 상품 목록 */}
        <section>
          <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
            서비스 안내
          </h3>
          <div className="space-y-3">
            {demoProducts.map((product) => (
              <Card key={product.id} onClick={() => setSelectedProduct(product)}>
                <div className="flex items-center gap-4">
                  <div
                    className="w-[60px] h-[60px] rounded-[var(--radius-sm)] flex items-center justify-center text-3xl flex-shrink-0"
                    style={{ background: 'var(--accent-warm-bg)' }}
                  >
                    {product.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {product.badge && (
                        <Badge
                          variant="count"
                          pill={false}
                          color={product.badge === 'BEST' ? undefined : 'var(--accent-orange)'}
                        >
                          {product.badge}
                        </Badge>
                      )}
                      <span className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                        {product.name}
                      </span>
                    </div>
                    <p className="text-[10px] mb-1.5 line-clamp-2" style={{ color: 'var(--text-muted)' }}>
                      {product.description}
                    </p>
                    <div className="flex items-center gap-2">
                      {product.discount && (
                        <span className="text-[11px] font-bold" style={{ color: 'var(--accent-red)' }}>
                          {product.discount}%
                        </span>
                      )}
                      <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                        {product.price.toLocaleString()}원
                      </span>
                      {product.originalPrice && (
                        <span className="text-[10px] line-through" style={{ color: 'var(--text-muted)' }}>
                          {product.originalPrice.toLocaleString()}원
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* 자동 인증 안내 */}
        <Card hover={false}>
          <div className="text-center">
            <span className="text-2xl">✨</span>
            <p className="text-xs font-semibold mt-2" style={{ color: 'var(--text-primary)' }}>
              자동 인증 안내
            </p>
            <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
              자사몰에서 신청하시면 자동으로 인증되며
              <br />
              크레딧이 충전됩니다. 별도의 코드 입력은 필요 없습니다.
            </p>
          </div>
        </Card>

        <Button fullWidth size="lg" onClick={openMall}>
          자사몰에서 신청하기
        </Button>
      </div>

      {/* 상품 상세 모달 */}
      <Modal isOpen={!!selectedProduct} onClose={() => setSelectedProduct(null)} title="안내">
        {selectedProduct && (
          <>
            <div className="text-center mb-4">
              <div
                className="w-20 h-20 rounded-[var(--radius-lg)] flex items-center justify-center text-4xl mx-auto mb-3"
                style={{ background: 'var(--accent-warm-bg)' }}
              >
                {selectedProduct.emoji}
              </div>
              <h4 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                {selectedProduct.name}
              </h4>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                {selectedProduct.description}
              </p>
            </div>

            <div
              className="rounded-[var(--radius-sm)] p-3 mb-4 text-center"
              style={{ background: 'rgba(107, 142, 94, 0.06)', border: '1px solid rgba(107, 142, 94, 0.15)' }}
            >
              <div className="flex items-center justify-center gap-2">
                {selectedProduct.discount && (
                  <span className="text-sm font-bold" style={{ color: 'var(--accent-red)' }}>
                    {selectedProduct.discount}%
                  </span>
                )}
                <span className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  {selectedProduct.price.toLocaleString()}원
                </span>
              </div>
              {selectedProduct.creditAmount && (
                <p className="text-[11px] mt-1" style={{ color: 'var(--accent-green)' }}>
                  +{selectedProduct.creditAmount} 크레딧 충전
                </p>
              )}


            </div>

            <div className="flex gap-3">
              <Button variant="secondary" fullWidth onClick={() => setSelectedProduct(null)}>
                닫기
              </Button>
              <Button fullWidth onClick={() => { setSelectedProduct(null); openMall(); }}>
                신청하기
              </Button>
            </div>
          </>
        )}
      </Modal>
      {/* 외부 결제 이동 안내 모달 */}
      <Modal isOpen={showRedirectModal} onClose={() => setShowRedirectModal(false)} title="외부 결제 안내">
        <div className="text-center py-2">
          <span className="text-4xl">🛒</span>
          <p className="text-sm font-bold mt-3" style={{ color: 'var(--text-primary)' }}>
            외부 결제 페이지로 이동합니다
          </p>
          <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            결제 완료 후 이 앱으로 돌아오시면
            <br />
            크레딧이 자동으로 충전됩니다.
          </p>
        </div>
        <div className="flex gap-3 mt-4">
          <Button variant="secondary" fullWidth onClick={() => setShowRedirectModal(false)}>
            취소
          </Button>
          <Button fullWidth onClick={confirmRedirect}>
            이동하기
          </Button>
        </div>
      </Modal>
    </MobileLayout>
  );
}
