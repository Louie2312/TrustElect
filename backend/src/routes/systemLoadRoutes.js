const express = require('express');
const router = express.Router();
const { verifyToken, isSuperAdmin } = require('../middlewares/authMiddleware');
const { getSystemLoad } = require('../controllers/systemLoadController');

// Get system load statistics
router.get('/system-load', verifyToken, isSuperAdmin, getSystemLoad);

module.exports = router; 