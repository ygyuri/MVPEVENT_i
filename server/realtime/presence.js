let IORedis;
try { IORedis = require('ioredis'); } catch (e) { IORedis = class {}; }

const ONLINE_SET_PREFIX = 'event:online:'; // per event set of userIds
const LAST_SEEN_KEY = 'event:lastseen'; // hash: field `${eventId}:${userId}` -> ISO date

class PresenceService {
  constructor() {
    const url = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
    try {
      this.redis = new IORedis(url, { maxRetriesPerRequest: null });
    } catch (e) { this.redis = null; }
  }

  async markOnline(eventId, userId, ttlSeconds = 120) {
    if (!this.redis) return;
    const key = `${ONLINE_SET_PREFIX}${eventId}`;
    await this.redis.sadd(key, String(userId));
    await this.redis.expire(key, ttlSeconds);
    await this.redis.hset(LAST_SEEN_KEY, `${eventId}:${userId}`, new Date().toISOString());
  }

  async markOffline(eventId, userId) {
    if (!this.redis) return;
    const key = `${ONLINE_SET_PREFIX}${eventId}`;
    await this.redis.srem(key, String(userId));
    await this.redis.hset(LAST_SEEN_KEY, `${eventId}:${userId}`, new Date().toISOString());
  }

  async getOnlineUsers(eventId) {
    if (!this.redis) return [];
    const key = `${ONLINE_SET_PREFIX}${eventId}`;
    const members = await this.redis.smembers(key);
    return members || [];
  }

  async getLastSeen(eventId, userId) {
    if (!this.redis) return null;
    const iso = await this.redis.hget(LAST_SEEN_KEY, `${eventId}:${userId}`);
    return iso ? new Date(iso) : null;
  }
}

module.exports = new PresenceService();


