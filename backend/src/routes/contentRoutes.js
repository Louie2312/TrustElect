const express = require('express');
const router = express.Router();
const contentController = require('../controllers/contentController');
const { verifyToken } = require('../middlewares/authMiddleware');
const { checkPermission } = require('../middlewares/permissionMiddleware');
const multer = require('multer');
const path = require('path');

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadDir;
    if (file.mimetype.startsWith('video/')) {
      uploadDir = path.join(__dirname, '../../uploads/videos');
    } else {
      uploadDir = path.join(__dirname, '../../uploads/images');
    }
    
    // Create directory if it doesn't exist
    if (!require('fs').existsSync(uploadDir)) {
      require('fs').mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Configure multer upload
const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

const contentUploadMiddleware = (req, res, next) => {
  req.setTimeout(300000); 
  res.setTimeout(300000); 

  if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {

    req._body = false;
    req.body = {};
    
    return next();
  }
  
  next();
};

router.get('/', contentController.getAllContent);
router.get('/:section', contentController.getSectionContent);
router.get('/themes/active', contentController.getActiveTheme);

router.post('/:section', contentUploadMiddleware, verifyToken, checkPermission('cms', 'edit'), contentController.updateSectionContent);

// Background upload route
router.post('/upload-background', contentUploadMiddleware, verifyToken, checkPermission('cms', 'edit'), upload.single('image'), contentController.uploadBackground);

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

router.post('/test-upload', contentUploadMiddleware, (req, res) => {

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

