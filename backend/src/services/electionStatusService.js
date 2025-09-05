const pool = require("../config/db");
const { DateTime } = require("luxon");
const notificationService = require("./notificationService");

// Manila timezone (UTC+8)
const MANILA_TIMEZONE = "Asia/Manila";

async function updateElectionStatuses() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { rows: elections } = await client.query(
      `SELECT id, title, date_from, date_to, start_time, end_time, status 
       FROM elections 
       WHERE status != 'archived'`
    );

    const now = DateTime.now().setZone(MANILA_TIMEZONE);
    console.log(`[STATUS UPDATE] Current Manila time: ${now.toISO()}`);
    
    const statusChanges = [];
    const newlyCompletedElections = [];

    for (const election of elections) {
      const startDateTime = DateTime.fromISO(election.date_from)
        .setZone(MANILA_TIMEZONE)
        .set({
          hour: election.start_time ? parseInt(election.start_time.split(':')[0]) : 0,
          minute: election.start_time ? parseInt(election.start_time.split(':')[1]) : 0
        });

      const endDateTime = DateTime.fromISO(election.date_to)
        .setZone(MANILA_TIMEZONE)
        .set({
          hour: election.end_time ? parseInt(election.end_time.split(':')[0]) : 23,
          minute: election.end_time ? parseInt(election.end_time.split(':')[1]) : 59
        });

      let newStatus = election.status;
      const oldStatus = election.status;

      if (now < startDateTime) {
        newStatus = 'upcoming';
      } else if (now >= startDateTime && now <= endDateTime) {
        newStatus = 'ongoing';
      } else if (now > endDateTime) {
        newStatus = 'completed';
      }

      if (newStatus !== oldStatus) {
        console.log(`[STATUS UPDATE] Election "${election.title}" status changed: ${oldStatus} -> ${newStatus}`);
        
        await client.query(
          `UPDATE elections SET status = $1, updated_at = $2 WHERE id = $3`,
          [newStatus, now.toJSDate(), election.id]
        );

        statusChanges.push({
          id: election.id,
          title: election.title,
          oldStatus,
          newStatus
        });

        if (newStatus === 'completed') {
          newlyCompletedElections.push(election);
        }
      }
    }

    await client.query('COMMIT');
    
    // Send notifications for status changes
    for (const change of statusChanges) {
      try {
        await notificationService.notifyElectionStatusChange(
          { id: change.id, title: change.title }, 
          change.oldStatus, 
          change.newStatus
        );
      } catch (notifError) {
        console.error(`[STATUS UPDATE] Error sending notification for election ${change.id}:`, notifError);
      }
    }

    console.log(`[STATUS UPDATE] Processed ${elections.length} elections, ${statusChanges.length} status changes`);
    return { statusChanges, newlyCompletedElections };
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[STATUS UPDATE] Error updating election statuses:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Export the function for use by cron job
module.exports = {
  updateElectionStatuses
};