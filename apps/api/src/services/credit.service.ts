import { db } from '../config/firebase';
import admin from 'firebase-admin';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { CREDIT_COSTS, PRODUCT_CREDITS, type ProductType } from '../types/schema.types';

export { CREDIT_COSTS, PRODUCT_CREDITS };

export class CreditService {
  async getBalance(userId: string): Promise<number> {
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) throw new AppError('사용자를 찾을 수 없습니다.', 404);
    return userDoc.data()!.credits || 0;
  }

  async getHistory(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const totalSnap = await db.collection('creditTransactions')
      .where('userId', '==', userId)
      .count()
      .get();
    const total = totalSnap.data().count;

    const transactionsSnap = await db.collection('creditTransactions')
      .where('userId', '==', userId)
      .get();

    const allTransactions = transactionsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
    }));
    // JS 정렬 + 페이지네이션 (composite index 없이 동작)
    allTransactions.sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
      const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
      return dateB - dateA;
    });
    const transactions = allTransactions.slice(skip, skip + limit);

    return {
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async spend(
    userId: string,
    amount: number,
    description: string,
    entityType?: string,
    entityId?: string
  ): Promise<number> {
    return await db.runTransaction(async (t) => {
      const userRef = db.collection('users').doc(userId);
      const userDoc = await t.get(userRef);

      if (!userDoc.exists) throw new AppError('사용자를 찾을 수 없습니다.', 404);
      const credits = userDoc.data()!.credits || 0;
      if (credits < amount) {
        throw new AppError(
          `크레딧이 부족합니다. (현재: ${credits}C, 필요: ${amount}C)`,
          400
        );
      }

      const newCredits = credits - amount;
      t.update(userRef, {
        credits: newCredits,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const txRef = db.collection('creditTransactions').doc();
      t.set(txRef, {
        userId,
        type: 'SPEND',
        amount: -amount,
        description,
        relatedEntityType: entityType || null,
        relatedEntityId: entityId || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      logger.info(`Credit spent: user=${userId}, amount=-${amount}, desc=${description}`);
      return newCredits;
    });
  }

  async earn(
    userId: string,
    amount: number,
    description: string,
    entityType?: string,
    entityId?: string
  ): Promise<number> {
    return await db.runTransaction(async (t) => {
      const userRef = db.collection('users').doc(userId);
      const userDoc = await t.get(userRef);

      if (!userDoc.exists) throw new AppError('사용자를 찾을 수 없습니다.', 404);
      const newCredits = (userDoc.data()!.credits || 0) + amount;

      t.update(userRef, {
        credits: newCredits,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const txRef = db.collection('creditTransactions').doc();
      t.set(txRef, {
        userId,
        type: 'EARN',
        amount,
        description,
        relatedEntityType: entityType || null,
        relatedEntityId: entityId || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      logger.info(`Credit earned: user=${userId}, amount=+${amount}, desc=${description}`);
      return newCredits;
    });
  }

  async refund(
    userId: string,
    amount: number,
    description: string,
    entityType?: string,
    entityId?: string
  ): Promise<number> {
    return await db.runTransaction(async (t) => {
      const userRef = db.collection('users').doc(userId);
      const userDoc = await t.get(userRef);

      if (!userDoc.exists) throw new AppError('사용자를 찾을 수 없습니다.', 404);
      const newCredits = (userDoc.data()!.credits || 0) + amount;

      t.update(userRef, {
        credits: newCredits,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const txRef = db.collection('creditTransactions').doc();
      t.set(txRef, {
        userId,
        type: 'REFUND',
        amount,
        description,
        relatedEntityType: entityType || null,
        relatedEntityId: entityId || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      logger.info(`Credit refund: user=${userId}, amount=+${amount}, desc=${description}`);
      return newCredits;
    });
  }

  async redeemCode(userId: string, codeStr: string) {
    return await db.runTransaction(async (t) => {
      // Find the product code
      const codeSnap = await t.get(
        db.collection('productCodes').where('code', '==', codeStr).limit(1)
      );
      if (codeSnap.empty) throw new AppError('유효하지 않은 코드입니다.', 404);

      const codeDoc = codeSnap.docs[0];
      const codeData = codeDoc.data();
      if (codeData.isUsed) throw new AppError('이미 사용된 코드입니다.', 400);

      // Mark code as used
      t.update(codeDoc.ref, {
        isUsed: true,
        usedByUserId: userId,
        usedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const creditAmount = PRODUCT_CREDITS[codeData.productType as ProductType] || 0;

      // Update user
      const userRef = db.collection('users').doc(userId);
      const userDoc = await t.get(userRef);
      if (!userDoc.exists) throw new AppError('사용자를 찾을 수 없습니다.', 404);

      const userData = userDoc.data()!;
      const newCredits = (userData.credits || 0) + creditAmount;
      const updates: Record<string, unknown> = {
        credits: newCredits,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (codeData.productType === 'FULL_SET') {
        updates.isVerified = true;
      }

      t.update(userRef, updates);

      // Create credit transaction
      const txRef = db.collection('creditTransactions').doc();
      t.set(txRef, {
        userId,
        type: 'EARN',
        amount: creditAmount,
        description: `상품 코드 등록 (${codeData.productType})`,
        relatedEntityType: 'PRODUCT_CODE',
        relatedEntityId: codeDoc.id,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        credits: newCredits,
        isVerified: codeData.productType === 'FULL_SET' ? true : userData.isVerified,
        productType: codeData.productType,
        creditAmount,
      };
    });
  }
}

export const creditService = new CreditService();
