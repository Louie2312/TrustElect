const express = require('express');
const router = express.Router();
const StudentUIController = require('../controllers/studentUIController');
const { verifyToken, allowRoles } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/studentUIUploadMiddleware');
const pool = require('../config/db.js');

// Get student UI configuration
router.get('/', 
  verifyToken,
  allowRoles('Student', 'Admin', 'Super Admin'),
  (req, res, next) => {
    console.log('Processing get request for student UI config...');
    console.log('User role:', req.user.role);
    next();
  },
  StudentUIController.getConfig
);

// Update student UI configuration (requires admin/superadmin auth)
router.post('/', 
  verifyToken,
  allowRoles('Admin', 'Super Admin'),
  (req, res, next) => {
    console.log('Processing file upload request in route...');
    console.log('Request body before upload:', req.body);
    
    upload.single('backgroundImage')(req, res, (err) => {
      if (err) {
        console.error('File upload error:', err);
        return res.status(400).json({ 
          message: err.message || 'Error uploading file',
          error: err.toString()
        });
      }
      
      console.log('File upload processed in route');
      console.log('Request file after upload:', req.file);
      console.log('Request body after upload:', req.body);
      
      if (!req.body.content && req.body.content !== '{}') {
        return res.status(400).json({
          message: 'Missing content data'
        });
      }
      
      // Process and modify content data if needed
      try {
        let contentData = JSON.parse(req.body.content);
        console.log('Parsed content in route:', contentData);
        console.log('use_landing_design value:', contentData.use_landing_design);
        console.log('use_landing_design type:', typeof contentData.use_landing_design);
        
        // Force use_landing_design to true if type is 'landing'
        if (contentData.type === 'landing') {
          console.log('Type is "landing", forcing use_landing_design to true in route');
          contentData.use_landing_design = true;
          
          // Update the request body with the modified content
          req.body.content = JSON.stringify(contentData);
          console.log('Updated content in route:', req.body.content);
        }
      } catch (error) {
        console.error('Error processing content in route:', error);
      }
      
      next();
    });
  },
  StudentUIController.updateConfig
);

// Route to run the fix script for landing design (admin/superadmin only)
router.post('/fix-landing-design',
  verifyToken,
  allowRoles('Admin', 'Super Admin'),
  async (req, res) => {
    console.log('Running fix script for landing design...');
    
    try {
      // Check if table exists
      const tableExists = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'student_ui'
        );
      `);
      
      if (!tableExists.rows[0].exists) {
        return res.status(404).json({ message: 'student_ui table does not exist' });
      }
      
      // Check if constraint exists
      const constraintExists = await pool.query(`
        SELECT COUNT(*) FROM pg_constraint 
        WHERE conname = 'enforce_landing_design' AND conrelid = 'student_ui'::regclass;
      `);
      
      // Add constraint if it doesn't exist
      if (parseInt(constraintExists.rows[0].count) === 0) {
        console.log('Adding constraint to enforce landing design...');
        
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
      }
      
      // Get current config and fix if needed
      const result = await pool.query('SELECT * FROM student_ui LIMIT 1');
      
      if (result.rows.length === 0) {
        console.log('No config found. Creating default...');
        
        await pool.query(`
          INSERT INTO student_ui 
          (type, background_image, use_landing_design, created_at, updated_at)
          VALUES ('poster', NULL, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
        `);
      } else if (result.rows[0].type === 'landing' && !result.rows[0].use_landing_design) {
        console.log('Found inconsistent record. Fixing...');
        
        await pool.query(`
          UPDATE student_ui
          SET use_landing_design = TRUE,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [result.rows[0].id]);
      }
      
      // Check current config
      const verifyResult = await pool.query('SELECT * FROM student_ui LIMIT 1');
      
      res.json({
        message: 'Fix script completed successfully',
        config: verifyResult.rows[0]
      });
    } catch (error) {
      console.error('Error running fix script:', error);
      res.status(500).json({ message: 'Error running fix script', error: error.message });
    }
  }
);

// Direct endpoint to force landing design (simplest solution)
router.post('/force-landing', 
  verifyToken,
  allowRoles('Admin', 'Super Admin'),
  (req, res, next) => {
    console.log('Processing force-landing request...');
    console.log('User role:', req.user.role);
    next();
  },
  StudentUIController.forceLandingDesign
);

module.exports = router; 