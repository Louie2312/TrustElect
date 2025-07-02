const express = require('express');
const router = express.Router();
const StudentUIController = require('../controllers/studentUIController');
const { verifyToken, allowRoles } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/studentUIUploadMiddleware');
const pool = require('../config/db.js');

router.get('/', 
  verifyToken,
  allowRoles('Student', 'Admin', 'Super Admin'),
  (req, res, next) => {

    next();
  },
  StudentUIController.getConfig
);

router.post('/', 
  verifyToken,
  allowRoles('Admin', 'Super Admin'),
  (req, res, next) => {

    
    upload.single('backgroundImage')(req, res, (err) => {
      if (err) {
        console.error('File upload error:', err);
        return res.status(400).json({ 
          message: err.message || 'Error uploading file',
          error: err.toString()
        });
      }

      
      if (!req.body.content && req.body.content !== '{}') {
        return res.status(400).json({
          message: 'Missing content data'
        });
      }

      try {
        let contentData = JSON.parse(req.body.content);

        if (contentData.type === 'landing') {
          contentData.use_landing_design = true;

          req.body.content = JSON.stringify(contentData);
        }
      } catch (error) {
        console.error('Error processing content in route:', error);
      }
      
      next();
    });
  },
  StudentUIController.updateConfig
);

router.post('/fix-landing-design',
  verifyToken,
  allowRoles('Admin', 'Super Admin'),
  async (req, res) => {
    console.log('Running fix script for landing design...');
    
    try {

      const tableExists = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'student_ui'
        );
      `);
      
      if (!tableExists.rows[0].exists) {
        return res.status(404).json({ message: 'student_ui table does not exist' });
      }

      const constraintExists = await pool.query(`
        SELECT COUNT(*) FROM pg_constraint 
        WHERE conname = 'enforce_landing_design' AND conrelid = 'student_ui'::regclass;
      `);

      if (parseInt(constraintExists.rows[0].count) === 0) {
        console.log('Adding constraint to enforce landing design...');

        await pool.query(`
          UPDATE student_ui
          SET use_landing_design = TRUE
          WHERE type = 'landing' AND use_landing_design = FALSE;
        `);

        await pool.query(`
          ALTER TABLE student_ui
          ADD CONSTRAINT enforce_landing_design CHECK (
            (type = 'landing' AND use_landing_design = TRUE) OR type = 'poster'
          );
        `);
      }

      const result = await pool.query('SELECT * FROM student_ui LIMIT 1');
      
      if (result.rows.length === 0) {
        console.log('No config found. Creating default...');
        
        await pool.query(`
          INSERT INTO student_ui 
          (type, background_image, use_landing_design, created_at, updated_at)
          VALUES ('poster', NULL, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
        `);
      } else if (result.rows[0].type === 'landing' && !result.rows[0].use_landing_design) {
        
        await pool.query(`
          UPDATE student_ui
          SET use_landing_design = TRUE,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [result.rows[0].id]);
      }

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