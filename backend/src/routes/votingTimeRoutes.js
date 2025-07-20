const express = require('express');
const router = express.Router();
const votingTimeController = require('../controllers/votingTimeController');
const {verifyToken, isAdmin } = require('../middlewares/authMiddleware');

// Get all voting time data
router.get('/voting-time', verifyToken, isAdmin, votingTimeController.getVotingTimeData);

// Get voting time data for a specific election
router.get('/voting-time/:electionId', verifyToken, isAdmin, votingTimeController.getVotingTimeDataByElection);

module.exports = router; 