import { db } from '../config/firebase';
import admin from 'firebase-admin';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { sanitizeText } from '../utils/sanitize';

// Emoji response pool (pet AI emoji combinations)
const EMOJI_RESPONSES: Record<string, string[]> = {
  greeting: ['🐾💕', '🐕✨', '🐾🌟💛', '🐶💗'],
  walk: ['🐾🌿💚', '🌳🐕🌤️', '🐾🏃‍♂️💨', '🌸🐾🦋'],
  food: ['🦴😋', '🍖🐾💛', '🦴✨😊', '🐾🍗💕'],
  sleep: ['🐕💤🌙', '😴🐾💫', '🌙✨🐕', '💤🐾🌟'],
  play: ['🎾🐕💨', '🐾🎉✨', '⚽🐾😊', '🐕🎾💕'],
  love: ['🐾💗💗', '❤️🐕❤️', '🐾💕🌈', '💛🐾✨'],
  sad: ['🐾😢💙', '🐕💧🌧️', '🐾🥺💕'],
  weather: ['☀️🐾🌤️', '🌧️🐕🏠', '❄️🐾🧣'],
  default: ['🐾✨', '🐕💛', '🐾💕✨', '🐶🌟', '🐾💙'],
};

function analyzeMessage(content: string): string {
  const keywords: Record<string, string[]> = {
    greeting: ['안녕', '하이', '반가', '오랜만', '보고싶'],
    walk: ['산책', '걷', '공원', '밖', '나가'],
    food: ['밥', '간식', '먹', '배고', '맛있', '사료', '치킨'],
    sleep: ['자', '잠', '졸', '밤', '굿나잇', '잘자'],
    play: ['놀', '공', '장난', '같이', '재미'],
    love: ['사랑', '좋아', '이쁘', '예쁘', '귀여', '최고', '감사'],
    sad: ['슬프', '아프', '힘들', '울', '그립', '보고싶'],
    weather: ['날씨', '비', '눈', '더워', '추워', '바람'],
  };

  for (const [category, words] of Object.entries(keywords)) {
    if (words.some((word) => content.includes(word))) {
      return category;
    }
  }
  return 'default';
}

function getRandomEmoji(category: string): string {
  const pool = EMOJI_RESPONSES[category] || EMOJI_RESPONSES.default;
  return pool[Math.floor(Math.random() * pool.length)];
}

function getRandomDelay(): number {
  // 5~30 minute random delay (ms)
  return (Math.floor(Math.random() * 25) + 5) * 60 * 1000;
}

export class MessengerService {
  async getRooms(userId: string) {
    // 1) chatRooms orderBy 조회 — 비정규화 필드 활용으로 추가 쿼리 불필요
    const roomsSnap = await db.collection('chatRooms')
      .where('userId', '==', userId)
      .orderBy('lastMessageAt', 'desc')
      .get();

    return roomsSnap.docs.map(doc => {
      const data = doc.data();

      // 비정규화된 pet 정보 사용 (추가 쿼리 0)
      const pet = {
        id: data.petId,
        name: data.petName || null,
        emoji: data.petEmoji || null,
        frontPhoto: data.petFrontPhoto || null,
      };

      // 비정규화된 마지막 메시지 사용 (추가 쿼리 0)
      const messages = data.lastMessageContent != null ? [{
        content: data.lastMessageContent,
        senderType: data.lastMessageSenderType,
        createdAt: data.lastMessageAt?.toDate?.() || data.lastMessageAt,
      }] : [];

      return {
        id: doc.id,
        userId: data.userId,
        petId: data.petId,
        lastMessageAt: data.lastMessageAt?.toDate?.() || data.lastMessageAt,
        pet,
        messages,
      };
    });
  }

  async getMessages(userId: string, petId: string, page = 1, limit = 50) {
    const roomSnap = await db.collection('chatRooms')
      .where('userId', '==', userId)
      .where('petId', '==', petId)
      .limit(1)
      .get();
    if (roomSnap.empty) throw new AppError('채팅방을 찾을 수 없습니다.', 404);

    const roomId = roomSnap.docs[0].id;
    const now = new Date();
    const skip = (page - 1) * limit;

    // 서버사이드 페이지네이션: orderBy + offset + limit
    const [messagesSnap, countSnap] = await Promise.all([
      db.collection('chatMessages')
        .where('chatRoomId', '==', roomId)
        .orderBy('createdAt', 'desc')
        .offset(skip)
        .limit(limit + 20)
        .get(),
      db.collection('chatMessages')
        .where('chatRoomId', '==', roomId)
        .count()
        .get(),
    ]);

    const total = countSnap.data().count;

    // Filter: show USER messages and PET_AI messages with scheduledAt <= now
    const allMessages = messagesSnap.docs
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          chatRoomId: data.chatRoomId,
          senderType: data.senderType as string,
          content: data.content,
          isRead: data.isRead as boolean,
          scheduledAt: data.scheduledAt?.toDate?.() || data.scheduledAt,
          createdAt: data.createdAt?.toDate?.() || data.createdAt,
        };
      })
      .filter(msg => {
        if (msg.senderType === 'USER') return true;
        if (msg.senderType === 'PET_AI' && msg.scheduledAt && new Date(msg.scheduledAt) <= now) return true;
        return false;
      })
      .slice(0, limit);

    // Mark unread AI messages as read
    const batch = db.batch();
    let batchCount = 0;
    for (const msg of allMessages) {
      if (msg.senderType === 'PET_AI' && !msg.isRead) {
        batch.update(db.collection('chatMessages').doc(msg.id), { isRead: true });
        batchCount++;
      }
    }
    if (batchCount > 0) await batch.commit();

    return {
      messages: allMessages.reverse(),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async sendMessage(userId: string, petId: string, content: string) {
    const roomSnap = await db.collection('chatRooms')
      .where('userId', '==', userId)
      .where('petId', '==', petId)
      .limit(1)
      .get();
    if (roomSnap.empty) throw new AppError('채팅방을 찾을 수 없습니다.', 404);

    const roomDoc = roomSnap.docs[0];
    const roomId = roomDoc.id;
    const sanitizedContent = sanitizeText(content);

    // Save user message
    const userMsgRef = db.collection('chatMessages').doc();
    const userMsgData = {
      chatRoomId: roomId,
      senderType: 'USER',
      content: sanitizedContent,
      isRead: true,
      scheduledAt: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await userMsgRef.set(userMsgData);

    // Schedule AI response
    const category = analyzeMessage(sanitizedContent);
    const emojiResponse = getRandomEmoji(category);
    const delay = getRandomDelay();
    const scheduledAt = new Date(Date.now() + delay);

    const aiMsgRef = db.collection('chatMessages').doc();
    const aiMsgData = {
      chatRoomId: roomId,
      senderType: 'PET_AI',
      content: emojiResponse,
      isRead: false,
      scheduledAt: admin.firestore.Timestamp.fromDate(scheduledAt),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await aiMsgRef.set(aiMsgData);

    // Update room: lastMessageAt + 비정규화 필드
    await roomDoc.ref.update({
      lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
      lastMessageContent: sanitizedContent,
      lastMessageSenderType: 'USER',
    });

    logger.info(`AI response scheduled for pet ${petId}: ${emojiResponse} at ${scheduledAt.toISOString()}`);

    return {
      userMessage: { id: userMsgRef.id, ...userMsgData },
      aiScheduled: {
        id: aiMsgRef.id,
        scheduledAt,
        delayMinutes: Math.round(delay / 60000),
      },
    };
  }
}

export const messengerService = new MessengerService();
