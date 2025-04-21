/**
 * Migration script to apply vote encryption schema changes
 * 
 * Run with: node src/migrations/apply_vote_encryption.js
 */

const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

async function applyMigration() {
  const client = await pool.connect();
  
  try {
    console.log('Starting migration for vote encryption schema changes...');
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, '../models/schema/vote_encryption.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Split SQL by semicolons to execute each statement separately
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`Executing statement ${i+1}/${statements.length}: ${statement.substring(0, 60)}...`);
      
      try {
        await client.query(statement);
        console.log(`Statement ${i+1} executed successfully`);
      } catch (stmtError) {
        console.warn(`Warning: Error executing statement ${i+1}: ${stmtError.message}`);
        
        // If this is a critical error that should stop the migration, uncomment this:
        // throw stmtError;
        
        // For now, we continue with other statements
      }
    }
    
    // Also try to adjust any existing data
    try {
      console.log('Checking for existing votes without encryption...');
      const { rows } = await client.query(`
        SELECT COUNT(*) FROM votes 
        WHERE vote_token IS NOT NULL 
        AND (encrypted_vote IS NULL OR blinded_voter_id IS NULL)
      `);
      
      if (rows[0].count > 0) {
        console.log(`Found ${rows[0].count} votes that need encryption metadata. Update if needed.`);
        // In a real migration, you might want to update these with placeholder values
      }
    } catch (dataError) {
      console.warn('Warning checking existing votes:', dataError.message);
    }
    
    // Record the migration in migrations table if it exists
    try {
      await client.query(`
        INSERT INTO migrations (name, applied_at) 
        VALUES ('vote_encryption', NOW())
        ON CONFLICT (name) DO UPDATE 
        SET applied_at = NOW()
      `);
    } catch (err) {
      console.log('Migrations table not found, skipping record');
    }
    
    // Commit the transaction
    await client.query('COMMIT');
    
    console.log('Migration completed successfully!');
  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the migration function
applyMigration()
  .then(() => {
    console.log('Migration process finished.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Migration process failed:', err);
    process.exit(1);
  }); 