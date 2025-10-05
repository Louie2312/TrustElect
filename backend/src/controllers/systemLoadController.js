const pool = require("../config/db");

// Simple in-memory cache for system load data
const systemLoadCache = {
  '24h': { data: null, timestamp: 0 },
  '7d': { data: null, timestamp: 0 },
  '30d': { data: null, timestamp: 0 },
  TTL: 5 * 60 * 1000 // 5 minutes cache TTL
};

/**
 * Get system load data (login and voting activity)
 * Optimized with caching and efficient queries
 */
exports.getSystemLoadData = async (req, res) => {
  try {
    const { timeframe = '24h' } = req.query;
    
    // Validate timeframe
    if (!['24h', '7d', '30d'].includes(timeframe)) {
      return res.status(400).json({
        success: false,
        message: "Invalid timeframe. Must be one of: 24h, 7d, 30d"
      });
    }
    
    // Check cache first
    const now = Date.now();
    if (systemLoadCache[timeframe].data && (now - systemLoadCache[timeframe].timestamp < systemLoadCache.TTL)) {
      console.log(`Using cached system load data for timeframe: ${timeframe}`);
      return res.status(200).json({
        success: true,
        data: systemLoadCache[timeframe].data,
        cached: true
      });
    }
    
    console.log(`Fetching fresh system load data for timeframe: ${timeframe}`);
    
    // Prepare time interval based on timeframe
    let timeInterval;
    switch (timeframe) {
      case '24h':
        timeInterval = "INTERVAL '24 hours'";
        break;
      case '7d':
        timeInterval = "INTERVAL '7 days'";
        break;
      case '30d':
        timeInterval = "INTERVAL '30 days'";
        break;
      default:
        timeInterval = "INTERVAL '24 hours'";
    }
    
    // Optimize queries with proper indexing and aggregation
    const loginActivityQuery = `
      SELECT 
        EXTRACT(HOUR FROM created_at)::INTEGER as hour,
        COUNT(*) as count
      FROM audit_logs
      WHERE action = 'login'
        AND created_at > NOW() - ${timeInterval}
      GROUP BY EXTRACT(HOUR FROM created_at)
      ORDER BY hour
    `;
    
    const votingActivityQuery = `
      SELECT 
        EXTRACT(HOUR FROM created_at)::INTEGER as hour,
        COUNT(*) as count
      FROM votes
      WHERE created_at > NOW() - ${timeInterval}
      GROUP BY EXTRACT(HOUR FROM created_at)
      ORDER BY hour
    `;
    
    // Execute queries in parallel
    const [loginActivityResult, votingActivityResult] = await Promise.all([
      pool.query(loginActivityQuery),
      pool.query(votingActivityQuery)
    ]);
    
    // Format data for response
    const systemLoadData = {
      summary: {
        timeframe,
        login_total: loginActivityResult.rows.reduce((sum, row) => sum + parseInt(row.count), 0),
        voting_total: votingActivityResult.rows.reduce((sum, row) => sum + parseInt(row.count), 0)
      },
      login_activity: loginActivityResult.rows,
      voting_activity: votingActivityResult.rows
    };
    
    // Update cache
    systemLoadCache[timeframe] = {
      data: systemLoadData,
      timestamp: now
    };
    
    res.status(200).json({
      success: true,
      data: systemLoadData,
      cached: false
    });
  } catch (error) {
    console.error('Error fetching system load data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch system load data: ' + error.message
    });
  }
};

/**
 * Reset system load data cache
 * For admin use when data needs to be refreshed immediately
 */
exports.resetSystemLoadCache = (req, res) => {
  try {
    const { timeframe } = req.query;
    
    if (timeframe && systemLoadCache[timeframe]) {
      // Reset specific timeframe cache
      systemLoadCache[timeframe] = { data: null, timestamp: 0 };
      res.status(200).json({
        success: true,
        message: `Cache for timeframe ${timeframe} has been reset`
      });
    } else {
      // Reset all caches
      Object.keys(systemLoadCache).forEach(key => {
        if (key !== 'TTL') {
          systemLoadCache[key] = { data: null, timestamp: 0 };
        }
      });
      res.status(200).json({
        success: true,
        message: 'All system load caches have been reset'
      });
    }
  } catch (error) {
    console.error('Error resetting system load cache:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset cache: ' + error.message
    });
  }
};