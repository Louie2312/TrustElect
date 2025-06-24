const StudentUIModel = require('../models/studentUIModel');
const path = require('path');
const fs = require('fs').promises;

class StudentUIController {
  static async getConfig(req, res) {
    try {
      console.log('Getting student UI config...');
      const config = await StudentUIModel.getConfig();
      
      if (!config) {
        console.log('No config found, creating default...');
        const defaultConfig = await StudentUIModel.updateConfig('poster', null, false);
        return res.json({
          content: {
            type: defaultConfig.type,
            background_image: defaultConfig.background_image,
            use_landing_design: defaultConfig.use_landing_design
          }
        });
      }

      console.log('Returning config:', config);
      res.json({
        content: {
          type: config.type,
          background_image: config.background_image,
          use_landing_design: config.use_landing_design
        }
      });
    } catch (error) {
      console.error('Error getting student UI config:', error);
      res.status(500).json({ message: 'Failed to get student UI configuration' });
    }
  }

  static async updateConfig(req, res) {
    try {
      console.log('Updating student UI config...');
      console.log('Request body:', req.body);
      console.log('File:', req.file);

      let contentData;
      try {
        contentData = JSON.parse(req.body.content);
        console.log('Parsed content data:', contentData);
      } catch (error) {
        console.error('Error parsing content data:', error);
        return res.status(400).json({ message: 'Invalid content data format' });
      }

      const { type, use_landing_design, existing_background_image } = contentData;
      
      // Log the received values for debugging
      console.log('Received type:', type);
      console.log('Received use_landing_design:', use_landing_design);
      console.log('Received existing_background_image:', existing_background_image);
      
      let backgroundImage = null;

      // Get current config to check for existing background image
      const currentConfig = await StudentUIModel.getConfig();
      console.log('Current config from database:', currentConfig);

      // Handle file upload if present
      if (req.file) {
        console.log('Processing uploaded file:', req.file.originalname);
        // Save path with leading slash and use forward slashes
        backgroundImage = `/uploads/images/${req.file.filename}`;
        console.log('Saved background image path:', backgroundImage);

        // Verify file exists
        try {
          await fs.access(path.join(__dirname, '../../', backgroundImage.substring(1)));
          console.log('Verified file exists:', backgroundImage);
        } catch (err) {
          console.error('Uploaded file not found:', err);
          return res.status(500).json({ message: 'Failed to save uploaded file' });
        }
      } else if (existing_background_image && !req.body.removeBackground) {
        // Keep existing background image if specified and not removing
        console.log('Using existing background image:', existing_background_image);
        backgroundImage = existing_background_image;
      }

      // Handle background removal if requested
      if (req.body.removeBackground === 'true' || type === 'landing') {
        console.log('Background removal requested or landing design selected');
        backgroundImage = null;
      }

      // Delete old background image if replacing with new one
      if (currentConfig && currentConfig.background_image && 
          backgroundImage !== currentConfig.background_image && 
          (req.file || req.body.removeBackground === 'true')) {
        try {
          // Try to delete the old background image if it's not a URL
          if (currentConfig.background_image && currentConfig.background_image.startsWith('/uploads/')) {
            const oldImagePath = path.join(__dirname, '../../', currentConfig.background_image.substring(1));
            await fs.access(oldImagePath); // Check if file exists before trying to delete
            await fs.unlink(oldImagePath);
            console.log('Deleted old background image:', currentConfig.background_image);
          }
        } catch (err) {
          console.error('Error deleting old background image:', err);
          // Continue even if delete fails
        }
      }

      console.log('Updating config with:', { 
        type, 
        backgroundImage, 
        use_landing_design 
      });
      
      // The model will enforce that use_landing_design is true when type is 'landing'
      const updatedConfig = await StudentUIModel.updateConfig(
        type, 
        backgroundImage, 
        use_landing_design
      );

      console.log('Config updated successfully:', updatedConfig);
      
      res.json({
        message: 'Student UI configuration updated successfully',
        content: {
          type: updatedConfig.type,
          background_image: updatedConfig.background_image,
          use_landing_design: updatedConfig.use_landing_design
        }
      });
    } catch (error) {
      console.error('Error updating student UI config:', error);
      res.status(500).json({ message: 'Failed to update student UI configuration' });
    }
  }

  static async forceLandingDesign(req, res) {
    try {
      console.log('Forcing landing design with direct database update...');
      
      // Instead of using the model, directly update the database
      const pool = require('../config/db.js');
      
      // Check if a record exists
      const result = await pool.query('SELECT id FROM student_ui LIMIT 1');
      
      let updatedRecord;
      if (result.rows.length === 0) {
        // Insert new record with landing design
        console.log('No existing record, creating new one with landing design...');
        const insertResult = await pool.query(`
          INSERT INTO student_ui 
          (type, background_image, use_landing_design, created_at, updated_at)
          VALUES ('landing', NULL, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          RETURNING *
        `);
        updatedRecord = insertResult.rows[0];
      } else {
        // Directly update the existing record
        console.log('Updating existing record with ID:', result.rows[0].id);
        const updateResult = await pool.query(`
          UPDATE student_ui
          SET type = 'landing',
              background_image = NULL,
              use_landing_design = TRUE,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
          RETURNING *
        `, [result.rows[0].id]);
        updatedRecord = updateResult.rows[0];
      }
      
      // Verify the update
      const verifyResult = await pool.query('SELECT * FROM student_ui WHERE id = $1', [updatedRecord.id]);
      console.log('Verified database record:', verifyResult.rows[0]);
      
      // Double check the use_landing_design value
      if (verifyResult.rows[0].use_landing_design !== true) {
        console.error('CRITICAL ERROR: use_landing_design is still not true after direct update!');
        // Try one more time with a raw query
        await pool.query(`
          UPDATE student_ui
          SET use_landing_design = TRUE
          WHERE id = $1
        `, [updatedRecord.id]);
        
        // Check again
        const finalCheck = await pool.query('SELECT use_landing_design FROM student_ui WHERE id = $1', [updatedRecord.id]);
        console.log('Final check of use_landing_design:', finalCheck.rows[0].use_landing_design);
      }
      
      res.json({
        message: 'Landing design forced successfully with direct database update',
        content: {
          type: 'landing',
          background_image: null,
          use_landing_design: true
        }
      });
    } catch (error) {
      console.error('Error forcing landing design:', error);
      res.status(500).json({ message: 'Failed to force landing design' });
    }
  }
}

module.exports = StudentUIController; 