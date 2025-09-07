const cron = require('node-cron');
const { updateElectionStatuses } = require('../services/electionStatusService'); // Changed from electionModel
const pool = require('../config/db');
const notificationService = require('../services/notificationService');

// Set timezone for cron job
cron.schedule('* * * * *', async () => {
  try {
    console.log(`[CRON] Running election status update at ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })}`);
    
    const result = await updateElectionStatuses();
    
    if (result && result.length > 0) {
      console.log(`[CRON] Updated ${result.length} elections`);
    }
    
    // Keep database connection alive
    await pool.query('SELECT 1');
  } catch (error) {
    console.error('[CRON] Error:', error);
  }
}, {
  timezone: 'Asia/Manila'
});

module.exports = cron;