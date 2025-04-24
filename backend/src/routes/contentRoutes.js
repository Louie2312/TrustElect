const express = require('express');
const router = express.Router();
const contentController = require('../controllers/contentController');
const { verifyToken, isSuperAdmin } = require('../middlewares/authMiddleware');

// Content routes
router.get('/', contentController.getAllContent);
router.get('/:section', contentController.getSectionContent);
router.post('/:section', contentController.updateSectionContent);

// Media routes
router.get('/media/all', contentController.getAllMedia);
router.delete('/media/:id', contentController.deleteMedia);

// Theme routes
router.get('/themes', verifyToken, contentController.getAllThemes);
router.get('/themes/active', contentController.getActiveTheme);
router.get('/themes/:id', verifyToken, contentController.getThemeById);
router.post('/themes', verifyToken, isSuperAdmin, contentController.createTheme);
router.put('/themes/:id', verifyToken, isSuperAdmin, contentController.updateTheme);
router.delete('/themes/:id', verifyToken, isSuperAdmin, contentController.deleteTheme);
router.post('/themes/:id/activate', verifyToken, isSuperAdmin, contentController.setActiveTheme);
router.post('/themes/:id/apply', verifyToken, isSuperAdmin, contentController.applyTheme);
router.post('/themes', verifyToken, isSuperAdmin, contentController.saveTheme);

module.exports = router; 

