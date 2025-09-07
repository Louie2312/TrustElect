const pool = require("../config/db");
const { DateTime } = require("luxon");
// Import the notification service
const notificationService = require("./notificationService");

// Manila timezone (UTC+8)
const MANILA_TIMEZONE = "Asia/Manila";

async function updateElectionStatuses() {
  const client = await pool.connect();
  try {
    console.log(`[STATUS-UPDATE] Starting at ${DateTime.now().setZone(MANILA_TIMEZONE).toISO()}`);
    
    await client.query('BEGIN');
    
    const { rows: elections } = await client.query(
      `SELECT id, title, date_from, date_to, start_time, end_time, status 
       FROM elections 
       WHERE status != 'archived'`
    );

    const now = DateTime.now().setZone(MANILA_TIMEZONE);
    console.log(`[STATUS-UPDATE] Current Manila time: ${now.toISO()}`);
    console.log(`[STATUS-UPDATE] Processing ${elections.length} elections`);
    
    // Track elections that transitioned to completed status
    const newlyCompletedElections = [];
    // Track all status changes
    const statusChanges = [];

    for (const election of elections) {
      // REPLACE the existing DateTime.fromISO() logic with:
      const startDate = election.date_from.split('-').map(Number);
      const endDate = election.date_to.split('-').map(Number);
      
      const startTimeParts = election.start_time.split(':').map(Number);
      const endTimeParts = election.end_time.split(':').map(Number);
      
      const startDateTime = DateTime.fromObject({
        year: startDate[0],
        month: startDate[1], 
        day: startDate[2],
        hour: startTimeParts[0],
        minute: startTimeParts[1],
        second: 0
      }, { zone: MANILA_TIMEZONE });
  
      const endDateTime = DateTime.fromObject({
        year: endDate[0],
        month: endDate[1],
        day: endDate[2], 
        hour: endTimeParts[0],
        minute: endTimeParts[1],
        second: 0
      }, { zone: MANILA_TIMEZONE });
      
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
        console.log(`[STATUS-UPDATE] Election ${election.id} (${election.title}): ${oldStatus} → ${newStatus}`);
        await client.query(
          `UPDATE elections 
           SET status = $1, last_status_update = NOW() 
           WHERE id = $2`,
          [newStatus, election.id]
        );
        
        // Track all status changes
        statusChanges.push({
          id: election.id,
          oldStatus: oldStatus,
          newStatus: newStatus
        });
        
        // If transitioning to completed status, track for notifications
        if (newStatus === 'completed' && oldStatus !== 'completed') {
          newlyCompletedElections.push(election);
        }
      }
    }

    await client.query('COMMIT');
    
    // After transaction is committed, send notifications for completed elections
    if (newlyCompletedElections.length > 0) {
      // Process each completed election
      for (const election of newlyCompletedElections) {
        try {
          // Get complete election details for the notification
          const { rows } = await pool.query(
            'SELECT * FROM elections WHERE id = $1',
            [election.id]
          );
          
          if (rows.length > 0) {
            const completeElection = rows[0];
            
            // Send notifications to students
            await notificationService.notifyStudentsAboutElectionResults(completeElection);
          }
        } catch (error) {
          console.error(`Error sending notifications for completed election ${election.id}:`, error);
          // Continue with other elections even if one fails
        }
      }
    }
    
    // Return status changes information
    return {
      statusChanges,
      newlyCompletedElections
    };
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[STATUS-UPDATE] Error:', error);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { updateElectionStatuses };

