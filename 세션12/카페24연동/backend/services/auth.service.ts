import bcrypt from 'bcryptjs';
import { db } from '../config/firebase';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, TokenPayload } from '../utils/jwt';
import { AppError } from '../middleware/errorHandler';
import { GoogleProfile, Cafe24Profile } from '../types';
import admin from 'firebase-admin';

const BCRYPT_ROUNDS = 12;

export class AuthService {
  async register(email: string, password: string, name: string) {
    // Check if email already exists
    const existingSnap = await db.collection('users').where('email', '==', email).limit(1).get();
    if (!existingSnap.empty) {
      throw new AppError('이미 등록된 이메일입니다.', 409);
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const userRef = db.collection('users').doc();
    const userData = {
      email,
      passwordHash,
      name,
      role: 'USER',
      credits: 0,
      isVerified: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await userRef.set(userData);

    const user = { id: userRef.id, email, role: 'USER' };
    return this.generateTokens(user);
  }

  async login(email: string, password: string) {
    const snapshot = await db.collection('users').where('email', '==', email).limit(1).get();
    if (snapshot.empty) {
      throw new AppError('이메일 또는 비밀번호가 올바르지 않습니다.', 401);
    }

    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();
    if (!userData.passwordHash) {
      throw new AppError('이메일 또는 비밀번호가 올바르지 않습니다.', 401);
    }

    const isValid = await bcrypt.compare(password, userData.passwordHash);
    if (!isValid) {
      throw new AppError('이메일 또는 비밀번호가 올바르지 않습니다.', 401);
    }

    // 마지막 로그인 시각 업데이트
    await userDoc.ref.update({ lastLoginAt: admin.firestore.FieldValue.serverTimestamp() });

    const user = { id: userDoc.id, email: userData.email, role: userData.role };
    return this.generateTokens(user);
  }

  async googleAuth(profile: GoogleProfile) {
    // Find by googleId
    let userSnap = await db.collection('users').where('googleId', '==', profile.id).limit(1).get();

    if (!userSnap.empty) {
      const userDoc = userSnap.docs[0];
      const userData = userDoc.data();
      await userDoc.ref.update({ lastLoginAt: admin.firestore.FieldValue.serverTimestamp() });
      return this.generateTokens({ id: userDoc.id, email: userData.email, role: userData.role });
    }

    // Find by email
    userSnap = await db.collection('users').where('email', '==', profile.email).limit(1).get();
    if (!userSnap.empty) {
      const userDoc = userSnap.docs[0];
      await userDoc.ref.update({ googleId: profile.id, lastLoginAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp() });
      const userData = userDoc.data();
      return this.generateTokens({ id: userDoc.id, email: userData.email, role: userData.role });
    }

    // Create new user
    const userRef = db.collection('users').doc();
    const userData = {
      email: profile.email,
      name: profile.name,
      googleId: profile.id,
      role: 'USER',
      credits: 0,
      isVerified: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await userRef.set(userData);

    return this.generateTokens({ id: userRef.id, email: profile.email, role: 'USER' });
  }

  async cafe24Auth(profile: Cafe24Profile) {
    // 1) cafe24MemberId로 검색
    let userSnap = await db.collection('users').where('cafe24MemberId', '==', profile.cafe24MemberId).limit(1).get();

    if (!userSnap.empty) {
      const userDoc = userSnap.docs[0];
      const userData = userDoc.data();

      // 아크릴 세트 구매 → 크레딧 지급 (이미 지급받았으면 스킵)
      if (profile.hasAcrylicSet && !userData.isVerified) {
        await this.grantAcrylicSetReward(userDoc.ref, userDoc.id);
      }

      await userDoc.ref.update({ lastLoginAt: admin.firestore.FieldValue.serverTimestamp() });
      return this.generateTokens({ id: userDoc.id, email: userData.email, role: userData.role });
    }

    // 2) 이메일로 기존 사용자 검색
    if (profile.email) {
      userSnap = await db.collection('users').where('email', '==', profile.email).limit(1).get();
      if (!userSnap.empty) {
        const userDoc = userSnap.docs[0];
        const userData = userDoc.data();

        const updateData: Record<string, unknown> = {
          cafe24MemberId: profile.cafe24MemberId,
          lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        if (profile.phone) updateData.phone = profile.phone;

        // 아크릴 세트 구매 → 크레딧 지급
        if (profile.hasAcrylicSet && !userData.isVerified) {
          await this.grantAcrylicSetReward(userDoc.ref, userDoc.id);
          updateData.isVerified = true;
        }

        await userDoc.ref.update(updateData);
        return this.generateTokens({ id: userDoc.id, email: userData.email, role: userData.role });
      }
    }

    // 3) 새 사용자 생성
    const credits = profile.hasAcrylicSet ? 120 : 0;

    const userRef = db.collection('users').doc();
    const userData = {
      email: profile.email || '',
      name: profile.name || '',
      phone: profile.phone || '',
      cafe24MemberId: profile.cafe24MemberId,
      role: 'USER',
      credits,
      isVerified: profile.hasAcrylicSet ? true : false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await userRef.set(userData);

    // 크레딧 트랜잭션 기록 (아크릴 세트 구매인 경우)
    if (profile.hasAcrylicSet) {
      await db.collection('creditTransactions').add({
        userId: userRef.id,
        amount: 120,
        type: 'CAFE24_ACRYLIC_SET',
        description: '카페24 아크릴 세트 구매 보상',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    return this.generateTokens({ id: userRef.id, email: profile.email || '', role: 'USER' });
  }

  /** 아크릴 세트 구매 보상: 크레딧 120 지급 (트랜잭션으로 중복 방지) */
  private async grantAcrylicSetReward(userRef: admin.firestore.DocumentReference, userId: string) {
    await db.runTransaction(async (txn) => {
      const doc = await txn.get(userRef);
      if (doc.data()?.isVerified) return; // 이미 지급됨 → 스킵

      txn.update(userRef, {
        credits: admin.firestore.FieldValue.increment(120),
        isVerified: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const txnRef = db.collection('creditTransactions').doc();
      txn.set(txnRef, {
        userId,
        amount: 120,
        type: 'CAFE24_ACRYLIC_SET',
        description: '카페24 아크릴 세트 구매 보상',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
  }

  /**
   * 개발 모드 전용 로그인 — Firestore에 테스트 유저를 생성/재사용하고 JWT 반환
   * NODE_ENV=development 에서만 작동
   */
  async devLogin() {
    const DEV_EMAIL = 'dev@petholo.test';
    const DEV_NAME = '개발 테스터';
    const DEV_CREDITS = 1000;

    // 이미 존재하는 dev user 찾기
    const existingSnap = await db.collection('users').where('email', '==', DEV_EMAIL).limit(1).get();

    if (!existingSnap.empty) {
      const userDoc = existingSnap.docs[0];
      // 크레딧 보충 (1000 미만이면 1000으로 리셋)
      const currentCredits = userDoc.data().credits || 0;
      if (currentCredits < DEV_CREDITS) {
        await userDoc.ref.update({
          credits: DEV_CREDITS,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
      await userDoc.ref.update({ lastLoginAt: admin.firestore.FieldValue.serverTimestamp() });
      const user = { id: userDoc.id, email: DEV_EMAIL, role: 'USER' };
      const tokens = this.generateTokens(user);
      return {
        ...tokens,
        user: {
          ...tokens.user,
          name: userDoc.data().name || DEV_NAME,
          credits: Math.max(currentCredits, DEV_CREDITS),
          isVerified: true,
        },
      };
    }

    // 새 dev user 생성
    const userRef = db.collection('users').doc();
    const userData = {
      email: DEV_EMAIL,
      name: DEV_NAME,
      role: 'USER',
      credits: DEV_CREDITS,
      isVerified: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await userRef.set(userData);

    const user = { id: userRef.id, email: DEV_EMAIL, role: 'USER' };
    const tokens = this.generateTokens(user);
    return {
      ...tokens,
      user: {
        ...tokens.user,
        name: DEV_NAME,
        credits: DEV_CREDITS,
        isVerified: true,
      },
    };
  }

  async refreshTokens(refreshToken: string) {
    const payload = verifyRefreshToken(refreshToken);
    const userDoc = await db.collection('users').doc(payload.userId).get();
    if (!userDoc.exists) throw new AppError('사용자를 찾을 수 없습니다.', 401);

    const data = userDoc.data()!;
    return this.generateTokens({
      id: userDoc.id,
      email: data.email,
      role: data.role,
    });
  }

  async getMe(userId: string) {
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) throw new AppError('사용자를 찾을 수 없습니다.', 404);

    const data = userDoc.data()!;
    return {
      id: userDoc.id,
      email: data.email,
      name: data.name,
      role: data.role,
      credits: data.credits,
      isVerified: data.isVerified,
      createdAt: data.createdAt?.toDate?.() || data.createdAt,
    };
  }

  private generateTokens(user: { id: string; email: string; role: string }) {
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    return {
      accessToken: generateAccessToken(payload),
      refreshToken: generateRefreshToken(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }
}

export const authService = new AuthService();
