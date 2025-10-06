const crypto = require('crypto');
const redisManager = require('../config/redis');

function generateOtp(length = 6) {
  // 6-digit numeric
  const num = crypto.randomInt(0, Math.pow(10, length));
  return num.toString().padStart(length, '0');
}

class OtpService {
  constructor() {
    this.memoryStore = new Map(); // fallback
  }

  _key(phone) {
    return `otp:phone:${phone}`;
  }

  async set(phone, code, ttlSec = 300) {
    const key = this._key(phone);
    const redis = redisManager.getRedis();
    if (redisManager.isRedisAvailable() && redis && redis.set) {
      await redis.set(key, JSON.stringify({ code, attempts: 0 }), 'EX', ttlSec);
      return;
    }
    const expiresAt = Date.now() + ttlSec * 1000;
    this.memoryStore.set(key, { code, attempts: 0, expiresAt });
  }

  async get(phone) {
    const key = this._key(phone);
    const redis = redisManager.getRedis();
    if (redisManager.isRedisAvailable() && redis && redis.get) {
      const v = await redis.get(key);
      return v ? JSON.parse(v) : null;
    }
    const v = this.memoryStore.get(key);
    if (!v) return null;
    if (Date.now() > v.expiresAt) {
      this.memoryStore.delete(key);
      return null;
    }
    return v;
  }

  async del(phone) {
    const key = this._key(phone);
    const redis = redisManager.getRedis();
    if (redisManager.isRedisAvailable() && redis && redis.del) {
      await redis.del(key);
      return;
    }
    this.memoryStore.delete(key);
  }

  async incrementAttempts(phone) {
    const key = this._key(phone);
    const redis = redisManager.getRedis();
    if (redisManager.isRedisAvailable() && redis && redis.get && redis.set) {
      const v = await redis.get(key);
      if (!v) return null;
      const obj = JSON.parse(v);
      obj.attempts = (obj.attempts || 0) + 1;
      await redis.set(key, JSON.stringify(obj));
      return obj.attempts;
    }
    const obj = await this.get(phone);
    if (!obj) return null;
    obj.attempts = (obj.attempts || 0) + 1;
    this.memoryStore.set(key, obj);
    return obj.attempts;
  }

  async requestOtp(phone, { ttlSec = 300 } = {}) {
    const code = generateOtp(6);
    await this.set(phone, code, ttlSec);
    return code;
  }

  async verifyOtp(phone, code) {
    const data = await this.get(phone);
    if (!data) return { ok: false, code: 'EXPIRED' };
    if (data.attempts >= 5) return { ok: false, code: 'TOO_MANY_ATTEMPTS' };
    if (data.code === code) {
      await this.del(phone);
      return { ok: true };
    }
    await this.incrementAttempts(phone);
    return { ok: false, code: 'INVALID' };
  }
}

module.exports = new OtpService();


