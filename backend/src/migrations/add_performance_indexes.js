const pool = require('../config/db');

async function addPerformanceIndexes() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('Adding performance indexes...');
    
    // Indexes for elections table
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_elections_status 
      ON elections (status) 
      WHERE needs_approval = FALSE OR needs_approval IS NULL
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_elections_created_by 
      ON elections (created_by)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_elections_date_from 
      ON elections (date_from DESC)
    `);
    
    // Indexes for votes table
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_votes_election_id 
      ON votes (election_id)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_votes_student_id 
      ON votes (student_id)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_votes_election_student 
      ON votes (election_id, student_id)
    `);
    
    // Indexes for eligible_voters table
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_eligible_voters_election_id 
      ON eligible_voters (election_id)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_eligible_voters_student_id 
      ON eligible_voters (student_id)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_eligible_voters_has_voted 
      ON eligible_voters (has_voted) 
      WHERE has_voted = TRUE
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_eligible_voters_election_has_voted 
      ON eligible_voters (election_id, has_voted)
    `);
    
    // Indexes for ballots table
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ballots_election_id 
      ON ballots (election_id)
    `);
    
    // Indexes for positions table
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_positions_ballot_id 
      ON positions (ballot_id)
    `);
    
    // Indexes for candidates table
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_candidates_position_id 
      ON candidates (position_id)
    `);
    
    // Composite index for complex queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_elections_status_approval_created_by 
      ON elections (status, needs_approval, created_by)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_elections_date_status 
      ON elections (date_from, status)
    `);
    
    await client.query('COMMIT');
    console.log('Performance indexes added successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error adding performance indexes:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  addPerformanceIndexes()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = addPerformanceIndexes;
