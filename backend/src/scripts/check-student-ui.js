/**
 * Simple script to check and fix student UI configuration
 * This directly examines and updates the database
 */

const pool = require('../config/db.js');

async function checkAndFixStudentUI() {
  try {
    console.log('Checking student UI configuration...');
    
    // Check current state
    const result = await pool.query('SELECT * FROM student_ui LIMIT 1');
    
    if (result.rows.length === 0) {
      console.log('No student UI configuration found. Creating default...');
      
      await pool.query(`
        INSERT INTO student_ui 
        (type, background_image, use_landing_design, created_at, updated_at)
        VALUES ('poster', NULL, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `);
      
      console.log('Created default configuration');
    } else {
      console.log('Current configuration:', result.rows[0]);
      
      const currentConfig = result.rows[0];
      console.log(`type = ${currentConfig.type}, use_landing_design = ${currentConfig.use_landing_design}`);
      
      // Check if type is 'landing' but use_landing_design is false
      if (currentConfig.type === 'landing' && currentConfig.use_landing_design === false) {
        console.log('INCONSISTENCY FOUND: type is "landing" but use_landing_design is false');
        console.log('Fixing inconsistency...');
        
        await pool.query(`
          UPDATE student_ui
          SET use_landing_design = TRUE,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [currentConfig.id]);
        
        console.log('Fixed inconsistency');
      } else {
        console.log('Configuration is consistent');
      }
    }
    
    // Verify current state
    const verifyResult = await pool.query('SELECT * FROM student_ui LIMIT 1');
    console.log('Current configuration after checks:', verifyResult.rows[0]);
    
  } catch (error) {
    console.error('Error checking/fixing student UI:', error);
  } finally {
    await pool.end();
  }
}

// Run the function
checkAndFixStudentUI(); 