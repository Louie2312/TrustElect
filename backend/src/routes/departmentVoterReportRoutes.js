const express = require('express');
const { getDepartmentVoterReport } = require('../controllers/departmentVoterReportController');
const { verifyToken, isAdmin } = require('../middlewares/authMiddleware');

const router = express.Router();

// Get department voter report with optional filters
router.get('/department-voter', verifyToken, isAdmin, getDepartmentVoterReport);

module.exports = router; 