const express = require('express');
const router = express.Router();
const { verifyToken, isSuperAdmin, isAdmin } = require('../middlewares/authMiddleware');
const { getPermissions, updatePermissions, checkPermissions } = require('../controllers/adminPermissionController');

router.get('/:adminId', verifyToken, isSuperAdmin, isAdmin, getPermissions);

router.put('/:adminId', verifyToken, isSuperAdmin, isAdmin, updatePermissions);

router.get('/:adminId/check', verifyToken, checkPermissions);

module.exports = router; 