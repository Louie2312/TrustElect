const pool = require('../config/db');

const getSystemLoad = async (req, res) => {
  try {
    const { timeframe = '24h' } = req.query;
    let interval;
    let grouping;
    let dateFormat;

    // Set the time interval and grouping based on timeframe
    switch (timeframe) {
      case '7d':
        interval = 'INTERVAL \'7 days\'';
        grouping = 'date_trunc(\'hour\', created_at)';
        dateFormat = 'YYYY-MM-DD HH24:00:00';
        break;
      case '30d':
        interval = 'INTERVAL \'30 days\'';
        grouping = 'date_trunc(\'day\', created_at)';
        dateFormat = 'YYYY-MM-DD';
        break;
      default: // 24h
        interval = 'INTERVAL \'24 hours\'';
        grouping = 'date_trunc(\'hour\', created_at)';
        dateFormat = 'YYYY-MM-DD HH24:00:00';
    }

    // Get login activity with better data handling
    const loginQuery = `
      WITH hourly_logins AS (
        SELECT 
          ${grouping} as time_period,
          COUNT(*) as count
        FROM audit_logs
        WHERE 
          action = 'LOGIN'
          AND created_at >= NOW() - ${interval}
        GROUP BY ${grouping}
        ORDER BY time_period
      )
      SELECT 
        ${timeframe === '30d' ? 'EXTRACT(DAY FROM time_period) as hour' : 'EXTRACT(HOUR FROM time_period) as hour'},
        count
      FROM hourly_logins
    `;

    // Get voting activity with better data handling
    const votingQuery = `
      WITH hourly_votes AS (
        SELECT 
          ${grouping} as time_period,
          COUNT(*) as count
        FROM votes
        WHERE created_at >= NOW() - ${interval}
        GROUP BY ${grouping}
        ORDER BY time_period
      )
      SELECT 
        ${timeframe === '30d' ? 'EXTRACT(DAY FROM time_period) as hour' : 'EXTRACT(HOUR FROM time_period) as hour'},
        count
      FROM hourly_votes
    `;

    // Get peak hours and counts with better timeframe handling
    const peakStatsQuery = `
      WITH login_stats AS (
        SELECT 
          ${timeframe === '30d' ? 'EXTRACT(DAY FROM' : 'EXTRACT(HOUR FROM'}${grouping}) as hour,
          COUNT(*) as count
        FROM audit_logs
        WHERE 
          action = 'LOGIN'
          AND created_at >= NOW() - ${interval}
        GROUP BY ${timeframe === '30d' ? 'EXTRACT(DAY FROM' : 'EXTRACT(HOUR FROM'} ${grouping})
      ),
      vote_stats AS (
        SELECT 
          ${timeframe === '30d' ? 'EXTRACT(DAY FROM' : 'EXTRACT(HOUR FROM'} ${grouping}) as hour,
          COUNT(*) as count
        FROM votes
        WHERE created_at >= NOW() - ${interval}
        GROUP BY ${timeframe === '30d' ? 'EXTRACT(DAY FROM' : 'EXTRACT(HOUR FROM'} ${grouping})
      ),
      active_users AS (
        SELECT COUNT(DISTINCT user_id) as count
        FROM audit_logs
        WHERE created_at >= NOW() - ${interval}
      )
      SELECT
        (SELECT hour || ':00' FROM login_stats ORDER BY count DESC LIMIT 1) as peak_login_hour,
        (SELECT count FROM login_stats ORDER BY count DESC LIMIT 1) as peak_login_count,
        (SELECT hour || ':00' FROM vote_stats ORDER BY count DESC LIMIT 1) as peak_voting_hour,
        (SELECT count FROM vote_stats ORDER BY count DESC LIMIT 1) as peak_voting_count,
        (SELECT count FROM active_users) as total_active_users
    `;

    const [loginActivity, votingActivity, peakStats] = await Promise.all([
      pool.query(loginQuery),
      pool.query(votingQuery),
      pool.query(peakStatsQuery)
    ]);

    // Transform the data
    const response = {
      summary: {
        peak_login_hour: peakStats.rows[0].peak_login_hour || 'N/A',
        peak_login_count: parseInt(peakStats.rows[0].peak_login_count) || 0,
        peak_voting_hour: peakStats.rows[0].peak_voting_hour || 'N/A',
        peak_voting_count: parseInt(peakStats.rows[0].peak_voting_count) || 0,
        total_active_users: parseInt(peakStats.rows[0].total_active_users) || 0
      },
      login_activity: loginActivity.rows.map(row => ({
        hour: parseInt(row.hour),
        count: parseInt(row.count)
      })),
      voting_activity: votingActivity.rows.map(row => ({
        hour: parseInt(row.hour),
        count: parseInt(row.count)
      }))
    };

    res.status(200).json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('Error in getSystemLoad:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch system load data'
    });
  }
};

module.exports = {
  getSystemLoad
}; 