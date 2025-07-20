const pool = require('../config/db');

class FailedLoginModel {
  static async getFailedLoginSummary() {
    try {
      // Get total failed attempts
      const totalAttemptsQuery = `
        SELECT COUNT(*) as total_attempts
        FROM audit_logs
        WHERE action = 'LOGIN_FAILED'
        AND created_at >= NOW() - INTERVAL '30 days'
      `;
      const totalAttempts = await pool.query(totalAttemptsQuery);

      // Get locked accounts count - accounts with 3 or more failed attempts within 30 minutes
      const lockedAccountsQuery = `
        WITH recent_failures AS (
          SELECT 
            user_email,
            COUNT(*) as failure_count,
            MAX(created_at) as last_failure
          FROM audit_logs
          WHERE action = 'LOGIN_FAILED'
          AND created_at >= NOW() - INTERVAL '30 minutes'
          AND user_email IS NOT NULL
          GROUP BY user_email
          HAVING COUNT(*) >= 3
        )
        SELECT COUNT(*) as locked_accounts
        FROM recent_failures
      `;
      const lockedAccounts = await pool.query(lockedAccountsQuery);

      // Get recent failed attempts with locked status
      const recentAttemptsQuery = `
        WITH recent_failures AS (
          SELECT 
            user_email,
            COUNT(*) as failure_count
          FROM audit_logs
          WHERE action = 'LOGIN_FAILED'
          AND created_at >= NOW() - INTERVAL '30 minutes'
          AND user_email IS NOT NULL
          GROUP BY user_email
        )
        SELECT 
          al.id,
          al.created_at as timestamp,
          al.user_email as email,
          COALESCE(al.details->>'reason', 'Invalid credentials') as reason,
          CASE 
            WHEN rf.failure_count >= 3 THEN 'locked'
            ELSE 'failed'
          END as status
        FROM audit_logs al
        LEFT JOIN recent_failures rf ON al.user_email = rf.user_email
        WHERE al.action = 'LOGIN_FAILED'
        AND al.created_at >= NOW() - INTERVAL '30 days'
        AND al.user_email IS NOT NULL
        ORDER BY al.created_at DESC
        LIMIT 10
      `;
      const recentAttempts = await pool.query(recentAttemptsQuery);

      // Get time distribution
      const timeDistributionQuery = `
        SELECT 
          EXTRACT(HOUR FROM created_at) as hour,
          COUNT(*) as count
        FROM audit_logs
        WHERE action = 'LOGIN_FAILED'
        AND created_at >= NOW() - INTERVAL '30 days'
        GROUP BY EXTRACT(HOUR FROM created_at)
        ORDER BY hour
      `;
      const timeDistribution = await pool.query(timeDistributionQuery);

      // Format the response
      const response = {
        total_attempts: parseInt(totalAttempts.rows[0]?.total_attempts) || 0,
        locked_accounts: parseInt(lockedAccounts.rows[0]?.locked_accounts) || 0,
        recent_attempts: recentAttempts.rows.map(attempt => ({
          ...attempt,
          reason: attempt.reason || 'Invalid credentials'
        })),
        time_distribution: timeDistribution.rows.map(row => ({
          hour: row.hour.toString().padStart(2, '0'),
          count: parseInt(row.count)
        }))
      };

      console.log('Failed Login Report Data:', response);
      return response;
    } catch (error) {
      console.error('Error in getFailedLoginSummary:', error);
      throw error;
    }
  }
}

module.exports = FailedLoginModel; 