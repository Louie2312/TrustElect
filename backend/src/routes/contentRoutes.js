const express = require('express');
const router = express.Router();
const contentController = require('../controllers/contentController');

// Content routes
router.get('/', contentController.getAllContent);
router.get('/:section', contentController.getSectionContent);
router.post('/:section', contentController.updateSectionContent);

// Media routes
router.get('/media/all', contentController.getAllMedia);
router.delete('/media/:id', contentController.deleteMedia);

// Theme routes
router.get('/themes/active', contentController.getActiveTheme);
router.put('/themes/:id/activate', contentController.setActiveTheme);
router.post('/themes', contentController.createTheme);
router.get('/themes/all', contentController.getAllThemes);

module.exports = router; 

