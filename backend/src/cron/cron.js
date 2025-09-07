const cron = require('node-cron');
const { updateElectionStatuses } = require('../services/electionStatusService');
const pool = require('../config/db');
const notificationService = require('../services/notificationService');

// Set timezone for cron job
cron.schedule('* * * * *', async () => {
  try {
    console.log(`[CRON] Running election status update at ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })}`);
    
    // Just call the function, don't check for a return value
    await updateElectionStatuses();
    console.log(`[CRON] Election status update completed`);
    
    // Keep database connection alive
    await pool.query('SELECT 1');
  } catch (error) {
    console.error('[CRON] Error:', error);
  }
}, {
  timezone: 'Asia/Manila'
});

module.exports = cron;