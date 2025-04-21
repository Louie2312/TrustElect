require('dotenv').config({ path: '../../.env' });
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Create a new database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/trustelect'
});

async function setupContentTables() {
  console.log('Setting up content tables...');
  
  try {
    // Read the SQL file
    const sqlFile = path.join(__dirname, '../db/migrations/003_create_landing_content_tables.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    // Connect to database
    const client = await pool.connect();
    
    try {
      // Execute the SQL
      await client.query('BEGIN');
      
      console.log('Executing migration...');
      await client.query(sql);
      
      await client.query('COMMIT');
      console.log('Content tables created successfully!');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error executing migration:', error);
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Setup failed:', error);
    process.exit(1);
  } finally {
    // Close the pool
    await pool.end();
  }
}

// Run the setup
setupContentTables(); 