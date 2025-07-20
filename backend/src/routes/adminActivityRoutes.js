const express = require('express');
const router = express.Router();
const adminActivityController = require('../controllers/adminActivityController');
const {verifyToken, allowRoles} = require('../middlewares/authMiddleware');

// Routes accessible by both admin and super admin
router.get('/activities', verifyToken, allowRoles("Admin", "Super Admin"), adminActivityController.getAdminActivities);
router.get('/summary', verifyToken, allowRoles("Admin", "Super Admin"), adminActivityController.getAdminActivitySummary);

module.exports = router; 