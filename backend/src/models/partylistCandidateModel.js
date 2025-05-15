const pool = require("../config/db");

const addCandidate = async (partylistId, candidateData) => {
  const { studentId, firstName, lastName, studentNumber, course, position, isRepresentative } = candidateData;
  
  const query = `
    INSERT INTO partylist_candidates (
      partylist_id, student_id, first_name, last_name, 
      student_number, course, position, is_representative
    ) 
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
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
    isRepresentative || false
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
  const { position, isRepresentative } = candidateData;
  
  const query = `
    UPDATE partylist_candidates
    SET 
      position = $1,
      is_representative = $2,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $3
    RETURNING *
  `;
  
  const values = [
    position || null,
    isRepresentative || false,
    candidateId
  ];
  
  const result = await pool.query(query, values);
  return result.rows[0];
};

module.exports = {
  addCandidate,
  getCandidatesByPartylist,
  removeCandidate,
  updateCandidate
}; 