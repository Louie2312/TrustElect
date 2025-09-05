const cron = require('node-cron');
const electionStatusService = require('../services/electionStatusService');

// Run every minute for more responsive status updates
cron.schedule('* * * * *', async () => {
  try {
    console.log('[CRON] Running election status update...');
    await electionStatusService.updateElectionStatuses();
    console.log('[CRON] Election status update completed');
  } catch (error) {
    console.error('[CRON] Error updating election statuses:', error);
  }
});

module.exports = cron;
