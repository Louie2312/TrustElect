/**
 * Safe Caching Middleware
 * Provides simple in-memory caching without affecting existing functionality
 */

// Simple in-memory cache
const cache = new Map();
const CACHE_TTL = 30000; // 30 seconds default

// Cache management
function setCache(key, value, ttl = CACHE_TTL) {
  cache.set(key, {
    value,
    expires: Date.now() + ttl
  });
}

function getCache(key) {
  const item = cache.get(key);
  if (!item) return null;
  
  if (Date.now() > item.expires) {
    cache.delete(key);
    return null;
  }
  
  return item.value;
}

function clearCache(pattern) {
  if (pattern) {
    for (const key of cache.keys()) {
      if (key.includes(pattern)) {
        cache.delete(key);
      }
    }
  } else {
    cache.clear();
  }
}

function getCacheStats() {
  return {
    size: cache.size,
    keys: Array.from(cache.keys()),
    timestamp: new Date().toISOString()
  };
}

// Cleanup old cache entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, item] of cache.entries()) {
    if (now > item.expires) {
      cache.delete(key);
    }
  }
}, 300000);

module.exports = {
  setCache,
  getCache,
  clearCache,
  getCacheStats
};
