/**
 * Script to fix student UI landing design inconsistency issues
 * This will:
 * 1. Update the database schema to add a constraint
 * 2. Fix any existing records with inconsistent values
 * 3. Create the table if it doesn't exist
 */

const pool = require('../config/db.js');

async function fixStudentUILanding() {
  const client = await pool.connect();
  
  try {
    console.log('Starting Student UI Landing design fix...');
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Check if table exists
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'student_ui'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('student_ui table does not exist. Creating it...');
      
      // Create the enum type if it doesn't exist
      const enumExists = await client.query(`
        SELECT EXISTS (
          SELECT FROM pg_type 
          WHERE typname = 'ui_type'
        );
      `);
      
      if (!enumExists.rows[0].exists) {
        console.log('Creating ui_type enum...');
        await client.query(`
          CREATE TYPE ui_type AS ENUM ('poster', 'landing');
        `);
      }
      
      // Create the table with constraint
      await client.query(`
        CREATE TABLE student_ui (
          id SERIAL PRIMARY KEY,
          type ui_type NOT NULL DEFAULT 'poster',
          background_image TEXT,
          use_landing_design BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT enforce_landing_design CHECK (
            (type = 'landing' AND use_landing_design = TRUE) OR type = 'poster'
          )
        );
        
        -- Add trigger to update timestamp
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
        END;
        $$ language 'plpgsql';
        
        CREATE TRIGGER update_student_ui_updated_at
          BEFORE UPDATE ON student_ui
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
      `);
      
      // Insert default record
      await client.query(`
        INSERT INTO student_ui 
        (type, background_image, use_landing_design, created_at, updated_at)
        VALUES ('poster', NULL, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
      `);
      
      console.log('Created table with constraint and inserted default record');
    } else {
      console.log('Table exists, checking for constraint...');
      
      // Check if the constraint exists
      const constraintExists = await client.query(`
        SELECT COUNT(*) FROM pg_constraint 
        WHERE conname = 'enforce_landing_design' AND conrelid = 'student_ui'::regclass;
      `);
      
      if (parseInt(constraintExists.rows[0].count) === 0) {
        console.log('Adding constraint...');
        
        // Fix any inconsistent records first
        await client.query(`
          UPDATE student_ui
          SET use_landing_design = TRUE
          WHERE type = 'landing' AND use_landing_design = FALSE;
        `);
        
        // Add constraint
        await client.query(`
          ALTER TABLE student_ui
          ADD CONSTRAINT enforce_landing_design CHECK (
            (type = 'landing' AND use_landing_design = TRUE) OR type = 'poster'
          );
        `);
        
        console.log('Constraint added');
      } else {
        console.log('Constraint already exists');
      }
      
      // Get current record and fix if needed
      const result = await client.query('SELECT * FROM student_ui LIMIT 1');
      
      if (result.rows.length === 0) {
        console.log('No records found. Inserting default record...');
        
        await client.query(`
          INSERT INTO student_ui 
          (type, background_image, use_landing_design, created_at, updated_at)
          VALUES ('poster', NULL, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
        `);
        
        console.log('Inserted default record');
      } else if (result.rows[0].type === 'landing' && !result.rows[0].use_landing_design) {
        console.log('Found inconsistent record, fixing...');
        
        await client.query(`
          UPDATE student_ui
          SET use_landing_design = TRUE,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [result.rows[0].id]);
        
        console.log('Fixed inconsistent record');
      }
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    // Verify the state
    const verifyResult = await client.query('SELECT * FROM student_ui LIMIT 1');
    console.log('Current student_ui config:', verifyResult.rows[0]);
    
    console.log('Student UI landing design fix completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error fixing student UI landing design:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
fixStudentUILanding(); 