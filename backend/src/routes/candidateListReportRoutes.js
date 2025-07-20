const express = require('express');
const router = express.Router();
const { getCandidateList } = require('../controllers/candidateListReportController');
const { verifyToken, isSuperAdmin, isAdmin } = require('../middlewares/authMiddleware');

// Route to get candidate list report for super admin
router.get('/', verifyToken, isSuperAdmin, getCandidateList);

// Route to get candidate list report for admin
router.get('/admin/candidate-list', verifyToken, isAdmin, getCandidateList);

module.exports = router; 