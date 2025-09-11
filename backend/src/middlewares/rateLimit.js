const rateLimit = require("express-rate-limit");

// Memory store for better performance
const memoryStore = new Map();

const createMemoryStore = () => ({
  async increment(key, windowMs) {
    const now = Date.now();
    const window = Math.floor(now / windowMs);
    const keyWithWindow = `${key}:${window}`;
    
    const current = memoryStore.get(keyWithWindow) || 0;
    memoryStore.set(keyWithWindow, current + 1);
    
    // Clean up old entries
    for (const [k] of memoryStore) {
      if (k.startsWith(key) && !k.endsWith(`:${window}`)) {
        memoryStore.delete(k);
      }
    }
    
    return {
      totalHits: current + 1,
      resetTime: new Date((window + 1) * windowMs)
    };
  }
});

const memoryStoreInstance = createMemoryStore();

exports.loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes (increased from 10)
  max: 10, // 10 attempts per 15 minutes (increased from 5)
  message: { 
    message: "Too many login attempts. Please try again in 15 minutes.",
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: memoryStoreInstance,
  keyGenerator: (req) => {
    // Rate limit by IP and email for better security
    const ip = req.ip || req.connection.remoteAddress;
    const email = req.body?.email || 'unknown';
    return `login:${ip}:${email}`;
  }
});

exports.apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, 
  max: 200, // Increased from 100 for better concurrent user support
  message: { 
    message: "Too many requests. Please slow down.",
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: memoryStoreInstance,
  keyGenerator: (req) => {
    const ip = req.ip || req.connection.remoteAddress;
    const userId = req.user?.id || 'anonymous';
    return `api:${ip}:${userId}`;
  }
});

// New: Voting-specific rate limiter
exports.votingLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3, // 3 voting attempts per 5 minutes
  message: { 
    message: "Too many voting attempts. Please wait before trying again.",
    retryAfter: 5 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: memoryStoreInstance,
  keyGenerator: (req) => {
    const userId = req.user?.id || 'anonymous';
    const studentId = req.user?.studentId || 'unknown';
    return `vote:${userId}:${studentId}`;
  }
});

// New: Ballot retrieval rate limiter
exports.ballotLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // 20 ballot requests per minute
  message: { 
    message: "Too many ballot requests. Please wait a moment.",
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: memoryStoreInstance,
  keyGenerator: (req) => {
    const userId = req.user?.id || 'anonymous';
    const electionId = req.params?.id || 'unknown';
    return `ballot:${userId}:${electionId}`;
  }
});

// New: Results rate limiter (more generous for real-time updates)
exports.resultsLimiter = rateLimit({
  windowMs: 30 * 1000, // 30 seconds
  max: 60, // 60 results requests per 30 seconds
  message: { 
    message: "Too many results requests. Please wait a moment.",
    retryAfter: 30
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: memoryStoreInstance,
  keyGenerator: (req) => {
    const ip = req.ip || req.connection.remoteAddress;
    return `results:${ip}`;
  }
});
