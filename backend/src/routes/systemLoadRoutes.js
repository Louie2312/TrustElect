const express = require('express');
const router = express.Router();
const { verifyToken, isSuperAdmin } = require('../middlewares/authMiddleware');
const { getSystemLoad } = require('../controllers/systemLoadController');
const { resetSystemLoadData, getResetStatus } = require('../controllers/systemLoadResetController');

// Get system load statistics
router.get('/system-load', verifyToken, isSuperAdmin, getSystemLoad);

// Reset system load data
router.post('/system-load/reset', verifyToken, isSuperAdmin, resetSystemLoadData);

// Get reset status
router.get('/system-load/status', verifyToken, isSuperAdmin, getResetStatus);

module.exports = router; 