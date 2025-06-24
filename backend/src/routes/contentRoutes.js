const express = require('express');
const router = express.Router();
const contentController = require('../controllers/contentController');
const { verifyToken } = require('../middlewares/authMiddleware');
const { checkPermission } = require('../middlewares/permissionMiddleware');

router.get('/', contentController.getAllContent);
router.get('/:section', contentController.getSectionContent);
router.get('/themes/active', contentController.getActiveTheme);

router.post('/:section', verifyToken, checkPermission('cms', 'edit'), contentController.updateSectionContent);

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

module.exports = router; 

