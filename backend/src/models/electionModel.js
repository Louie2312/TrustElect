const pool = require("../config/db");

const getElectionStatus = (date_from, date_to, start_time, end_time, needs_approval = false) => {
  // Import at the top of the file if not already there
  const { DateTime } = require("luxon");
  const MANILA_TIMEZONE = "Asia/Manila";

  if (needs_approval === true) {
    return 'pending';
  }
  
  if (!date_from || !date_to || !start_time || !end_time) {
    return 'draft';
  }
  
  const now = DateTime.now().setZone(MANILA_TIMEZONE);
  
  const start = DateTime.fromISO(date_from)
    .setZone(MANILA_TIMEZONE)
    .set({
      hour: start_time ? parseInt(start_time.split(':')[0]) : 0,
      minute: start_time ? parseInt(start_time.split(':')[1]) : 0
    });

  const end = DateTime.fromISO(date_to)
    .setZone(MANILA_TIMEZONE)
    .set({
      hour: end_time ? parseInt(end_time.split(':')[0]) : 23,
      minute: end_time ? parseInt(end_time.split(':')[1]) : 59
    });
  
  if (now < start) return "upcoming";
  if (now >= start && now <= end) return "ongoing";
  return "completed";
};


const getDisplayStatus = getElectionStatus;

const getElectionsByStatus = async (status) => {
  const result = await pool.query(`
      SELECT 
          e.id, 
          e.title, 
          e.description,
          e.date_from,
          e.date_to,
          e.start_time,
          e.end_time,
          e.status,
          e.created_at,
          e.needs_approval,
          COUNT(DISTINCT ev.id) AS voter_count,
          COALESCE(COUNT(DISTINCT CASE WHEN v.id IS NOT NULL THEN CONCAT(v.student_id, '-', v.election_id) END), 0) AS vote_count,
          EXISTS (
              SELECT 1 FROM ballots b 
              JOIN positions p ON b.id = p.ballot_id
              WHERE b.election_id = e.id
              LIMIT 1
          ) AS ballot_exists
      FROM elections e
      LEFT JOIN eligible_voters ev ON e.id = ev.election_id
      LEFT JOIN votes v ON e.id = v.election_id
      LEFT JOIN ballots b ON e.id = b.election_id
      WHERE e.status = $1 
      AND (
          e.needs_approval = FALSE 
          OR e.needs_approval IS NULL
          OR EXISTS (
              SELECT 1 FROM users u 
              WHERE u.id = e.created_by 
              AND u.role_id = 1
          )
      )
      GROUP BY e.id, b.id
      ORDER BY e.date_from DESC
  `, [status]);
  
  return result.rows;
};

const getElectionStatistics = async () => {
  const result = await pool.query(`
    SELECT 
      status,
      COUNT(*) as count,
      SUM(voter_count) as total_voters,
      SUM(vote_count) as total_votes
    FROM (
      SELECT 
        e.id,
        e.status,
        COUNT(DISTINCT ev.id) as voter_count,
        COALESCE(COUNT(DISTINCT CASE WHEN v.id IS NOT NULL THEN CONCAT(v.student_id, '-', v.election_id) END), 0) as vote_count
      FROM elections e
      LEFT JOIN eligible_voters ev ON e.id = ev.election_id
      LEFT JOIN votes v ON e.id = v.election_id
      WHERE (
          e.needs_approval = FALSE 
          OR e.needs_approval IS NULL
          OR EXISTS (
              SELECT 1 FROM users u 
              WHERE u.id = e.created_by 
              AND u.role_id = 1
          )
      )
      GROUP BY e.id
    ) as stats
    GROUP BY status
  `);
  return result.rows;
};

const getEligibleVotersCount = async (eligible_voters) => {
  let query = `
      SELECT COUNT(*) 
      FROM students 
      WHERE is_active = TRUE
  `;
  
  const values = [];
  const conditions = [];
  
  if (eligible_voters.programs?.length) {
      conditions.push(`course_name = ANY($${values.length + 1})`);
      values.push(eligible_voters.programs);
  }
  if (eligible_voters.yearLevels?.length) {
      conditions.push(`year_level = ANY($${values.length + 1})`);
      values.push(eligible_voters.yearLevels);
  }
  if (eligible_voters.gender?.length) {
      conditions.push(`gender = ANY($${values.length + 1})`);
      values.push(eligible_voters.gender);
  }
  
  if (conditions.length) {
      query += ` AND ${conditions.join(' AND ')}`;
  }
  
  const result = await pool.query(query, values);
  return parseInt(result.rows[0].count, 10);
};

const createElection = async (electionData, userId, needsApproval = false) => {
  const client = await pool.connect();
  
  try {
      await client.query("BEGIN");

      // Check if user is superadmin
      const userCheck = await client.query(
          `SELECT role_id FROM users WHERE id = $1`,
          [userId]
      );

      const isSuperAdmin = userCheck.rows[0]?.role_id === 1;
      
      // Override needsApproval for superadmin and set status to approved
      if (isSuperAdmin) {
          needsApproval = false;
      }

      const duplicateCheck = await client.query(
          `SELECT id FROM elections 
           WHERE title = $1 
           AND (
               (date_from, date_to) OVERLAPS ($2::date, $3::date)
           )`,
          [electionData.title, electionData.dateFrom, electionData.dateTo]
      );

      if (duplicateCheck.rows.length > 0) {
          throw new Error("An election with this title and date range already exists");
      }

      const electionInsert = `
          INSERT INTO elections (
              title, 
              description, 
              date_from, 
              date_to, 
              start_time, 
              end_time, 
              election_type,
              created_by,
              needs_approval,
              status,
              approved_by,
              approved_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          RETURNING *;
      `;
      
      // Determine initial status based on dates and creator
      const now = new Date();
      const start = new Date(`${electionData.dateFrom}T${electionData.startTime}`);
      const end = new Date(`${electionData.dateTo}T${electionData.endTime}`);
      
      let initialStatus = 'draft';
      if (isSuperAdmin) {
          if (now < start) initialStatus = 'upcoming';
          else if (now >= start && now <= end) initialStatus = 'ongoing';
          else if (now > end) initialStatus = 'completed';
      }
      
      const electionResult = await client.query(electionInsert, [
          electionData.title,
          electionData.description,
          electionData.dateFrom,
          electionData.dateTo,
          electionData.startTime,
          electionData.endTime,
          electionData.electionType,
          userId,
          needsApproval,
          initialStatus,
          isSuperAdmin ? userId : null,  // Set approved_by for superadmin
          isSuperAdmin ? now : null      // Set approved_at for superadmin
      ]);
      
      const election = electionResult.rows[0];

      // Save precinct programs if provided
      if (electionData.eligibleVoters.precinct && electionData.eligibleVoters.precinct.length > 0 && 
          electionData.eligibleVoters.precinctPrograms) {
          
          for (const precinct of electionData.eligibleVoters.precinct) {
              const programs = electionData.eligibleVoters.precinctPrograms[precinct] || [];
              
              if (programs.length > 0) {
                  await client.query(
                      `INSERT INTO election_precinct_programs 
                       (election_id, precinct, programs) 
                       VALUES ($1, $2, $3)`,
                      [election.id, precinct, programs]
                  );
              }
          }
      }

      let studentQuery = `
          SELECT 
              id, 
              first_name, 
              last_name, 
              course_name, 
              year_level, 
              gender
          FROM students 
          WHERE is_active = TRUE
      `;
      
      const studentParams = [];
      const conditions = [];
      
      if (electionData.eligibleVoters.programs?.length) {
          conditions.push(`course_name = ANY($${studentParams.length + 1})`);
          studentParams.push(electionData.eligibleVoters.programs);
      }
      if (electionData.eligibleVoters.yearLevels?.length) {
          conditions.push(`year_level = ANY($${studentParams.length + 1})`);
          studentParams.push(electionData.eligibleVoters.yearLevels);
      }
      if (electionData.eligibleVoters.gender?.length) {
          conditions.push(`gender = ANY($${studentParams.length + 1})`);
          studentParams.push(electionData.eligibleVoters.gender);
      }
      
      if (conditions.length) {
          studentQuery += ` AND ${conditions.join(' AND ')}`;
      }
      
      const studentsResult = await client.query(studentQuery, studentParams);
      const students = studentsResult.rows;
      
      if (students.length === 0) {
          throw new Error("No eligible voters found with the selected criteria");
      }
    
      if (students.length > 0) {
          const voterInsert = `
              INSERT INTO eligible_voters (
                  election_id,
                  student_id,
                  first_name,
                  last_name,
                  course_name,
                  year_level,
                  gender,
                  semester,
                  precinct
              )
              VALUES ${students.map((_, i) => 
                  `($${i * 9 + 1}, $${i * 9 + 2}, $${i * 9 + 3}, $${i * 9 + 4}, 
                   $${i * 9 + 5}, $${i * 9 + 6}, $${i * 9 + 7}, 
                   $${i * 9 + 8}, $${i * 9 + 9})`
              ).join(", ")}
          `;
          
          const voterParams = students.flatMap(student => [
              election.id,
              student.id,
              student.first_name,
              student.last_name,
              student.course_name,
              student.year_level,
              student.gender,
              electionData.eligibleVoters.semester?.length ? electionData.eligibleVoters.semester[0] : null,
              electionData.eligibleVoters.precinct?.length ? electionData.eligibleVoters.precinct[0] : null
          ]);
          
          await client.query(voterInsert, voterParams);
      }
      
      await client.query("COMMIT");
      
      return {
          election,
          voters: students
      };
      
  } catch (error) {
      await client.query("ROLLBACK");
      throw error;
  } finally {
      client.release();
  }
};

const getAllElections = async () => {
  const result = await pool.query(`
      SELECT 
          e.*, 
          COUNT(ev.id) AS voter_count
      FROM elections e
      LEFT JOIN eligible_voters ev ON e.id = ev.election_id
      GROUP BY e.id
      ORDER BY e.created_at DESC;
  `);
  return result.rows;
};

const getElectionById = async (id) => {
  try {
    const electionQuery = `
      SELECT 
        e.*,
        u.first_name || ' ' || u.last_name as creator_name,
        CASE 
          WHEN e.approved_by IS NOT NULL THEN (
            SELECT first_name || ' ' || last_name 
            FROM users 
            WHERE id = e.approved_by
          )
          ELSE NULL
        END as approver_name
      FROM elections e
      LEFT JOIN users u ON e.created_by = u.id
      WHERE e.id = $1
    `;
    
    const electionResult = await pool.query(electionQuery, [id]);
    
    if (electionResult.rows.length === 0) {
      return null;
    }
    
    const election = electionResult.rows[0];
    
    // Get eligible voters criteria
    const criteriaQuery = `
      SELECT 
        ARRAY_AGG(DISTINCT course_name) as programs,
        ARRAY_AGG(DISTINCT year_level) as year_levels,
        ARRAY_AGG(DISTINCT gender) as genders
      FROM eligible_voters
      WHERE election_id = $1
    `;
    
    const criteriaResult = await pool.query(criteriaQuery, [id]);
    const criteria = criteriaResult.rows[0];
    
    // Get precinct programs
    const precinctProgramsQuery = `
      SELECT precinct, programs
      FROM election_precinct_programs
      WHERE election_id = $1
    `;
    
    const precinctProgramsResult = await pool.query(precinctProgramsQuery, [id]);
    
    // Convert precinct programs to the expected format
    const precinctPrograms = {};
    const precincts = [];
    
    precinctProgramsResult.rows.forEach(row => {
      precincts.push(row.precinct);
      precinctPrograms[row.precinct] = row.programs;
    });
    
    // Combine all eligible voter criteria
    const eligibleVoters = {
      programs: criteria?.programs || [],
      yearLevels: criteria?.year_levels || [],
      gender: criteria?.genders || [],
      precinct: precincts,
      precinctPrograms: precinctPrograms
    };
    
    return {
      ...election,
      eligible_voters: eligibleVoters
    };
  } catch (error) {
    console.error("Error in getElectionById:", error);
    throw error;
  }
};

const updateElection = async (id, updates) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Update basic election details
    let updateFields = [];
    let values = [];
    let paramCount = 1;
    
    const allowedFields = [
      'title', 'description', 'date_from', 'date_to', 
      'start_time', 'end_time', 'election_type', 'status'
    ];
    
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        updateFields.push(`${field} = $${paramCount}`);
        values.push(updates[field]);
        paramCount++;
      }
    });
    
    if (updateFields.length > 0) {
      values.push(id);
      const query = `
        UPDATE elections 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount} 
        RETURNING *
      `;
      
      const result = await client.query(query, values);
      
      if (result.rows.length === 0) {
        throw new Error("Election not found");
      }
    }
    
    // Handle precinct programs if provided
    if (updates.eligible_voters && updates.eligible_voters.precinct && 
        updates.eligible_voters.precinctPrograms) {
      
      // Delete existing precinct programs
      await client.query(
        'DELETE FROM election_precinct_programs WHERE election_id = $1',
        [id]
      );
      
      // Insert new precinct programs
      for (const precinct of updates.eligible_voters.precinct) {
        const programs = updates.eligible_voters.precinctPrograms[precinct] || [];
        
        if (programs.length > 0) {
          await client.query(
            `INSERT INTO election_precinct_programs 
             (election_id, precinct, programs) 
             VALUES ($1, $2, $3)`,
            [id, precinct, programs]
          );
        }
      }
    }
    
    await client.query('COMMIT');
    
    // Return the updated election with all details
    return await getElectionById(id);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const deleteElection = async (id) => {
  await pool.query("DELETE FROM elections WHERE id = $1;", [id]);
  return { message: "Election deleted successfully" };
};

const getElectionWithBallot = async (electionId) => {
  try {

    const electionResult = await pool.query(`
      SELECT 
        e.*,
        (SELECT COUNT(*) FROM eligible_voters WHERE election_id = e.id) AS voter_count,
        (SELECT COALESCE(COUNT(DISTINCT student_id), 0) FROM votes WHERE election_id = e.id) AS vote_count
      FROM elections e
      WHERE e.id = $1
    `, [electionId]);

    if (electionResult.rows.length === 0) {
      throw new Error('Election not found');
    }
    
    const election = electionResult.rows[0];

    const positionsResult = await pool.query(`
      SELECT 
        p.id,
        p.name,
        p.max_choices,
        p.display_order
      FROM positions p
      JOIN ballots b ON p.ballot_id = b.id
      WHERE b.election_id = $1
      ORDER BY p.display_order
    `, [electionId]);

    const positions = [];
    
    for (const position of positionsResult.rows) {

      const candidatesResult = await pool.query(`
        SELECT 
          c.id,
          c.first_name,
          c.last_name,
          c.party,
          c.image_url,
          c.slogan,
          c.platform,
          COALESCE((SELECT COUNT(DISTINCT student_id) FROM votes WHERE candidate_id = c.id AND position_id = $2), 0) AS vote_count,
          CASE 
            WHEN (SELECT COUNT(DISTINCT student_id) FROM votes WHERE position_id = $2) > 0 
            THEN ROUND(
              COALESCE((SELECT COUNT(DISTINCT student_id) FROM votes WHERE candidate_id = c.id AND position_id = $2), 0)::NUMERIC /
              (SELECT COUNT(DISTINCT student_id) FROM votes WHERE position_id = $2)::NUMERIC * 100
            )
            ELSE 0
          END AS percentage
        FROM candidates c
        WHERE c.position_id = $1
        ORDER BY vote_count DESC, c.last_name, c.first_name
      `, [position.id, position.id]);
      
      positions.push({
        id: position.id,
        name: position.name,
        max_choices: position.max_choices,
        candidates: candidatesResult.rows,
        total_votes: candidatesResult.rows.reduce((sum, candidate) => sum + parseInt(candidate.vote_count || 0), 0)
      });
    }

    election.positions = positions;
    
    return election;
  } catch (error) {
    console.error('Error in getElectionWithBallot:', error);
    throw error;
  }
};

async function updateElectionStatuses() {
  const client = await pool.connect();
  try {
    // Import Luxon DateTime at the top of the file
    const { DateTime } = require("luxon");
    const MANILA_TIMEZONE = "Asia/Manila";
    
    await client.query('BEGIN');
    console.log(`[MODEL-STATUS-UPDATE] Starting at ${DateTime.now().setZone(MANILA_TIMEZONE).toISO()}`);

    // Get current statuses of all elections
    const { rows: currentElections } = await client.query(`
      SELECT id, status, date_from, date_to, start_time, end_time, needs_approval, created_by FROM elections
      WHERE needs_approval = FALSE 
      OR EXISTS (
        SELECT 1 FROM users u 
        WHERE u.id = elections.created_by 
        AND u.role_id = 1
      )
    `);

    const currentStatusMap = {};
    currentElections.forEach(election => {
      currentStatusMap[election.id] = election.status;
    });

    const now = DateTime.now().setZone(MANILA_TIMEZONE);
    console.log(`[MODEL-STATUS-UPDATE] Current Manila time: ${now.toISO()}`);
    
    const statusChanges = [];
    
    // Process each election individually with proper timezone handling
    for (const election of currentElections) {
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
      
      if (election.needs_approval === true && 
          !await isSuperAdmin(election.created_by)) {
        newStatus = 'pending';
      } else if (now < startDateTime) {
        newStatus = 'upcoming';
      } else if (now >= startDateTime && now <= endDateTime) {
        newStatus = 'ongoing';
      } else if (now > endDateTime) {
        newStatus = 'completed';
      }
      
      if (newStatus !== election.status) {
        // Update the election status in the database
        await client.query(
          `UPDATE elections SET status = $1, last_status_update = NOW() WHERE id = $2`,
          [newStatus, election.id]
        );
        
        statusChanges.push({
          id: election.id,
          oldStatus: election.status,
          newStatus: newStatus
        });
        
        console.log(`[MODEL-STATUS-UPDATE] Election ${election.id}: ${election.status} → ${newStatus}`);
      }
    }
    
    await client.query('COMMIT');
    return { 
      updated: statusChanges.length,
      statusChanges
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating election statuses:', error);
    throw new Error('Failed to update election statuses');
  } finally {
    client.release();
  }
}

// Helper function to check if a user is a superadmin
async function isSuperAdmin(userId) {
  if (!userId) return false;
  
  const { rows } = await pool.query(
    'SELECT 1 FROM users WHERE id = $1 AND role_id = 1',
    [userId]
  );
  
  return rows.length > 0;
}
const approveElection = async (electionId, superAdminId) => {
  const query = `
    UPDATE elections 
    SET needs_approval = FALSE, 
        approved_by = $1, 
        approved_at = NOW() 
    WHERE id = $2 
    RETURNING *
  `;
  
  const result = await pool.query(query, [superAdminId, electionId]);
  return result.rows[0];
};

const rejectElection = async (electionId) => {

  const query = `DELETE FROM elections WHERE id = $1`;
  await pool.query(query, [electionId]);
  return { message: "Election rejected and deleted" };
};

const getPendingApprovalElections = async (adminId = null) => {
  let query = `
    SELECT 
      e.*, 
      COUNT(DISTINCT ev.id) AS voter_count,
      COALESCE(COUNT(DISTINCT CASE WHEN v.id IS NOT NULL THEN CONCAT(v.student_id, '-', v.election_id) END), 0) AS vote_count,
      EXISTS (
          SELECT 1 FROM ballots b 
          JOIN positions p ON b.id = p.ballot_id
          WHERE b.election_id = e.id
          LIMIT 1
      ) AS ballot_exists
    FROM elections e
    LEFT JOIN eligible_voters ev ON e.id = ev.election_id
    LEFT JOIN votes v ON e.id = v.election_id
    WHERE e.needs_approval = TRUE
    AND NOT EXISTS (
        SELECT 1 FROM users u 
        WHERE u.id = e.created_by 
        AND u.role_id = 1
    )
  `;
  
  const params = [];
  
  if (adminId) {
    query += ` AND e.created_by = $1`;
    params.push(adminId);
  }
  
  query += ` GROUP BY e.id ORDER BY e.created_at DESC`;
  
  const result = await pool.query(query, params);
  return result.rows;
};

const getAllElectionsWithCreator = async () => {
  try {
    const query = `
      SELECT e.*, 
             a.name as admin_name, 
             a.department as admin_department,
             a.id as admin_id
      FROM elections e
      LEFT JOIN admins a ON e.created_by = a.id
      ORDER BY e.date_from DESC
    `;
    const result = await pool.query(query);
    
    return result.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      date_from: row.date_from,
      date_to: row.date_to,
      start_time: row.start_time,
      end_time: row.end_time,
      status: getElectionStatus(row.date_from, row.date_to, row.start_time, row.end_time, row.needs_approval),
      needs_approval: row.needs_approval,
      election_type: row.election_type,
      created_by: row.admin_id ? {
        id: row.admin_id,
        name: row.admin_name,
        department: row.admin_department
      } : null
    }));
  } catch (error) {
    console.error('Error in getAllElectionsWithCreator:', error);
    throw error;
  }
};

/**
 * Get eligible students based on eligibility criteria
 * @param {Object} criteria - Eligibility criteria
 * @returns {Promise<Array>} List of eligible students
 */
const getEligibleStudentsForCriteria = async (criteria) => {
  try {
    let studentQuery = `
      SELECT 
        id, 
        first_name, 
        last_name, 
        course_name, 
        year_level, 
        gender
      FROM students 
      WHERE is_active = TRUE
    `;
    
    const studentParams = [];
    const conditions = [];
    
    if (criteria.programs?.length) {
      conditions.push(`course_name = ANY($${studentParams.length + 1})`);
      studentParams.push(criteria.programs);
    }
    
    if (criteria.yearLevels?.length) {
      conditions.push(`year_level = ANY($${studentParams.length + 1})`);
      studentParams.push(criteria.yearLevels);
    }
    
    if (criteria.gender?.length) {
      conditions.push(`gender = ANY($${studentParams.length + 1})`);
      studentParams.push(criteria.gender);
    }
    
    if (conditions.length) {
      studentQuery += ` AND ${conditions.join(' AND ')}`;
    }
    
    const studentsResult = await pool.query(studentQuery, studentParams);
    return studentsResult.rows;
  } catch (error) {
    console.error("Error in getEligibleStudentsForCriteria:", error);
    throw error;
  }
};

/**
 
 * @param {Number} electionId 
 * @param {Array} students 
 * @param {Object} criteria 
 * @returns {Promise<Object>} 
 */
const updateEligibleVoters = async (electionId, students, criteria) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    await client.query('DELETE FROM eligible_voters WHERE election_id = $1', [electionId]);

    if (students.length > 0) {
      const voterInsert = `
        INSERT INTO eligible_voters (
          election_id,
          student_id,
          first_name,
          last_name,
          course_name,
          year_level,
          gender,
          semester,
          precinct
        )
        VALUES ${students.map((_, i) => 
          `($${i * 9 + 1}, $${i * 9 + 2}, $${i * 9 + 3}, $${i * 9 + 4}, 
           $${i * 9 + 5}, $${i * 9 + 6}, $${i * 9 + 7}, 
           $${i * 9 + 8}, $${i * 9 + 9})`
        ).join(", ")}
      `;
      
      const voterParams = students.flatMap(student => [
        electionId,
        student.id,
        student.first_name,
        student.last_name,
        student.course_name,
        student.year_level,
        student.gender,
        criteria.semester?.length ? criteria.semester[0] : null,
        criteria.precinct?.length ? criteria.precinct[0] : null
      ]);
      
      await client.query(voterInsert, voterParams);
    }
    
    await client.query('COMMIT');
    
    return { 
      success: true, 
      message: "Eligible voters updated successfully",
      voterCount: students.length
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error in updateEligibleVoters:", error);
    throw error;
  } finally {
    client.release();
  }
};

module.exports = { 
  createElection, 
  getAllElections, 
  getElectionById, 
  updateElection, 
  deleteElection, 
  getEligibleVotersCount, 
  getElectionStatistics, 
  getElectionsByStatus,
  getElectionWithBallot, 
  updateElectionStatuses, 
  getElectionStatus,
  getDisplayStatus,
  approveElection,
  rejectElection,
  getPendingApprovalElections,
  getAllElectionsWithCreator,
  getEligibleStudentsForCriteria,
  updateEligibleVoters
};