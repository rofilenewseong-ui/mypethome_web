import crypto from 'crypto';
import { db } from '../config/firebase';
import admin from 'firebase-admin';
import { env } from '../config/env';
import { generateProductCode } from '../utils/codeGenerator';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

export class WebhookService {
  verifySignature(payload: string, signature: string): boolean {
    if (!env.CAFE24_WEBHOOK_SECRET) {
      if (env.isProd) throw new AppError('CAFE24_WEBHOOK_SECRET이 설정되지 않았습니다.', 500);
      logger.warn('Webhook 시크릿 미설정 — 개발 모드에서 서명 검증 스킵');
      return true;
    }
    if (!signature) return false;
    const expected = crypto
      .createHmac('sha256', env.CAFE24_WEBHOOK_SECRET)
      .update(payload)
      .digest('hex');
    if (signature.length !== expected.length) return false;
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  }

  async handleCafe24Order(orderData: {
    orderId: string;
    productId: string;
    productName: string;
    buyerEmail?: string;
  }) {
    // 중복 웹훅 방지: 같은 orderId + productId로 이미 코드가 발급됐는지 확인
    const existingSnap = await db.collection('productCodes')
      .where('cafe24OrderId', '==', orderData.orderId)
      .where('cafe24ProductId', '==', orderData.productId)
      .limit(1)
      .get();

    if (!existingSnap.empty) {
      const existing = existingSnap.docs[0].data();
      logger.info(`Duplicate webhook ignored: order ${orderData.orderId}, existing code ${existing.code}`);
      return { code: existing.code, productType: existing.productType, duplicate: true };
    }

    let productType: 'FULL_SET' | 'CREDIT_120' | 'CREDIT_40';

    // 1) 상품 ID 매핑 우선
    const idMapping = env.CAFE24_PRODUCT_MAP[orderData.productId];
    if (idMapping && ['FULL_SET', 'CREDIT_120', 'CREDIT_40'].includes(idMapping)) {
      productType = idMapping as typeof productType;
    } else {
      // 2) 이름 기반 fallback
      const name = orderData.productName.toLowerCase();
      if (name.includes('풀 세트') || name.includes('full')) {
        productType = 'FULL_SET';
      } else if (name.includes('120')) {
        productType = 'CREDIT_120';
      } else if (name.includes('40')) {
        productType = 'CREDIT_40';
      } else {
        throw new AppError('알 수 없는 상품입니다.', 400);
      }
    }

    const code = generateProductCode();

    const codeRef = db.collection('productCodes').doc();
    await codeRef.set({
      code,
      productType,
      isUsed: false,
      usedByUserId: null,
      usedAt: null,
      cafe24OrderId: orderData.orderId,
      cafe24ProductId: orderData.productId,
      cafe24BuyerEmail: orderData.buyerEmail || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.info(`Product code generated: ${code} for order ${orderData.orderId} (${productType})`);

    return { code, productType };
  }
}

export const webhookService = new WebhookService();
