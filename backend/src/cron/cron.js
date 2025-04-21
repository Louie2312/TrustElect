const cron = require('node-cron');
const { updateElectionStatuses, getElectionById } = require('../models/electionModel');
const pool = require('../config/db');
const notificationService = require('../services/notificationService');

// Run every minute for more responsive status updates
cron.schedule('* * * * *', async () => {
  try {
    console.log('[CRON] Starting election status update check');
    const result = await updateElectionStatuses();
    console.log(`[CRON] Updated ${result.updated} election statuses`);
    
    // Send notifications for elections with status changes
    if (result.statusChanges && result.statusChanges.length > 0) {
      console.log(`[CRON] Processing notifications for ${result.statusChanges.length} status changes`);
      
      for (const change of result.statusChanges) {
        try {
          // Get complete election data to pass to notification service
          const election = await getElectionById(change.id);
          if (election) {
            console.log(`[CRON] Sending notification for election ${election.id} status change: ${change.oldStatus} -> ${change.newStatus}`);
            await notificationService.notifyElectionStatusChange(election, change.oldStatus, change.newStatus);
          }
        } catch (notifError) {
          console.error(`[CRON] Error sending notification for election ${change.id}:`, notifError);
        }
      }
    }
    
    // Keep connection alive
    await pool.query('SELECT 1');
  } catch (error) {
    console.error('[CRON] Error:', error);
  }
});

module.exports = cron;