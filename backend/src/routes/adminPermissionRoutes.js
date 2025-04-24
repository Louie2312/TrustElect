const express = require('express');
const router = express.Router();
const { verifyToken, isSuperAdmin } = require('../middlewares/authMiddleware');
const { getPermissions, updatePermissions, checkPermissions } = require('../controllers/adminPermissionController');

// Get permissions for an admin
router.get('/:adminId', verifyToken, isSuperAdmin, getPermissions);

// Update permissions for an admin
router.put('/:adminId', verifyToken, isSuperAdmin, updatePermissions);

// Debug endpoint to check permissions for an admin
router.get('/:adminId/check', verifyToken, checkPermissions);

module.exports = router; 