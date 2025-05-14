const express = require('express');
const router = express.Router();
const { verifyToken, isSuperAdmin } = require('../middlewares/authMiddleware');
const { getPermissions, updatePermissions, checkPermissions } = require('../controllers/adminPermissionController');

router.get('/:adminId', verifyToken, isSuperAdmin, getPermissions);

router.put('/:adminId', verifyToken, isSuperAdmin, updatePermissions);

router.get('/:adminId/check', verifyToken, checkPermissions);

module.exports = router; 