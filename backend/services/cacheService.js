class CacheService {
  constructor() {
    this.memoryCache = new Map();
    this.defaultTTL = 3600; // 1 hour
    console.log('📦 Using in-memory cache');
  }

  async get(key) {
    const data = this.memoryCache.get(key);
    if (data && data.expiry > Date.now()) {
      return data.value;
    }
    if (data) {
      this.memoryCache.delete(key);
    }
    return null;
  }

  async set(key, value, ttl = this.defaultTTL) {
    this.memoryCache.set(key, {
      value,
      expiry: Date.now() + (ttl * 1000)
    });
    return true;
  }

  async del(key) {
    return this.memoryCache.delete(key);
  }

  async delPattern(pattern) {
    const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
    let deleted = 0;
    for (const key of this.memoryCache.keys()) {
      if (regex.test(key)) {
        this.memoryCache.delete(key);
        deleted++;
      }
    }
    return deleted;
  }

  async exists(key) {
    const data = this.memoryCache.get(key);
    return !!(data && data.expiry > Date.now());
  }

  // User cache methods
  async getUser(id) {
    return this.get(`user:${id}`);
  }

  async setUser(id, data, ttl = 3600) {
    return this.set(`user:${id}`, data, ttl);
  }

  async clearUser(id) {
    return this.del(`user:${id}`);
  }

  // Campaign cache methods
  async getCampaign(id) {
    return this.get(`campaign:${id}`);
  }

  async setCampaign(id, data, ttl = 1800) {
    return this.set(`campaign:${id}`, data, ttl);
  }

  async clearCampaign(id) {
    return this.del(`campaign:${id}`);
  }

  // Clear all
  async flush() {
    this.memoryCache.clear();
    return true;
  }

  async getStats() {
    return {
      connected: false,
      totalKeys: this.memoryCache.size,
      memory: 'in-memory',
      hits: 'n/a',
      misses: 'n/a'
    };
  }
}

module.exports = new CacheService();