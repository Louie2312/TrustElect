const pool = require("../config/db");

const addCandidate = async (partylistId, candidateData) => {
  const { studentId, firstName, lastName, studentNumber, course, position, isRepresentative, imageUrl } = candidateData;
  
  const query = `
    INSERT INTO partylist_candidates (
      partylist_id, student_id, first_name, last_name, 
      student_number, course, position, is_representative, image_url
    ) 
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `;
  
  const values = [
    partylistId, 
    studentId || null, 
    firstName, 
    lastName, 
    studentNumber, 
    course, 
    position || null, 
    isRepresentative || false,
    imageUrl || null
  ];
  
  const result = await pool.query(query, values);
  return result.rows[0];
};

const getCandidatesByPartylist = async (partylistId) => {
  const query = `
    SELECT * FROM partylist_candidates
    WHERE partylist_id = $1
    ORDER BY 
      CASE WHEN is_representative = true THEN 1 ELSE 0 END,
      position,
      last_name,
      first_name
  `;
  
  const result = await pool.query(query, [partylistId]);
  return result.rows;
};

const removeCandidate = async (candidateId) => {
  const query = `
    DELETE FROM partylist_candidates
    WHERE id = $1
    RETURNING *
  `;
  
  const result = await pool.query(query, [candidateId]);
  return result.rows[0];
};

const updateCandidate = async (candidateId, candidateData) => {
  const { position, isRepresentative, imageUrl } = candidateData;
  
  // Build dynamic query based on provided fields
  let query = `UPDATE partylist_candidates SET updated_at = CURRENT_TIMESTAMP`;
  const values = [];
  let paramCount = 0;
  
  if (position !== undefined) {
    paramCount++;
    query += `, position = $${paramCount}`;
    values.push(position);
  }
  
  if (isRepresentative !== undefined) {
    paramCount++;
    query += `, is_representative = $${paramCount}`;
    values.push(isRepresentative);
  }
  
  if (imageUrl !== undefined) {
    paramCount++;
    query += `, image_url = $${paramCount}`;
    values.push(imageUrl);
  }
  
  paramCount++;
  query += ` WHERE id = $${paramCount} RETURNING *`;
  values.push(candidateId);
  
  const result = await pool.query(query, values);
  return result.rows[0];
};

const getStudentPartylist = async (studentNumber) => {
  const query = `
    SELECT 
      pc.*,
      p.id as partylist_id,
      p.name as partylist_name,
      p.slogan,
      p.advocacy,
      p.logo_url
    FROM partylist_candidates pc
    JOIN partylists p ON pc.partylist_id = p.id
    WHERE pc.student_number = $1 AND p.is_active = true
    LIMIT 1
  `;
  
  const result = await pool.query(query, [studentNumber]);
  return result.rows[0];
};

module.exports = {
  addCandidate,
  getCandidatesByPartylist,
  removeCandidate,
  updateCandidate,
  getStudentPartylist
}; 