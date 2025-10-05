const express = require('express');
const router = express.Router();
const { verifyToken, isSuperAdmin, isAdmin, allowRoles } = require('../middlewares/authMiddleware');
const { getSystemLoad } = require('../controllers/systemLoadController');
const { resetSystemLoadData, getResetStatus } = require('../controllers/systemLoadResetController');

// Middleware to allow both SuperAdmin and Admin
const isAdminOrSuperAdmin = allowRoles("Super Admin", "Admin");

// Get system load statistics
router.get('/system-load', verifyToken, isAdminOrSuperAdmin, getSystemLoad);

// Reset system load data (only SuperAdmin can reset)
router.post('/system-load/reset', verifyToken, isSuperAdmin, resetSystemLoadData);

// Get reset status (only SuperAdmin can check reset status)
router.get('/system-load/status', verifyToken, isSuperAdmin, getResetStatus);

module.exports = router; 