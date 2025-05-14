const pool = require("../config/db");


const publishBallot = async (ballotId) => {
  const { rows: [ballot] } = await pool.query(
    `UPDATE ballots 
     SET status = 'published', published_at = NOW() 
     WHERE id = $1 
     RETURNING *`,
    [ballotId]
  );
  return ballot;
};


const createBallotWithPositions = async ({ election_id, description, positions }, providedClient = null) => {
  const client = providedClient || await pool.connect();
  const shouldReleaseClient = !providedClient;
  
  try {
    if (!providedClient) {
      await client.query('BEGIN');
    }
    
    const ballotQuery = `
      INSERT INTO ballots (election_id, description)
      VALUES ($1, $2)
      RETURNING *`;
    const { rows: [ballot] } = await client.query(ballotQuery, [election_id, description]);

    
   
    for (const position of positions) {
      const positionQuery = `
        INSERT INTO positions (ballot_id, name, max_choices)
        VALUES ($1, $2, $3)
        RETURNING *`;
      const { rows: [createdPosition] } = await client.query(
        positionQuery,
        [ballot.id, position.name, position.max_choices || 1]
      );

      if (position.candidates?.length) {
        const candidateValues = position.candidates.map(candidate => 
          `(${createdPosition.id}, 
            '${candidate.first_name}', 
            '${candidate.last_name}', 
            ${candidate.party ? `'${candidate.party}'` : 'NULL'}, 
            ${candidate.slogan ? `'${candidate.slogan}'` : 'NULL'},
            ${candidate.platform ? `'${candidate.platform}'` : 'NULL'},
            ${candidate.image_url ? `'${candidate.image_url}'` : 'NULL'})`
        ).join(',');

        await client.query(`
          INSERT INTO candidates 
            (position_id, first_name, last_name, party, slogan, platform, image_url)
          VALUES ${candidateValues}
        `);
      }
    }

    if (!providedClient) {
      await client.query('COMMIT');
    }
    
    return await getFullBallot(ballot.id);
  } catch (error) {
    if (!providedClient) {
      await client.query('ROLLBACK');
    }
    throw error;
  } finally {
    if (shouldReleaseClient) {
      client.release();
    }
  }
};


const getFullBallot = async (ballotId) => {
  try {
    const { rows: [ballot] } = await pool.query(
      'SELECT * FROM ballots WHERE id = $1', 
      [ballotId]
    );
    if (!ballot) return null;

    const { rows: positions } = await pool.query(
      'SELECT * FROM positions WHERE ballot_id = $1 ORDER BY display_order',
      [ballotId]
    );

    for (const position of positions) {
      const { rows: candidates } = await pool.query(
        'SELECT * FROM candidates WHERE position_id = $1',
        [position.id]
      );
      position.candidates = candidates;
    }

    return { ...ballot, positions };
  } catch (error) {
    throw error;
  }
};

const updateBallotDescription = async (ballotId, description) => {
  const { rows: [ballot] } = await pool.query(
    `UPDATE ballots 
     SET description = $1, updated_at = NOW()
     WHERE id = $2 
     RETURNING *`,
    [description, ballotId]
  );
  return ballot;
};


const deleteBallot = async (ballotId) => {
  const { rows: [ballot] } = await pool.query(
    'DELETE FROM ballots WHERE id = $1 RETURNING *',
    [ballotId]
  );
  return ballot;
};

const createPosition = async (ballotId, name, maxChoices) => {
  const { rows: [position] } = await pool.query(
    `INSERT INTO positions 
     (ballot_id, name, max_choices, display_order)
     VALUES ($1, $2, $3, 
       (SELECT COALESCE(MAX(display_order), 0) + 1 FROM positions WHERE ballot_id = $1)
     )
     RETURNING *`,
    [ballotId, name, maxChoices]
  );
  return position;
};

const updatePositionById = async (positionId, name, maxChoices) => {
  const { rows: [position] } = await pool.query(
    `UPDATE positions 
     SET name = $1, max_choices = $2, updated_at = NOW()
     WHERE id = $3
     RETURNING *`,
    [name, maxChoices, positionId]
  );
  return position;
};

const deletePositionById = async (positionId) => {
  const { rows: [position] } = await pool.query(
    'DELETE FROM positions WHERE id = $1 RETURNING *',
    [positionId]
  );
  return position;
};

const getPositionById = async (positionId) => {
  const id = parseInt(positionId, 10);
  if (isNaN(id)) {
    throw new Error('Invalid position ID');
  }
  const { rows: [position] } = await pool.query(
    'SELECT * FROM positions WHERE id = $1',
    [id]
  );
  return position;
};

const getCandidatesByPosition = async (positionId) => {
  const { rows } = await pool.query(
    'SELECT * FROM candidates WHERE position_id = $1',
    [positionId]
  );
  return rows;
};


const createCandidate = async (
  positionId, 
  firstName, 
  lastName, 
  party = null, 
  slogan = null, 
  platform = null,
  imageUrl = null
) => {
  const { rows: [candidate] } = await pool.query(
    `INSERT INTO candidates 
     (position_id, first_name, last_name, party, slogan, platform, image_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [positionId, firstName, lastName, party, slogan, platform, imageUrl]
  );
  return candidate;
};

const updateCandidateById = async (
  candidateId, 
  firstName, 
  lastName, 
  party = null, 
  slogan = null, 
  platform = null,
  imageUrl = null
) => {
  const { rows: [candidate] } = await pool.query(
    `UPDATE candidates 
     SET first_name = $1, 
         last_name = $2, 
         party = $3, 
         slogan = $4, 
         platform = $5,
         image_url = COALESCE($7, image_url),
         updated_at = NOW()
     WHERE id = $6
     RETURNING *`,
    [firstName, lastName, party, slogan, platform, candidateId, imageUrl]
  );
  return candidate;
};


const updateCandidateImage = async (candidateId, imageUrl) => {
  const { rows: [candidate] } = await pool.query(
    `UPDATE candidates 
     SET image_url = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [imageUrl, candidateId]
  );
  return candidate;
};

const deleteCandidateById = async (candidateId) => {
  const { rows: [candidate] } = await pool.query(
    'DELETE FROM candidates WHERE id = $1 RETURNING *',
    [candidateId]
  );
  return candidate;
};

const getCandidateById = async (candidateId) => {
  const { rows: [candidate] } = await pool.query(
    'SELECT * FROM candidates WHERE id = $1',
    [candidateId]
  );
  return candidate;
};

const addCandidate = async (candidateData) => {
  const { position_id, first_name, last_name, party, slogan, platform, image_url } = candidateData;
  
  const query = `
    INSERT INTO candidates (position_id, first_name, last_name, party, slogan, platform, image_url)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;
  
  const values = [position_id, first_name, last_name, party, slogan, platform, image_url];
  
  try {
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    throw error;
  }
};

module.exports = {
  createBallotWithPositions,
  getFullBallot,
  updateBallotDescription,
  deleteBallot,
  createPosition,
  updatePositionById,
  deletePositionById,
  getPositionById,
  getCandidatesByPosition,
  createCandidate, 
  updateCandidateById, 
  updateCandidateImage, 
  deleteCandidateById, 
  getCandidateById,
  addCandidate
};