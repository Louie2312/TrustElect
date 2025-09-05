const cron = require('node-cron');
const pool = require('../config/db');
// Remove the conflicting election status update
// const { updateElectionStatuses } = require('../models/electionModel');
// const notificationService = require('../services/notificationService');

// Comment out or remove this entire cron job
/*
cron.schedule('* * * * *', async () => {
  try {
    console.log('Running election status update...');
    
    const client = await pool.connect();
    
    try {
      const statusChanges = await updateElectionStatuses();
      
      for (const change of statusChanges) {
        await notificationService.notifyElectionStatusChange(
          change.electionId,
          change.oldStatus,
          change.newStatus
        );
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error in cron job:', error);
  }
});
*/

// Keep only other cron jobs if any exist
module.exports = {};