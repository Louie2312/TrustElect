const pool = require('../config/db');

/**
 * Safe Database Index Addition Script
 * Adds performance indexes without modifying existing code
 * Run this before your user acceptance testing
 */

async function addPerformanceIndexes() {
  console.log('🚀 Adding performance indexes for high-concurrency voting...');
  
  try {
    // 1. Critical indexes for voting operations
    console.log('📊 Adding voting performance indexes...');
    
    await pool.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_votes_election_student 
      ON votes(election_id, student_id) 
      WHERE student_id IS NOT NULL;
    `);
    
    await pool.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_votes_election_position_candidate 
      ON votes(election_id, position_id, candidate_id);
    `);
    
    await pool.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_votes_timestamp 
      ON votes(created_at DESC);
    `);
    
    // 2. Optimize eligible_voters table
    console.log('👥 Adding eligible_voters indexes...');
    
    await pool.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_eligible_voters_election_student 
      ON eligible_voters(election_id, student_id);
    `);
    
    await pool.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_eligible_voters_has_voted 
      ON eligible_voters(election_id, has_voted) 
      WHERE has_voted = false;
    `);
    
    // 3. Optimize candidates and positions
    console.log('🎯 Adding candidates and positions indexes...');
    
    await pool.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_candidates_position 
      ON candidates(position_id);
    `);
    
    await pool.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_positions_ballot 
      ON positions(ballot_id);
    `);
    
    // 4. Optimize elections table
    console.log('🗳️ Adding elections indexes...');
    
    await pool.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_elections_status 
      ON elections(status);
    `);
    
    await pool.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_elections_dates 
      ON elections(date_from, date_to);
    `);
    
    // 5. Optimize users table
    console.log('👤 Adding users indexes...');
    
    await pool.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email 
      ON users(email);
    `);
    
    await pool.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role 
      ON users(role_id);
    `);
    
    // 6. Optimize students table
    console.log('🎓 Adding students indexes...');
    
    await pool.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_students_email 
      ON students(email);
    `);
    
    await pool.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_students_active 
      ON students(is_active) 
      WHERE is_active = true;
    `);
    
    // 7. Update database statistics
    console.log('📊 Updating database statistics...');
    await pool.query('ANALYZE');
    
    console.log('✅ Performance indexes added successfully!');
    console.log('🎉 Your system is now optimized for high-concurrency voting!');
    
  } catch (error) {
    console.error('❌ Error adding indexes:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  addPerformanceIndexes()
    .then(() => {
      console.log('🎉 Database optimization completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Database optimization failed:', error);
      process.exit(1);
    });
}

module.exports = { addPerformanceIndexes };
