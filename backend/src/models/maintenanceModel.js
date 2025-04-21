const pool = require("../config/db");

const getAllItems = async (tableName) => {
  const result = await pool.query(
    `SELECT id, name FROM ${tableName} ORDER BY name`
  );
  return result.rows;
};

const createItem = async (tableName, name) => {
  const result = await pool.query(
    `INSERT INTO ${tableName} (name) VALUES ($1) RETURNING id, name`,
    [name]
  );
  return result.rows[0];
};

const updateItem = async (tableName, id, newName) => {
  const result = await pool.query(
    `UPDATE ${tableName} SET name = $1 WHERE id = $2 RETURNING id, name`,
    [newName, id]
  );
  return result.rows[0];
};

const deleteItem = async (tableName, id) => {
  if (tableName === 'programs') {
    const inUse = await pool.query(
      `SELECT 1 FROM students WHERE course_name = $1 LIMIT 1`,
      [id]
    );
    if (inUse.rows.length > 0) {
      throw new Error('Cannot delete program that has students assigned');
    }
  }

  const result = await pool.query(
    `DELETE FROM ${tableName} WHERE id = $1 RETURNING id, name`,
    [id]
  );
  
  if (result.rows.length === 0) {
    throw new Error('Item not found');
  }
  
  return result.rows[0];
};

module.exports = {
  getPrograms: () => getAllItems('programs'),
  createProgram: (name) => createItem('programs', name),
  updateProgram: (id, name) => updateItem('programs', id, name),
  deleteProgram: (id) => deleteItem('programs', id),

  getElectionTypes: () => getAllItems('election_types'),
  createElectionType: (name) => createItem('election_types', name),
  updateElectionType: (id, name) => updateItem('election_types', id, name),
  deleteElectionType: (id) => deleteItem('election_types', id),

  getYearLevels: () => getAllItems('year_levels'),
  createYearLevel: (name) => createItem('year_levels', name),
  updateYearLevel: (id, name) => updateItem('year_levels', id, name),
  deleteYearLevel: (id) => deleteItem('year_levels', id),

  getGenders: () => getAllItems('genders'),
  createGender: (name) => createItem('genders', name),
  updateGender: (id, name) => updateItem('genders', id, name),
  deleteGender: (id) => deleteItem('genders', id),

  getSemesters: () => getAllItems('semesters'),
  createSemester: (name) => createItem('semesters', name),
  updateSemester: (id, name) => updateItem('semesters', id, name),
  deleteSemester: (id) => deleteItem('semesters', id),

  getPrecincts: () => getAllItems('precincts'),
  createPrecinct: (name) => createItem('precincts', name),
  updatePrecinct: (id, name) => updateItem('precincts', id, name),
  deletePrecinct: (id) => deleteItem('precincts', id)
};