const pool = require('../config/db.js');

class StudentUIModel {
  static async getConfig() {
    try {
      const result = await pool.query('SELECT * FROM student_ui LIMIT 1');

      if (!result.rows.length) {
        return this.updateConfig('poster', null, false);
      }

      if (result.rows[0].type === 'landing' && !result.rows[0].use_landing_design) {

        
        try {
          const updateResult = await pool.query(`
            UPDATE student_ui 
            SET use_landing_design = TRUE 
            WHERE id = $1 
            RETURNING *
          `, [result.rows[0].id]);

          return updateResult.rows[0];
        } catch (updateError) {
          console.error('Error fixing inconsistent config:', updateError);
          const fixedConfig = {...result.rows[0], use_landing_design: true};

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

      const finalUseLandingDesign = type === 'landing' ? true : 
      (useLandingDesign === true || useLandingDesign === 'true');
      

      await this.ensureTableExists();

      const result = await pool.query(
        'SELECT id FROM student_ui LIMIT 1'
      );

      let updatedRecord;
      if (result.rows.length === 0) {
 
        const insertResult = await pool.query(
          `INSERT INTO student_ui 
           (type, background_image, use_landing_design, created_at, updated_at) 
           VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
           RETURNING *`,
          [type, backgroundImage, finalUseLandingDesign]
        );
        updatedRecord = insertResult.rows[0];
      } else {
        
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
      }

      // Verify the update
      const verifyResult = await pool.query(
        'SELECT * FROM student_ui WHERE id = $1',
        [updatedRecord.id]
      );

      if (type === 'landing' && !verifyResult.rows[0].use_landing_design) {
        console.error('Critical error: use_landing_design is still false after update.');
        return {...verifyResult.rows[0], use_landing_design: true};
      }

      return verifyResult.rows[0];
    } catch (error) {
      console.error('Error updating student UI config:', error);

      if (error.message.includes('enforce_landing_design')) {
        return this.updateConfig(type, backgroundImage, true);
      }
      
      throw error;
    }
  }

  static async ensureTableExists() {
    try {
      const tableExists = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'student_ui'
        );
      `);
      
      if (!tableExists.rows[0].exists) {
        const enumExists = await pool.query(`
          SELECT EXISTS (
            SELECT FROM pg_type 
            WHERE typname = 'ui_type'
          );
        `);
        
        if (!enumExists.rows[0].exists) {
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

      } else {
        const constraintExists = await pool.query(`
          SELECT COUNT(*) FROM pg_constraint 
          WHERE conname = 'enforce_landing_design' AND conrelid = 'student_ui'::regclass;
        `);
        
        if (parseInt(constraintExists.rows[0].count) === 0) {

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

        }
      }
    } catch (error) {
      console.error('Error ensuring table exists:', error);
      throw error;
    }
  }

  static async forceLandingDesign() {
    try {

      const result = await pool.query('SELECT id FROM student_ui LIMIT 1');
      
      if (result.rows.length === 0) {

        const insertResult = await pool.query(`
          INSERT INTO student_ui 
          (type, background_image, use_landing_design, created_at, updated_at)
          VALUES ('landing', NULL, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          RETURNING *
        `);

        return insertResult.rows[0];
      } else {

        const updateResult = await pool.query(`
          UPDATE student_ui
          SET type = 'landing',
              background_image = NULL,
              use_landing_design = TRUE,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
          RETURNING *
        `, [result.rows[0].id]);

        return updateResult.rows[0];
      }
    } catch (error) {
      console.error('Error forcing landing design:', error);
      throw error;
    }
  }
}

module.exports = StudentUIModel; 