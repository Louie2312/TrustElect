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
      WHERE e.status = $1 AND (e.needs_approval = FALSE OR e.needs_approval IS NULL)
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
      WHERE (e.needs_approval = FALSE OR e.needs_approval IS NULL)
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
              needs_approval
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING *;
      `;
      
      const electionResult = await client.query(electionInsert, [
          electionData.title,
          electionData.description,
          electionData.dateFrom,
          electionData.dateTo,
          electionData.startTime,
          electionData.endTime,
          electionData.electionType,
          userId,
          needsApproval
      ]);
      
      const election = electionResult.rows[0];

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
  const result = await pool.query(`
    SELECT 
      e.*,
      (SELECT COUNT(*) FROM eligible_voters WHERE election_id = e.id) AS voter_count,
      (SELECT COALESCE(COUNT(DISTINCT student_id), 0) FROM votes WHERE election_id = e.id) AS vote_count,
      (SELECT JSON_BUILD_OBJECT(
        'id', b.id,
        'positions', (
          SELECT JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', p.id,
              'name', p.name,
              'max_choices', p.max_choices
            )
          )
          FROM positions p
          WHERE p.ballot_id = b.id
        )
      )
      FROM ballots b
      WHERE b.election_id = e.id
      LIMIT 1) AS ballot
    FROM elections e
    WHERE e.id = $1
  `, [id]);
  
  return result.rows[0];
};

const updateElection = async (id, updates) => {
  const fields = Object.keys(updates);
  const values = Object.values(updates);

  if (fields.length === 0) return null;

  const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(", ");
  const query = `UPDATE elections SET ${setClause} WHERE id = $${fields.length + 1} RETURNING *;`;

  const result = await pool.query(query, [...values, id]);
  return result.rows[0];
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

    const { rows: currentElections } = await client.query(`
      SELECT id, status FROM elections
      WHERE needs_approval = FALSE
    `);

    const currentStatusMap = {};
    currentElections.forEach(election => {
      currentStatusMap[election.id] = election.status;
    });

    const result = await client.query(`
      UPDATE elections
      SET status = 
        CASE
          WHEN needs_approval = TRUE THEN 'pending'
          WHEN CURRENT_TIMESTAMP BETWEEN (date_from::date + start_time::time) AND (date_to::date + end_time::time) THEN 'ongoing'
          WHEN CURRENT_TIMESTAMP < (date_from::date + start_time::time) THEN 'upcoming'
          WHEN CURRENT_TIMESTAMP > (date_to::date + end_time::time) THEN 'completed'
          ELSE status
        END
      WHERE needs_approval = FALSE
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


