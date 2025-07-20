const express = require('express');
const router = express.Router();
const { getVoterParticipation } = require('../controllers/voterParticipationController');
const { verifyToken, isSuperAdmin, isAdmin } = require('../middlewares/authMiddleware');

// Route to get voter participation report for super admin
router.get(
  '/voter-participation',
  verifyToken,
  isSuperAdmin,
  getVoterParticipation
);

// Route to get voter participation report for admin
router.get(
  '/admin/voter-participation',
  verifyToken,
  isAdmin,
  getVoterParticipation
);

module.exports = router; 