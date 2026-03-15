import { db } from '../config/firebase';
import admin from 'firebase-admin';
import { COLLECTIONS } from '../types/schema.types';
import { logger } from '../utils/logger';

export class AnalyticsService {
  // ─── Event Tracking ────────────────────────────────
  async trackEvent(
    userId: string,
    event: string,
    properties: Record<string, unknown>,
    meta: { sessionId: string; page: string; deviceInfo?: Record<string, unknown>; timestamp?: string }
  ) {
    await db.collection(COLLECTIONS.ANALYTICS_EVENTS).add({
      userId,
      sessionId: meta.sessionId,
      event,
      properties,
      page: meta.page,
      deviceInfo: meta.deviceInfo || {},
      createdAt: meta.timestamp
        ? admin.firestore.Timestamp.fromDate(new Date(meta.timestamp))
        : admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  async trackBatch(
    userId: string,
    events: Array<{
      event: string;
      properties: Record<string, unknown>;
      sessionId: string;
      page: string;
      deviceInfo?: Record<string, unknown>;
      timestamp?: string;
    }>
  ) {
    const batch = db.batch();
    for (const evt of events) {
      const ref = db.collection(COLLECTIONS.ANALYTICS_EVENTS).doc();
      batch.set(ref, {
        userId,
        sessionId: evt.sessionId,
        event: evt.event,
        properties: evt.properties || {},
        page: evt.page || '',
        deviceInfo: evt.deviceInfo || {},
        createdAt: evt.timestamp
          ? admin.firestore.Timestamp.fromDate(new Date(evt.timestamp))
          : admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
  }

  // ─── Playback Sessions ────────────────────────────
  async startPlayback(
    userId: string,
    profileId: string,
    petId: string,
    deviceInfo?: Record<string, unknown>
  ): Promise<string> {
    const ref = await db.collection(COLLECTIONS.PLAYBACK_SESSIONS).add({
      userId,
      profileId,
      petId,
      startedAt: admin.firestore.FieldValue.serverTimestamp(),
      endedAt: null,
      duration: 0,
      motionTaps: 0,
      motionLocks: 0,
      motionDetails: [],
      deviceInfo: deviceInfo || {},
    });
    return ref.id;
  }

  async endPlayback(
    sessionId: string,
    data: {
      duration: number;
      motionTaps: number;
      motionLocks: number;
      motionDetails: Array<{ position: string; motionId: string; timestamp: string }>;
    }
  ) {
    await db.collection(COLLECTIONS.PLAYBACK_SESSIONS).doc(sessionId).update({
      endedAt: admin.firestore.FieldValue.serverTimestamp(),
      duration: data.duration,
      motionTaps: data.motionTaps,
      motionLocks: data.motionLocks,
      motionDetails: data.motionDetails.map(d => ({
        ...d,
        timestamp: admin.firestore.Timestamp.fromDate(new Date(d.timestamp)),
      })),
    });
  }

  // ─── Daily Stats Aggregation ──────────────────────
  async updateDailyStats(dateStr?: string) {
    const now = new Date();
    const date = dateStr || now.toISOString().split('T')[0];
    const dayStart = new Date(`${date}T00:00:00Z`);
    const dayEnd = new Date(`${date}T23:59:59.999Z`);
    const startTs = admin.firestore.Timestamp.fromDate(dayStart);
    const endTs = admin.firestore.Timestamp.fromDate(dayEnd);

    try {
      const [
        totalUsersSnap,
        newUsersSnap,
        eventsSnap,
        playbackSnap,
        newPetsSnap,
        newProfilesSnap,
      ] = await Promise.all([
        db.collection(COLLECTIONS.USERS).count().get(),
        db.collection(COLLECTIONS.USERS)
          .where('createdAt', '>=', startTs)
          .where('createdAt', '<=', endTs)
          .count().get(),
        db.collection(COLLECTIONS.ANALYTICS_EVENTS)
          .where('createdAt', '>=', startTs)
          .where('createdAt', '<=', endTs)
          .get(),
        db.collection(COLLECTIONS.PLAYBACK_SESSIONS)
          .where('startedAt', '>=', startTs)
          .where('startedAt', '<=', endTs)
          .get(),
        db.collection(COLLECTIONS.PETS)
          .where('createdAt', '>=', startTs)
          .where('createdAt', '<=', endTs)
          .count().get(),
        db.collection(COLLECTIONS.PROFILES)
          .where('createdAt', '>=', startTs)
          .where('createdAt', '<=', endTs)
          .count().get(),
      ]);

      // Aggregate from events
      const events = eventsSnap.docs.map(d => d.data());
      const activeUserIds = new Set(events.map(e => e.userId));
      const pageViews = events.filter(e => e.event === 'page_view');
      const messagesSent = events.filter(e => e.event === 'message_send');
      const messagesReceived = events.filter(e => e.event === 'message_read');
      const creditSpends = events.filter(e => e.event === 'credit_spend');
      const creditRedeems = events.filter(e => e.event === 'credit_redeem');
      const baseVideoCreates = events.filter(e => e.event === 'base_video_create');
      const motionCreates = events.filter(e => e.event === 'motion_create');

      // Page view aggregation
      const pageCounts: Record<string, number> = {};
      for (const pv of pageViews) {
        const path = (pv.properties?.path as string) || pv.page || '/';
        pageCounts[path] = (pageCounts[path] || 0) + 1;
      }
      const topPages = Object.entries(pageCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([path, views]) => ({ path, views }));

      // Playback aggregation
      const sessions = playbackSnap.docs.map(d => d.data());
      const totalPlaybackSeconds = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
      const totalMotionTaps = sessions.reduce((sum, s) => sum + (s.motionTaps || 0), 0);

      const totalCreditsSpent = creditSpends.reduce((sum, e) => sum + ((e.properties?.amount as number) || 0), 0);
      const totalCreditsEarned = creditRedeems.reduce((sum, e) => sum + ((e.properties?.creditsAdded as number) || 0), 0);

      const statsData = {
        totalUsers: totalUsersSnap.data().count,
        newUsers: newUsersSnap.data().count,
        activeUsers: activeUserIds.size,
        totalPageViews: pageViews.length,
        totalPlaybackMinutes: Math.round(totalPlaybackSeconds / 60 * 100) / 100,
        avgPlaybackMinutes: sessions.length > 0
          ? Math.round(totalPlaybackSeconds / sessions.length / 60 * 100) / 100
          : 0,
        totalMotionTaps,
        totalMessagesSent: messagesSent.length,
        totalMessagesReceived: messagesReceived.length,
        totalCreditsSpent,
        totalCreditsEarned,
        newPets: newPetsSnap.data().count,
        newProfiles: newProfilesSnap.data().count,
        newBaseVideos: baseVideoCreates.length,
        newMotions: motionCreates.length,
        topPages,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await db.collection(COLLECTIONS.DAILY_STATS).doc(date).set(statsData, { merge: true });
      return statsData;
    } catch (error) {
      logger.error('Failed to update daily stats', error);
      throw error;
    }
  }

  // ─── Dashboard Data ───────────────────────────────
  async getDashboardData() {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const yesterdayStr = new Date(now.getTime() - 86400000).toISOString().split('T')[0];

    // Try to get today's stats, fall back to computing
    let todayStats = null;
    const todayDoc = await db.collection(COLLECTIONS.DAILY_STATS).doc(todayStr).get();
    if (todayDoc.exists) {
      todayStats = todayDoc.data();
    } else {
      todayStats = await this.updateDailyStats(todayStr);
    }

    const yesterdayDoc = await db.collection(COLLECTIONS.DAILY_STATS).doc(yesterdayStr).get();
    const yesterdayStats = yesterdayDoc.exists ? yesterdayDoc.data() : null;

    // Recent 7 days for trend
    const last7Days: Array<Record<string, unknown>> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const ds = d.toISOString().split('T')[0];
      const doc = await db.collection(COLLECTIONS.DAILY_STATS).doc(ds).get();
      last7Days.push(doc.exists ? { date: ds, ...doc.data() } : { date: ds });
    }

    return {
      today: todayStats,
      yesterday: yesterdayStats,
      trend: last7Days,
    };
  }

  // ─── Event Querying ───────────────────────────────
  async getAnalyticsEvents(filters: {
    event?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    let query: FirebaseFirestore.Query = db.collection(COLLECTIONS.ANALYTICS_EVENTS)
      .orderBy('createdAt', 'desc');

    if (filters.event) {
      query = query.where('event', '==', filters.event);
    }
    if (filters.userId) {
      query = query.where('userId', '==', filters.userId);
    }
    if (filters.startDate) {
      query = query.where('createdAt', '>=',
        admin.firestore.Timestamp.fromDate(new Date(filters.startDate)));
    }
    if (filters.endDate) {
      query = query.where('createdAt', '<=',
        admin.firestore.Timestamp.fromDate(new Date(filters.endDate)));
    }

    const snap = await query.offset((page - 1) * limit).limit(limit).get();
    const events = snap.docs.map(d => ({
      id: d.id,
      ...d.data(),
      createdAt: d.data().createdAt?.toDate?.() || d.data().createdAt,
    }));

    return { events, page, limit };
  }

  // ─── Playback Stats ───────────────────────────────
  async getPlaybackStats(filters: {
    userId?: string;
    profileId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    let query: FirebaseFirestore.Query = db.collection(COLLECTIONS.PLAYBACK_SESSIONS)
      .orderBy('startedAt', 'desc');

    if (filters.userId) {
      query = query.where('userId', '==', filters.userId);
    }
    if (filters.profileId) {
      query = query.where('profileId', '==', filters.profileId);
    }

    const snap = await query.offset((page - 1) * limit).limit(limit).get();
    const sessions = snap.docs.map(d => ({
      id: d.id,
      ...d.data(),
      startedAt: d.data().startedAt?.toDate?.() || d.data().startedAt,
      endedAt: d.data().endedAt?.toDate?.() || d.data().endedAt,
    }));

    return { sessions, page, limit };
  }

  // ─── User Analytics ───────────────────────────────
  async getUserAnalytics(userId: string) {
    const [eventsSnap, playbackSnap] = await Promise.all([
      db.collection(COLLECTIONS.ANALYTICS_EVENTS)
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(100)
        .get(),
      db.collection(COLLECTIONS.PLAYBACK_SESSIONS)
        .where('userId', '==', userId)
        .orderBy('startedAt', 'desc')
        .limit(50)
        .get(),
    ]);

    const events = eventsSnap.docs.map(d => ({
      id: d.id,
      ...d.data(),
      createdAt: d.data().createdAt?.toDate?.() || d.data().createdAt,
    }));

    const sessions = playbackSnap.docs.map(d => ({
      id: d.id,
      ...d.data(),
      startedAt: d.data().startedAt?.toDate?.() || d.data().startedAt,
      endedAt: d.data().endedAt?.toDate?.() || d.data().endedAt,
    }));

    // Summary
    const eventCounts: Record<string, number> = {};
    for (const e of events) {
      const evt = (e as Record<string, unknown>).event as string;
      eventCounts[evt] = (eventCounts[evt] || 0) + 1;
    }

    const totalPlaybackSeconds = sessions.reduce((sum, s) => {
      return sum + ((s as Record<string, unknown>).duration as number || 0);
    }, 0);

    return {
      recentEvents: events.slice(0, 20),
      recentSessions: sessions.slice(0, 10),
      eventCounts,
      totalPlaybackMinutes: Math.round(totalPlaybackSeconds / 60 * 100) / 100,
      totalSessions: sessions.length,
    };
  }

  // ─── Messenger Analytics ──────────────────────────
  async getMessengerAnalytics() {
    const [roomsSnap, eventsSnap] = await Promise.all([
      db.collection(COLLECTIONS.CHAT_ROOMS).get(),
      db.collection(COLLECTIONS.ANALYTICS_EVENTS)
        .where('event', 'in', ['message_send', 'message_read', 'emoji_select', 'chat_room_open'])
        .orderBy('createdAt', 'desc')
        .limit(500)
        .get(),
    ]);

    const events = eventsSnap.docs.map(d => d.data());
    const messageSends = events.filter(e => e.event === 'message_send');
    const emojiSelects = events.filter(e => e.event === 'emoji_select');

    const emojiCounts: Record<string, number> = {};
    for (const e of emojiSelects) {
      const emoji = (e.properties?.emoji as string) || '';
      if (emoji) emojiCounts[emoji] = (emojiCounts[emoji] || 0) + 1;
    }
    const topEmojis = Object.entries(emojiCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([emoji, count]) => ({ emoji, count }));

    return {
      totalChatRooms: roomsSnap.size,
      totalMessagesSent: messageSends.length,
      topEmojis,
      activeUsers: new Set(messageSends.map(e => e.userId)).size,
    };
  }

  // ─── Pet Analytics ────────────────────────────────
  async getPetAnalytics() {
    const petsSnap = await db.collection(COLLECTIONS.PETS).get();
    const pets = petsSnap.docs.map(d => d.data());

    const speciesCount: Record<string, number> = {};
    let memorialCount = 0;
    for (const p of pets) {
      const species = (p.species as string) || 'OTHER';
      speciesCount[species] = (speciesCount[species] || 0) + 1;
      if (p.memorialDay) memorialCount++;
    }

    return {
      totalPets: pets.length,
      speciesDistribution: speciesCount,
      memorialRate: pets.length > 0
        ? Math.round(memorialCount / pets.length * 100 * 10) / 10
        : 0,
    };
  }
}

export const analyticsService = new AnalyticsService();
