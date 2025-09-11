const pool = require('../config/db');

/**
 * Safe Performance Monitoring Middleware
 * Tracks system performance without affecting existing functionality
 */

// Simple metrics storage
const metrics = {
  requests: {
    total: 0,
    responseTimes: [],
    errors: 0
  },
  database: {
    queries: 0,
    slowQueries: 0
  },
  system: {
    startTime: Date.now(),
    memoryUsage: []
  }
};

// Configuration
const CONFIG = {
  SLOW_QUERY_THRESHOLD: 1000, // 1 second
  MAX_SAMPLES: 1000,
  MEMORY_CHECK_INTERVAL: 30000 // 30 seconds
};

/**
 * Performance monitoring middleware
 */
const performanceMonitor = (req, res, next) => {
  const startTime = Date.now();
  
  // Track request
  metrics.requests.total++;
  
  // Override res.end to capture response time
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    // Record response time
    metrics.requests.responseTimes.push({
      endpoint: `${req.method} ${req.path}`,
      responseTime,
      timestamp: new Date().toISOString(),
      statusCode: res.statusCode
    });
    
    // Keep only recent samples
    if (metrics.requests.responseTimes.length > CONFIG.MAX_SAMPLES) {
      metrics.requests.responseTimes = metrics.requests.responseTimes.slice(-CONFIG.MAX_SAMPLES);
    }
    
    // Track errors
    if (res.statusCode >= 400) {
      metrics.requests.errors++;
    }
    
    // Restore original end function
    res.end = originalEnd;
    res.end(chunk, encoding);
  };

  next();
};

/**
 * Database query monitoring wrapper
 */
const monitorDatabaseQuery = async (query, params) => {
  const startTime = Date.now();
  metrics.database.queries++;
  
  try {
    const result = await query;
    const endTime = Date.now();
    const queryTime = endTime - startTime;
    
    if (queryTime > CONFIG.SLOW_QUERY_THRESHOLD) {
      metrics.database.slowQueries++;
      console.warn(`🐌 Slow database query detected: ${queryTime}ms`);
    }
    
    return result;
  } catch (error) {
    const endTime = Date.now();
    const queryTime = endTime - startTime;
    console.error(`❌ Database query error after ${queryTime}ms:`, error.message);
    throw error;
  }
};

/**
 * Health check endpoint
 */
const healthCheck = (req, res) => {
  const currentMemory = process.memoryUsage();
  const memoryUsagePercent = currentMemory.heapUsed / currentMemory.heapTotal;
  
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - metrics.system.startTime) / 1000),
    memory: {
      used: Math.round(currentMemory.heapUsed / 1024 / 1024),
      total: Math.round(currentMemory.heapTotal / 1024 / 1024),
      percentage: Math.round(memoryUsagePercent * 100)
    },
    database: {
      totalConnections: pool.totalCount,
      idleConnections: pool.idleCount,
      waitingConnections: pool.waitingCount
    },
    requests: {
      total: metrics.requests.total,
      errors: metrics.requests.errors,
      errorRate: metrics.requests.total > 0 ? 
        Math.round((metrics.requests.errors / metrics.requests.total) * 100) : 0
    },
    performance: {
      averageResponseTime: calculateAverageResponseTime(),
      slowQueries: metrics.database.slowQueries
    }
  };
  
  // Determine health status
  if (memoryUsagePercent > 0.9 || pool.waitingCount > 20) {
    health.status = 'critical';
  } else if (memoryUsagePercent > 0.8 || pool.waitingCount > 10) {
    health.status = 'degraded';
  }
  
  res.status(health.status === 'critical' ? 503 : 200).json(health);
};

/**
 * Performance metrics endpoint
 */
const getMetrics = (req, res) => {
  const response = {
    ...metrics,
    system: {
      ...metrics.system,
      uptime: Math.floor((Date.now() - metrics.system.startTime) / 1000),
      nodeVersion: process.version,
      platform: process.platform
    },
    database: {
      ...metrics.database,
      connectionPool: {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount
      }
    },
    timestamp: new Date().toISOString()
  };
  
  res.json(response);
};

/**
 * Helper functions
 */
function calculateAverageResponseTime() {
  if (metrics.requests.responseTimes.length === 0) return 0;
  
  const total = metrics.requests.responseTimes.reduce((sum, req) => sum + req.responseTime, 0);
  return Math.round(total / metrics.requests.responseTimes.length);
}

/**
 * Memory usage monitoring
 */
const collectMemoryUsage = () => {
  const memory = process.memoryUsage();
  metrics.system.memoryUsage.push({
    heapUsed: Math.round(memory.heapUsed / 1024 / 1024),
    heapTotal: Math.round(memory.heapTotal / 1024 / 1024),
    timestamp: new Date().toISOString()
  });
  
  // Keep only recent samples
  if (metrics.system.memoryUsage.length > 100) {
    metrics.system.memoryUsage = metrics.system.memoryUsage.slice(-100);
  }
};

// Start memory monitoring
setInterval(collectMemoryUsage, CONFIG.MEMORY_CHECK_INTERVAL);

module.exports = {
  performanceMonitor,
  monitorDatabaseQuery,
  healthCheck,
  getMetrics
};
