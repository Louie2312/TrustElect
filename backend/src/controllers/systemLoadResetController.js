const pool = require('../config/db');

/**
 * System Load Reset Controller
 * Handles resetting system load data for fresh testing
 */

exports.resetSystemLoadData = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Clear system load data tables
    console.log('🔄 Resetting system load data...');
    
    // Clear login activity data
    await client.query('DELETE FROM system_load_logs WHERE activity_type = $1', ['login']);
    console.log('✅ Cleared login activity data');
    
    // Clear voting activity data  
    await client.query('DELETE FROM system_load_logs WHERE activity_type = $1', ['voting']);
    console.log('✅ Cleared voting activity data');
    
    // Clear all system load logs (if the table exists)
    await client.query('DELETE FROM system_load_logs');
    console.log('✅ Cleared all system load logs');
    
    // Reset any cached data (if using a cache table)
    await client.query(`
      DELETE FROM system_cache 
      WHERE cache_key LIKE 'system_load_%' OR cache_key LIKE 'peak_hours_%'
    `).catch(() => {
      // Table might not exist, that's okay
      console.log('ℹ️ No cache table found, skipping cache reset');
    });
    
    await client.query('COMMIT');
    
    console.log('🎉 System load data reset completed successfully');
    
    res.status(200).json({
      success: true,
      message: 'System load data has been reset successfully',
      timestamp: new Date().toISOString(),
      resetData: {
        loginActivity: 'cleared',
        votingActivity: 'cleared',
        systemLogs: 'cleared',
        cache: 'cleared'
      }
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error resetting system load data:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to reset system load data',
      error: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Get system load reset status
 */
exports.getResetStatus = async (req, res) => {
  try {
    // Check if there's any system load data
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_logs,
        COUNT(CASE WHEN activity_type = 'login' THEN 1 END) as login_logs,
        COUNT(CASE WHEN activity_type = 'voting' THEN 1 END) as voting_logs,
        MAX(created_at) as latest_log
      FROM system_load_logs
    `);
    
    const data = result.rows[0];
    
    res.status(200).json({
      success: true,
      data: {
        totalLogs: parseInt(data.total_logs),
        loginLogs: parseInt(data.login_logs),
        votingLogs: parseInt(data.voting_logs),
        latestLog: data.latest_log,
        isEmpty: parseInt(data.total_logs) === 0
      }
    });
    
  } catch (error) {
    console.error('Error getting reset status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get reset status',
      error: error.message
    });
  }
};
