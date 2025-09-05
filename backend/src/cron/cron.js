const cron = require('node-cron');
const electionStatusService = require('../services/electionStatusService');

// Use electionStatusService instead of electionModel for consistent timezone handling
cron.schedule('*/15 * * * *', async () => {
  try {
    console.log('[CRON] Running election status update...');
    await electionStatusService.updateElectionStatuses();
    console.log('[CRON] Election status update completed');
  } catch (error) {
    console.error('[CRON] Error updating election statuses:', error);
  }
});

module.exports = cron;