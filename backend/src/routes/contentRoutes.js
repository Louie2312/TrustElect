const express = require('express');
const router = express.Router();
const contentController = require('../controllers/contentController');
const { verifyToken } = require('../middlewares/authMiddleware');
const { checkPermission } = require('../middlewares/permissionMiddleware');

// Middleware specifically for content uploads with increased limits
const contentUploadMiddleware = (req, res, next) => {
  // Set longer timeout for content uploads
  req.setTimeout(300000); // 5 minutes
  res.setTimeout(300000); // 5 minutes
  
  // Log upload attempt
  console.log(`Content upload attempt - Section: ${req.params.section}`);
  console.log(`Content-Type: ${req.headers['content-type']}`);
  console.log(`Content-Length: ${req.headers['content-length']}`);
  
  next();
};

router.get('/', contentController.getAllContent);
router.get('/:section', contentController.getSectionContent);
router.get('/themes/active', contentController.getActiveTheme);

router.post('/:section', contentUploadMiddleware, verifyToken, checkPermission('cms', 'edit'), contentController.updateSectionContent);

// Protected media routes
router.get('/media/all', verifyToken, checkPermission('cms', 'view'), contentController.getAllMedia);
router.delete('/media/:id', verifyToken, checkPermission('cms', 'delete'), contentController.deleteMedia);

// Protected theme routes
router.get('/themes', verifyToken, checkPermission('cms', 'view'), contentController.getAllThemes);
router.get('/themes/:id', verifyToken, checkPermission('cms', 'view'), contentController.getThemeById);
router.post('/themes', verifyToken, checkPermission('cms', 'create'), contentController.createTheme);
router.put('/themes/:id', verifyToken, checkPermission('cms', 'edit'), contentController.updateTheme);
router.delete('/themes/:id', verifyToken, checkPermission('cms', 'delete'), contentController.deleteTheme);
router.post('/themes/:id/activate', verifyToken, checkPermission('cms', 'edit'), contentController.setActiveTheme);
router.post('/themes/:id/apply', verifyToken, checkPermission('cms', 'edit'), contentController.applyTheme);
router.post('/themes', verifyToken, checkPermission('cms', 'create'), contentController.saveTheme);

// Test endpoint for debugging uploads
router.post('/test-upload', contentUploadMiddleware, (req, res) => {
  console.log('Test upload endpoint hit');
  console.log('Headers:', req.headers);
  console.log('Body size:', req.body ? JSON.stringify(req.body).length : 0);
  console.log('Files:', req.files);
  
  res.json({
    message: 'Upload test successful',
    headers: {
      contentType: req.headers['content-type'],
      contentLength: req.headers['content-length']
    },
    bodySize: req.body ? JSON.stringify(req.body).length : 0,
    files: req.files ? Object.keys(req.files).length : 0
  });
});

module.exports = router; 

