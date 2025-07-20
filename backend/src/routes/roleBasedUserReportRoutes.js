const express = require('express');
const router = express.Router();
const roleBasedUserReportController = require('../controllers/roleBasedUserReportController');
const { verifyToken, isSuperAdmin } = require('../middlewares/authMiddleware');


// Get role-based user summary
router.get('/summary', 
verifyToken,
isSuperAdmin,
  roleBasedUserReportController.getRoleBasedUserSummary
);

// Get role-based user details by role ID
router.get('/details/:roleId',
verifyToken,
isSuperAdmin,
  roleBasedUserReportController.getRoleBasedUserDetails
);

module.exports = router; 