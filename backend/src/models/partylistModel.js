const pool = require('../config/db');


const createPartylist = async (partylistData) => {
  const client = await pool.connect();
  try {
    console.log('Model: Beginning transaction...');
    await client.query('BEGIN');

    let logoUrl = null;
    if (partylistData.logo) {
      console.log('Model: Processing logo file:', partylistData.logo.filename);
      logoUrl = `/uploads/partylists/${partylistData.logo.filename}`;
    }

    console.log('Model: Inserting partylist data:', {
      name: partylistData.name,
      hasSlogan: !!partylistData.slogan,
      hasAdvocacy: !!partylistData.advocacy,
      logoUrl
    });

    try {
      const result = await client.query(
        `INSERT INTO partylists (
          name, slogan, advocacy, logo_url
        ) VALUES ($1, $2, $3, $4)
        RETURNING *`,
        [
          partylistData.name,
          partylistData.slogan,
          partylistData.advocacy,
          logoUrl
        ]
      );

      console.log('Model: Insert successful, committing transaction...');
      await client.query('COMMIT');
      return result.rows[0];
    } catch (insertError) {
      console.error('Model: Insert failed:', insertError.message);
      
      // Check if table exists
      try {
        const tableCheck = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'partylists'
          );
        `);
        
        if (!tableCheck.rows[0].exists) {
          console.log('Model: Partylists table does not exist, creating...');
          await client.query(`
            CREATE TABLE IF NOT EXISTS partylists (
              id SERIAL PRIMARY KEY,
              name VARCHAR(100) NOT NULL,
              slogan TEXT,
              advocacy TEXT,
              logo_url TEXT,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
              is_active BOOLEAN DEFAULT TRUE
            );
          `);
          
          // Try insert again after creating table
          const result = await client.query(
            `INSERT INTO partylists (
              name, slogan, advocacy, logo_url
            ) VALUES ($1, $2, $3, $4)
            RETURNING *`,
            [
              partylistData.name,
              partylistData.slogan,
              partylistData.advocacy,
              logoUrl
            ]
          );
          
          console.log('Model: Insert successful after creating table, committing...');
          await client.query('COMMIT');
          return result.rows[0];
        } else {
          console.error('Model: Table exists but insert still failed');
          throw insertError;
        }
      } catch (tableError) {
        console.error('Model: Error checking/creating table:', tableError.message);
        throw tableError;
      }
    }
  } catch (error) {
    console.error('Model: Transaction failed, rolling back:', error.message);
    await client.query('ROLLBACK');
    throw error;
  } finally {
    console.log('Model: Releasing client...');
    client.release();
  }
};

const getAllPartylists = async () => {
  const result = await pool.query(`
    SELECT 
      id, name, slogan, advocacy, logo_url, created_at, updated_at
    FROM partylists
    WHERE is_active = TRUE
    ORDER BY name ASC
  `);
  return result.rows;
};

const getPartylistById = async (id) => {
  const partylist = await pool.query(`
    SELECT 
      id, name, slogan, advocacy, logo_url, created_at, updated_at
    FROM partylists
    WHERE id = $1 AND is_active = TRUE
  `, [id]);

  if (partylist.rows.length === 0) {
    return null;
  }

  const candidates = await pool.query(`
    SELECT 
      pc.id as candidate_id,
      pc.position,
      s.id as student_id,
      s.first_name,
      s.last_name,
      s.course_name,
      s.year_level
    FROM partylist_candidates pc
    JOIN students s ON pc.student_id = s.id
    WHERE pc.partylist_id = $1
    ORDER BY pc.position ASC
  `, [id]);

  return {
    ...partylist.rows[0],
    candidates: candidates.rows || []
  };
};


const updatePartylist = async (id, updates) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let logoUrl = null;
    if (updates.logo) {
      logoUrl = `/uploads/partylists/${updates.logo.filename}`;
    }

    const result = await client.query(
      `UPDATE partylists
       SET name = COALESCE($1, name),
           slogan = COALESCE($2, slogan),
           advocacy = COALESCE($3, advocacy),
           logo_url = COALESCE($4, logo_url)
       WHERE id = $5 AND is_active = TRUE
       RETURNING *`,
      [
        updates.name,
        updates.slogan,
        updates.advocacy,
        logoUrl,
        id
      ]
    );

    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const archivePartylist = async (id) => {
  const result = await pool.query(
    `UPDATE partylists
     SET is_active = FALSE
     WHERE id = $1 AND is_active = TRUE
     RETURNING *`,
    [id]
  );
  return result.rows[0];
};

const restorePartylist = async (id) => {
  const result = await pool.query(
    `UPDATE partylists
     SET is_active = TRUE
     WHERE id = $1 AND is_active = FALSE
     RETURNING *`,
    [id]
  );
  return result.rows[0];
};

const getArchivedPartylists = async () => {
  const result = await pool.query(`
    SELECT 
      id, name, slogan, advocacy, logo_url, created_at, updated_at
    FROM partylists
    WHERE is_active = FALSE
    ORDER BY name ASC
  `);
  return result.rows;
};

const permanentDeletePartylist = async (id) => {
  // First check if there are any associations in partylist_candidates
  const candidatesCheck = await pool.query(
    `SELECT EXISTS (
      SELECT 1 FROM partylist_candidates 
      WHERE partylist_id = $1
    )`,
    [id]
  );

  // If there are associated candidates, delete them first
  if (candidatesCheck.rows[0].exists) {
    await pool.query(
      `DELETE FROM partylist_candidates 
       WHERE partylist_id = $1`,
      [id]
    );
  }

  // Now delete the partylist
  const result = await pool.query(
    `DELETE FROM partylists
     WHERE id = $1
     RETURNING id`,
    [id]
  );
  
  return result.rows[0];
};

// Rename the previous deletePartylist function to make it clear it's archiving
const deletePartylist = archivePartylist;

const addPartylistCandidate = async (partylistId, studentId, position) => {
  const result = await pool.query(
    `INSERT INTO partylist_candidates (
      partylist_id, student_id, position
    ) VALUES ($1, $2, $3)
    RETURNING *`,
    [partylistId, studentId, position]
  );
  return result.rows[0];
};


const removePartylistCandidate = async (partylistId, studentId) => {
  const result = await pool.query(
    `DELETE FROM partylist_candidates
     WHERE partylist_id = $1 AND student_id = $2
     RETURNING *`,
    [partylistId, studentId]
  );
  return result.rows[0];
};

module.exports = {
  createPartylist,
  getAllPartylists,
  getPartylistById,
  updatePartylist,
  deletePartylist,
  archivePartylist,
  restorePartylist,
  getArchivedPartylists,
  permanentDeletePartylist,
  addPartylistCandidate,
  removePartylistCandidate
}; 