const pool = require("../config/db");

const getElectionStatus = (date_from, date_to, start_time, end_time, needs_approval = false) => {

  if (needs_approval === true) {
    return 'pending';
  }
  
  if (!date_from || !date_to || !start_time || !end_time) {
    return 'draft';
  }
  
  const now = new Date();
  const start = new Date(`${date_from}T${start_time}`);
  const end = new Date(`${date_to}T${end_time}`);
  
  if (now < start) return "upcoming";
  if (now >= start && now <= end) return "ongoing";
  return "completed";
};


const getDisplayStatus = getElectionStatus;

const getElectionsByStatus = async (status, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  
  // First get just the election IDs with pagination
  const electionIdsQuery = `
    SELECT e.id
    FROM elections e
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
    ORDER BY e.date_from DESC
    LIMIT $2 OFFSET $3
  `;
  
  const electionIdsResult = await pool.query(electionIdsQuery, [status, limit, offset]);
  const electionIds = electionIdsResult.rows.map(row => row.id);
  
  if (electionIds.length === 0) {
    return [];
  }
  
  // Then get the full election data for just those IDs using more efficient subqueries
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
        (SELECT COUNT(*) FROM eligible_voters ev WHERE ev.election_id = e.id) AS voter_count,
        (SELECT COUNT(DISTINCT student_id) FROM votes v WHERE v.election_id = e.id) AS vote_count,
        EXISTS (
            SELECT 1 FROM ballots b 
            JOIN positions p ON b.id = p.ballot_id
            WHERE b.election_id = e.id
            LIMIT 1
        ) AS ballot_exists
    FROM elections e
    WHERE e.id = ANY($1)
    ORDER BY e.date_from DESC
  `, [electionIds]);
  
  return result.rows;
};

// Simple in-memory cache for election statistics
const statsCache = {
  data: null,
  timestamp: 0,
  TTL: 5 * 60 * 1000 // 5 minutes cache TTL
};

const getElectionStatistics = async () => {
  // Check if we have valid cached data
  const now = Date.now();
  if (statsCache.data && (now - statsCache.timestamp < statsCache.TTL)) {
    return statsCache.data;
  }
  
  
  // Use more efficient queries with subqueries instead of multiple joins
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
        (SELECT COUNT(*) FROM eligible_voters ev WHERE ev.election_id = e.id) as voter_count,
        (SELECT COUNT(DISTINCT student_id) FROM votes v WHERE v.election_id = e.id) as vote_count
      FROM elections e
      WHERE (
          e.needs_approval = FALSE 
          OR e.needs_approval IS NULL
          OR EXISTS (
              SELECT 1 FROM users u 
              WHERE u.id = e.created_by 
              AND u.role_id = 1
          )
      )
    ) as stats
    GROUP BY status
  `);
  
  // Update the cache
  statsCache.data = result.rows;
  statsCache.timestamp = now;
  
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
    await client.query('BEGIN');

    // Get current statuses of all elections
    const { rows: currentElections } = await client.query(`
      SELECT id, status FROM elections
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

    // Update statuses for all elections that don't need approval or are created by superadmin
    const result = await client.query(`
      UPDATE elections
      SET status = 
        CASE
          WHEN needs_approval = TRUE AND NOT EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = elections.created_by 
            AND u.role_id = 1
          ) THEN 'pending'
          WHEN CURRENT_TIMESTAMP BETWEEN (date_from::date + start_time::time) AND (date_to::date + end_time::time) THEN 'ongoing'
          WHEN CURRENT_TIMESTAMP < (date_from::date + start_time::time) THEN 'upcoming'
          WHEN CURRENT_TIMESTAMP > (date_to::date + end_time::time) THEN 'completed'
          ELSE status
        END
      WHERE needs_approval = FALSE 
      OR EXISTS (
        SELECT 1 FROM users u 
        WHERE u.id = elections.created_by 
        AND u.role_id = 1
      )
      RETURNING id, status;
    `);

    const statusChanges = [];
    for (const updatedElection of result.rows) {
      const oldStatus = currentStatusMap[updatedElection.id];
      if (oldStatus && oldStatus !== updatedElection.status) {
        statusChanges.push({
          id: updatedElection.id,
          oldStatus: oldStatus,
          newStatus: updatedElection.status
        });
      }
    }
    
    await client.query('COMMIT');
    return { 
      updated: result.rowCount,
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

// Laboratory precinct functions
const createElectionLaboratoryPrecincts = async (electionId, laboratoryPrecincts) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Clear existing laboratory precincts for this election
    await client.query(
      'DELETE FROM election_laboratory_precincts WHERE election_id = $1',
      [electionId]
    );
    
    // Insert new laboratory precincts
    for (const labPrecinct of laboratoryPrecincts) {
      if (labPrecinct.assignedCourses && labPrecinct.assignedCourses.length > 0) {
        await client.query(
          `INSERT INTO election_laboratory_precincts 
           (election_id, laboratory_precinct_id, assigned_courses) 
           VALUES ($1, $2, $3)`,
          [electionId, labPrecinct.laboratoryPrecinctId, labPrecinct.assignedCourses]
        );
      }
    }
    
    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const assignStudentsToLaboratoryPrecincts = async (electionId, laboratoryPrecincts) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get all eligible voters for this election
    const eligibleVoters = await client.query(
      'SELECT * FROM eligible_voters WHERE election_id = $1',
      [electionId]
    );
    
    // Assign each student to appropriate laboratory precinct
    for (const voter of eligibleVoters.rows) {
      for (const labPrecinct of laboratoryPrecincts) {
        if (labPrecinct.assignedCourses.includes(voter.course_name)) {
          // Get the election_laboratory_precinct_id
          const elpResult = await client.query(
            'SELECT id FROM election_laboratory_precincts WHERE election_id = $1 AND laboratory_precinct_id = $2',
            [electionId, labPrecinct.laboratoryPrecinctId]
          );
          
          if (elpResult.rows.length > 0) {
            // Update eligible_voters with laboratory assignment
            await client.query(
              'UPDATE eligible_voters SET election_laboratory_precinct_id = $1 WHERE id = $2',
              [elpResult.rows[0].id, voter.id]
            );
            break; // Student assigned to first matching lab
          }
        }
      }
    }
    
    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
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
  updateEligibleVoters,
  createElectionLaboratoryPrecincts,
  assignStudentsToLaboratoryPrecincts
};