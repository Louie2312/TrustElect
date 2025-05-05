const pool = require("../config/db");

const getAllItems = async (tableName) => {
  const result = await pool.query(
    `SELECT id, name FROM ${tableName} ORDER BY name`
  );
  return result.rows;
};

// Special version for partylists that includes more fields
const getAllPartylists = async () => {
  const result = await pool.query(
    `SELECT id, name, slogan, advocacy, logo_url, created_at 
     FROM partylists 
     WHERE is_active = true 
     ORDER BY name`
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

// Get the current semester from settings
const getCurrentSemester = async () => {
  try {
    // Check if the settings table exists first
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'settings'
      );
    `);
    
    // If settings table doesn't exist, create it
    if (!tableCheck.rows[0].exists) {
      await pool.query(`
        CREATE TABLE settings (
          key VARCHAR(50) PRIMARY KEY,
          value TEXT NOT NULL
        )
      `);
    }
    
    // Get current semester ID from settings
    const result = await pool.query(
      `SELECT value FROM settings WHERE key = 'current_semester'`
    );
    
    if (result.rows.length === 0) {
      return null; // No current semester set
    }
    
    const semesterId = result.rows[0].value;
    
    // Get the semester details
    const semesterResult = await pool.query(
      `SELECT id, name FROM semesters WHERE id = $1`,
      [semesterId]
    );
    
    if (semesterResult.rows.length === 0) {
      // Clean up invalid reference
      await pool.query(
        `DELETE FROM settings WHERE key = 'current_semester'`
      );
      return null;
    }
    
    return semesterResult.rows[0];
  } catch (error) {
    console.error('Error getting current semester:', error);
    return null;
  }
};


const setCurrentSemester = async (semesterId) => {
  
  const semesterCheck = await pool.query(
    `SELECT id FROM semesters WHERE id = $1`,
    [semesterId]
  );
  
  if (semesterCheck.rows.length === 0) {
    throw new Error('Semester not found');
  }
 
  await pool.query(`
    INSERT INTO settings (key, value)
    VALUES ('current_semester', $1)
    ON CONFLICT (key) 
    DO UPDATE SET value = $1
  `, [semesterId]);
  
  return getCurrentSemester();
};

// Special version for creating partylists
const createPartylistItem = async (name) => {
  const result = await pool.query(
    `INSERT INTO partylists (name) VALUES ($1) RETURNING id, name, slogan, advocacy, logo_url`,
    [name]
  );
  return result.rows[0];
};

const API_ENDPOINTS = {
  programs: "programs",
  "election-types": "election_types",
  "year-levels": "year_levels",
  genders: "genders",
  semesters: "semesters",
  precincts: "precincts",
  partylists: "partylists"
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
  deletePrecinct: (id) => deleteItem('precincts', id),

  getPartylists: () => getAllPartylists(),
  createPartylist: (name) => createPartylistItem(name),
  updatePartylist: (id, name) => updateItem('partylists', id, name),
  deletePartylist: (id) => deleteItem('partylists', id),
  
  getCurrentSemester,
  setCurrentSemester
};