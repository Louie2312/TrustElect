const express = require("express");
const {
    createElection,
    getElections,
    getElectionById,
    updateElection,
    deleteElection,
    previewEligibleVoters,
    getElectionVoters,
    getElectionsByStatus,
    getElectionStats,
    getElectionDetails,
    getElectionEligibilityCriteria,
    updateElectionStatuses,
    checkStudentEligibility,
    getBallotForStudent,
    getBallotForVoting,
    submitVote,
    getVoteReceipt,
    getVoteToken,
    approveElection,
    rejectElection,
    getPendingApprovalElections,
    sendResultNotifications,
    getStudentElectionStatus,
    updateElectionCriteria,
    getCompletedElectionResults,
    getVoterVerificationCodes,
    getVotesPerCandidate
} = require("../controllers/electionController");
const {
    getBallotByElection
} = require("../controllers/ballotController");
const { verifyToken, isSuperAdmin, isAdmin, isStudent, verifyStudentRecord } = require("../middlewares/authMiddleware");
const { validateVotingIP } = require("../middlewares/ipValidationMiddleware");
const electionStatusService = require('../services/electionStatusService');
const router = express.Router();

// Public routes for landing page (no authentication required)
router.get("/public/status/:status", getElectionsByStatus);

// Election creation and management
router.post("/", verifyToken, createElection);
router.post("/preview-voters", verifyToken, previewEligibleVoters);
router.get("/", verifyToken, getElections);
router.get("/status/:status", verifyToken, getElectionsByStatus);
router.get("/stats", verifyToken, getElectionStats);
router.post("/update-statuses", verifyToken, updateElectionStatuses);

// Get elections pending approval (these need to come BEFORE /:id routes)
router.get("/pending-approval", verifyToken, isSuperAdmin, getPendingApprovalElections);
router.get("/admin-pending-approval", verifyToken, isAdmin, getPendingApprovalElections);

// Routes with :id parameter
router.get('/:id/voters', verifyToken, getElectionVoters);
router.get('/:id/details', verifyToken, getElectionDetails);
router.get('/:id/criteria', verifyToken, getElectionEligibilityCriteria);
router.put('/:id/criteria', verifyToken, updateElectionCriteria);
router.get("/:id/ballot", verifyToken, getBallotByElection);
router.get('/completed/:id/results', verifyToken, getCompletedElectionResults);
router.get("/:id", verifyToken, getElectionById);
router.put("/:id", verifyToken, updateElection);
router.delete("/:id", verifyToken, deleteElection);

router.post("/:id/approve", verifyToken, isSuperAdmin, approveElection);
router.post("/:id/reject", verifyToken, isSuperAdmin, rejectElection);
router.post("/:id/send-result-notifications", verifyToken, (req, res, next) => {
    if (req.user.role === 'Admin' || req.user.role === 'SuperAdmin') {
        next();
    } else {
        return res.status(403).json({
            success: false,
            message: "Access denied. Only admins and superadmins can send result notifications."
        });
    }
}, sendResultNotifications);

router.get("/:id/student-eligible", verifyToken, isStudent, verifyStudentRecord, checkStudentEligibility);
router.get("/:id/student-ballot", verifyToken, isStudent, getBallotForStudent);
router.post("/:id/vote", verifyToken, isStudent, submitVote);
router.get("/:id/vote-receipt", verifyToken, isStudent, getVoteReceipt);
router.get("/:id/vote-token", verifyToken, isStudent, getVoteToken);
router.get("/:id/voter-codes", verifyToken, getVoterVerificationCodes);
router.get("/:id/votes-per-candidate", verifyToken, getVotesPerCandidate);

router.get("/ballot/:id/student", verifyToken, getBallotForStudent);
router.get("/ballot/:id/voting", verifyToken, getBallotForVoting);
router.get("/student/status/:id", verifyToken, getStudentElectionStatus);

// Add this route to your existing electionRoutes.js file
// (add after your existing routes)

// Manual trigger for election status updates (for testing)
router.post('/trigger-status-update', verifyToken, isSuperAdmin, async (req, res) => {
  try {
    console.log('[MANUAL TRIGGER] Running election status update...');
    const result = await electionStatusService.updateElectionStatuses();
    
    res.json({
      success: true,
      message: 'Election status update completed',
      data: {
        processedElections: result.statusChanges?.length || 0,
        statusChanges: result.statusChanges || [],
        newlyCompletedElections: result.newlyCompletedElections?.length || 0
      }
    });
  } catch (error) {
    console.error('[MANUAL TRIGGER] Error updating election statuses:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update election statuses',
      error: error.message
    });
  }
});

module.exports = router;
