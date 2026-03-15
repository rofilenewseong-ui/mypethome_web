import { db } from '../config/firebase';
import admin from 'firebase-admin';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

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
    const roomsSnap = await db.collection('chatRooms')
      .where('userId', '==', userId)
      .get();

    const rooms = await Promise.all(
      roomsSnap.docs.map(async (doc) => {
        const data = doc.data();

        // Fetch pet info
        const petDoc = await db.collection('pets').doc(data.petId).get();
        const pet = petDoc.exists ? {
          id: petDoc.id,
          name: petDoc.data()!.name,
          emoji: petDoc.data()!.emoji,
          frontPhoto: petDoc.data()!.frontPhoto,
        } : null;

        // Fetch last message (get all, sort in JS, take 1)
        const lastMsgSnap = await db.collection('chatMessages')
          .where('chatRoomId', '==', doc.id)
          .get();
        const allMsgs = lastMsgSnap.docs.map(m => {
          const md = m.data();
          return {
            content: md.content,
            senderType: md.senderType,
            createdAt: md.createdAt?.toDate?.() || md.createdAt,
          };
        });
        allMsgs.sort((a, b) => {
          const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
          const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
          return dateB - dateA;
        });
        const messages = allMsgs.slice(0, 1);

        return {
          id: doc.id,
          userId: data.userId,
          petId: data.petId,
          lastMessageAt: data.lastMessageAt?.toDate?.() || data.lastMessageAt,
          pet,
          messages,
        };
      })
    );

    // JS 정렬 (composite index 없이 동작)
    rooms.sort((a, b) => {
      const dateA = a.lastMessageAt instanceof Date ? a.lastMessageAt.getTime() : 0;
      const dateB = b.lastMessageAt instanceof Date ? b.lastMessageAt.getTime() : 0;
      return dateB - dateA;
    });

    return rooms;
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

    // Get all messages for this room
    const messagesSnap = await db.collection('chatMessages')
      .where('chatRoomId', '==', roomId)
      .get();

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
      });

    // JS 정렬 (composite index 없이 동작)
    allMessages.sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
      const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
      return dateB - dateA;
    });

    const total = allMessages.length;
    const paginatedMessages = allMessages.slice(skip, skip + limit);

    // Mark unread AI messages as read
    const batch = db.batch();
    let batchCount = 0;
    for (const msg of paginatedMessages) {
      if (msg.senderType === 'PET_AI' && !msg.isRead) {
        batch.update(db.collection('chatMessages').doc(msg.id), { isRead: true });
        batchCount++;
      }
    }
    if (batchCount > 0) await batch.commit();

    return {
      messages: paginatedMessages.reverse(),
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

    // Save user message
    const userMsgRef = db.collection('chatMessages').doc();
    const userMsgData = {
      chatRoomId: roomId,
      senderType: 'USER',
      content,
      isRead: true,
      scheduledAt: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await userMsgRef.set(userMsgData);

    // Schedule AI response
    const category = analyzeMessage(content);
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

    // Update room last message time
    await roomDoc.ref.update({
      lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
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
