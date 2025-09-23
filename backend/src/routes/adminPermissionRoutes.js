const express = require('express');
const router = express.Router();
const { verifyToken, isSuperAdmin, canManageAdminPermissions } = require('../middlewares/authMiddleware');
const { getPermissions, updatePermissions, checkPermissions } = require('../controllers/adminPermissionController');

router.get('/:adminId', verifyToken, canManageAdminPermissions, getPermissions);

router.put('/:adminId', verifyToken, canManageAdminPermissions, updatePermissions);

router.get('/:adminId/check', verifyToken, checkPermissions);

module.exports = router; 