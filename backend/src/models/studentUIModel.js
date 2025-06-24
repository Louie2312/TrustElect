const pool = require('../config/db.js');

class StudentUIModel {
  static async getConfig() {
    try {
      console.log('Fetching student UI config from database...');
      const result = await pool.query('SELECT * FROM student_ui LIMIT 1');
      console.log('Database result:', result.rows[0]);
      
      // If no configuration exists, create a default one
      if (!result.rows.length) {
        console.log('No configuration found. Creating default...');
        return this.updateConfig('poster', null, false);
      }
      
      // If type is 'landing' but use_landing_design is false, fix it immediately
      if (result.rows[0].type === 'landing' && !result.rows[0].use_landing_design) {
        console.log('Found inconsistency: type is landing but use_landing_design is false. Fixing...');
        
        try {
          const updateResult = await pool.query(`
            UPDATE student_ui 
            SET use_landing_design = TRUE 
            WHERE id = $1 
            RETURNING *
          `, [result.rows[0].id]);
          
          console.log('Fixed config:', updateResult.rows[0]);
          return updateResult.rows[0];
        } catch (updateError) {
          console.error('Error fixing inconsistent config:', updateError);
          // Continue with the original result with the fix applied in memory
          const fixedConfig = {...result.rows[0], use_landing_design: true};
          console.log('Returning in-memory fixed config:', fixedConfig);
          return fixedConfig;
        }
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('Error getting student UI config:', error);
      throw error;
    }
  }

  static async updateConfig(type, backgroundImage = null, useLandingDesign = false) {
    try {
      // Force use_landing_design to true if type is 'landing'
      const finalUseLandingDesign = type === 'landing' ? true : 
                                  (useLandingDesign === true || useLandingDesign === 'true');
      
      console.log('Updating student UI config with:', { 
        type, 
        backgroundImage, 
        useLandingDesign: finalUseLandingDesign 
      });
      
      // Ensure the table exists with constraints
      await this.ensureTableExists();

      // Check if a record exists
      const result = await pool.query(
        'SELECT id FROM student_ui LIMIT 1'
      );

      let updatedRecord;
      if (result.rows.length === 0) {
        // Insert new config if none exists
        console.log('No existing config found, creating new...');
        
        const insertResult = await pool.query(
          `INSERT INTO student_ui 
           (type, background_image, use_landing_design, created_at, updated_at) 
           VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
           RETURNING *`,
          [type, backgroundImage, finalUseLandingDesign]
        );
        updatedRecord = insertResult.rows[0];
        console.log('Created new config:', updatedRecord);
      } else {
        // Update existing config
        console.log('Updating existing config with ID:', result.rows[0].id);
        
        const updateResult = await pool.query(
          `UPDATE student_ui 
           SET type = $1, 
               background_image = $2, 
               use_landing_design = $3, 
               updated_at = CURRENT_TIMESTAMP 
           WHERE id = $4 
           RETURNING *`,
          [type, backgroundImage, finalUseLandingDesign, result.rows[0].id]
        );
        updatedRecord = updateResult.rows[0];
        console.log('Updated config:', updatedRecord);
      }

      // Verify the update
      const verifyResult = await pool.query(
        'SELECT * FROM student_ui WHERE id = $1',
        [updatedRecord.id]
      );
      console.log('Verified config in database:', verifyResult.rows[0]);
      
      // Double check the use_landing_design value - should never happen with constraint
      if (type === 'landing' && !verifyResult.rows[0].use_landing_design) {
        console.error('Critical error: use_landing_design is still false after update.');
        // Return a corrected object (in memory fix)
        return {...verifyResult.rows[0], use_landing_design: true};
      }

      return verifyResult.rows[0];
    } catch (error) {
      console.error('Error updating student UI config:', error);
      
      // If the error is about the constraint, it means we tried to set type=landing with use_landing_design=false
      if (error.message.includes('enforce_landing_design')) {
        console.log('Constraint violation detected. Retrying with correct values...');
        return this.updateConfig(type, backgroundImage, true);
      }
      
      throw error;
    }
  }

  // Helper method to ensure the table exists with proper constraints
  static async ensureTableExists() {
    try {
      const tableExists = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'student_ui'
        );
      `);
      
      if (!tableExists.rows[0].exists) {
        console.log('Table does not exist, creating it...');
        const enumExists = await pool.query(`
          SELECT EXISTS (
            SELECT FROM pg_type 
            WHERE typname = 'ui_type'
          );
        `);
        
        if (!enumExists.rows[0].exists) {
          console.log('Creating ui_type enum...');
          await pool.query(`
            CREATE TYPE ui_type AS ENUM ('poster', 'landing');
          `);
        }

        await pool.query(`
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
        
        console.log('Table created successfully with constraints');
      } else {
        // Check if constraint exists
        const constraintExists = await pool.query(`
          SELECT COUNT(*) FROM pg_constraint 
          WHERE conname = 'enforce_landing_design' AND conrelid = 'student_ui'::regclass;
        `);
        
        if (parseInt(constraintExists.rows[0].count) === 0) {
          console.log('Adding missing constraint...');
          
          // Fix any inconsistent records first
          await pool.query(`
            UPDATE student_ui
            SET use_landing_design = TRUE
            WHERE type = 'landing' AND use_landing_design = FALSE;
          `);
          
          // Add constraint
          await pool.query(`
            ALTER TABLE student_ui
            ADD CONSTRAINT enforce_landing_design CHECK (
              (type = 'landing' AND use_landing_design = TRUE) OR type = 'poster'
            );
          `);
          
          console.log('Constraint added');
        }
      }
    } catch (error) {
      console.error('Error ensuring table exists:', error);
      throw error;
    }
  }

  // New function to directly force landing design in the database
  static async forceLandingDesign() {
    try {
      console.log('Forcing landing design in database...');
      
      // Check if a record exists
      const result = await pool.query('SELECT id FROM student_ui LIMIT 1');
      
      if (result.rows.length === 0) {
        // Create new record with landing design
        const insertResult = await pool.query(`
          INSERT INTO student_ui 
          (type, background_image, use_landing_design, created_at, updated_at)
          VALUES ('landing', NULL, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          RETURNING *
        `);
        
        console.log('Created new record with landing design:', insertResult.rows[0]);
        return insertResult.rows[0];
      } else {
        // Directly update the existing record
        const updateResult = await pool.query(`
          UPDATE student_ui
          SET type = 'landing',
              background_image = NULL,
              use_landing_design = TRUE,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
          RETURNING *
        `, [result.rows[0].id]);
        
        console.log('Forced landing design update:', updateResult.rows[0]);
        return updateResult.rows[0];
      }
    } catch (error) {
      console.error('Error forcing landing design:', error);
      throw error;
    }
  }
}

module.exports = StudentUIModel; 