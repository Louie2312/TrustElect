const pool = require("../config/db");

const getPositionsForElectionType = async (electionTypeId) => {

  const typeId = parseInt(electionTypeId);
  
  if (isNaN(typeId)) {
    throw new Error("Invalid election type ID format");
  }
  
  const result = await pool.query(
    `SELECT id, name, election_type_id, created_at, updated_at
     FROM election_positions
     WHERE election_type_id = $1
     ORDER BY name`,
    [typeId]
  );
  return result.rows;
};

const getAllPositions = async () => {
  const result = await pool.query(
    `SELECT p.id, p.name, p.election_type_id, p.created_at, p.updated_at, et.name as election_type_name
     FROM election_positions p
     JOIN election_types et ON p.election_type_id = et.id
     ORDER BY et.name, p.name`
  );
  return result.rows;
};

const getPositionById = async (id) => {

  const positionId = parseInt(id);
  
  if (isNaN(positionId)) {
    throw new Error("Invalid position ID format");
  }
  
  const result = await pool.query(
    `SELECT id, name, election_type_id, created_at, updated_at
     FROM election_positions
     WHERE id = $1`,
    [positionId]
  );
  return result.rows[0];
};

const createPosition = async (name, electionTypeId) => {

  const typeId = parseInt(electionTypeId);
  
  if (isNaN(typeId)) {
    throw new Error("Invalid election type ID format");
  }

  const existingPosition = await pool.query(
    `SELECT id FROM election_positions 
     WHERE LOWER(name) = LOWER($1) AND election_type_id = $2`,
    [name, typeId]
  );

  if (existingPosition.rows.length > 0) {
    throw new Error('A position with this name already exists for this election type');
  }

  const result = await pool.query(
    `INSERT INTO election_positions (name, election_type_id)
     VALUES ($1, $2)
     RETURNING id, name, election_type_id, created_at, updated_at`,
    [name, typeId]
  );
  return result.rows[0];
};

const updatePosition = async (id, name) => {
  const positionId = parseInt(id);
  
  if (isNaN(positionId)) {
    throw new Error("Invalid position ID format");
  }

  const currentPosition = await getPositionById(positionId);
  if (!currentPosition) {
    throw new Error('Position not found');
  }

  const existingPosition = await pool.query(
    `SELECT id FROM election_positions 
     WHERE LOWER(name) = LOWER($1) AND election_type_id = $2 AND id != $3`,
    [name, currentPosition.election_type_id, positionId]
  );

  if (existingPosition.rows.length > 0) {
    throw new Error('A position with this name already exists for this election type');
  }

  const result = await pool.query(
    `UPDATE election_positions
     SET name = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING id, name, election_type_id, created_at, updated_at`,
    [name, positionId]
  );
  return result.rows[0];
};

const deletePosition = async (id) => {

  const positionId = parseInt(id);
  
  if (isNaN(positionId)) {
    throw new Error("Invalid position ID format");
  }

  const inUse = await pool.query(
    `SELECT 1 FROM candidates WHERE position_id = $1 LIMIT 1`,
    [positionId]
  );
  
  if (inUse.rows.length > 0) {
    throw new Error('Cannot delete a position that has candidates assigned');
  }

  const result = await pool.query(
    `DELETE FROM election_positions
     WHERE id = $1
     RETURNING id`,
    [positionId]
  );
  
  if (result.rows.length === 0) {
    throw new Error('Position not found');
  }
  
  return { id: result.rows[0].id, message: 'Position deleted successfully' };
};

module.exports = {
  getPositionsForElectionType,
  getAllPositions,
  getPositionById,
  createPosition,
  updatePosition,
  deletePosition
}; 