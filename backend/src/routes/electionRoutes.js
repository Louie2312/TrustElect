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
router.get("/:id/student-ballot", verifyToken, isStudent, validateVotingIP, getBallotForStudent);
router.post("/:id/vote", verifyToken, isStudent, validateVotingIP, submitVote);
router.get("/:id/vote-receipt", verifyToken, isStudent, validateVotingIP, getVoteReceipt);
router.get("/:id/vote-token", verifyToken, isStudent, validateVotingIP, getVoteToken);
router.get("/:id/voter-codes", verifyToken, getVoterVerificationCodes);
router.get("/:id/votes-per-candidate", verifyToken, getVotesPerCandidate);

// Debug endpoint to check IP detection
router.get("/debug-ip", (req, res) => {
  const clientIP = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                   req.headers['x-real-ip'] ||
                   req.connection.remoteAddress ||
                   req.socket.remoteAddress ||
                   req.ip;
  
  const possibleIPs = [
    req.headers['x-forwarded-for']?.split(',')[0]?.trim(),
    req.headers['x-real-ip'],
    req.connection.remoteAddress,
    req.socket.remoteAddress,
    req.ip,
    req.ips?.[0],
    req.headers['cf-connecting-ip'],
    req.headers['x-client-ip']
  ].filter(ip => ip && ip !== '::1' && ip !== '127.0.0.1');
  
  res.json({
    detectedIP: clientIP,
    allPossibleIPs: possibleIPs,
    headers: req.headers
  });
});

// Debug endpoint for IP validation
router.get("/debug-ip-validation/:electionId", verifyToken, isStudent, async (req, res) => {
  try {
    const studentId = req.user?.studentId;
    const electionId = req.params.electionId;
    
    // Get client IP
    let clientIP = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                   req.headers['x-real-ip'] ||
                   req.connection.remoteAddress ||
                   req.socket.remoteAddress ||
                   req.ip;
    
    if (clientIP && clientIP.startsWith('::ffff:')) {
      clientIP = clientIP.substring(7);
    }
    
    if (clientIP === '::1') {
      clientIP = '127.0.0.1';
    }
    
    const { pool } = require('../config/db');
    
    // Check student assignment
    const studentAssignment = await pool.query(`
      SELECT 
        s.course_name,
        epp.precinct,
        p.id as precinct_id,
        p.name as precinct_name
      FROM students s
      JOIN election_precinct_programs epp ON epp.programs @> ARRAY[s.course_name::text]
      JOIN precincts p ON p.name = epp.precinct
      WHERE s.id = $1 AND epp.election_id = $2
    `, [studentId, electionId]);
    
    // Check registered IPs
    let registeredIPs = [];
    if (studentAssignment.rows.length > 0) {
      const ipCheck = await pool.query(`
        SELECT ip_address, ip_type
        FROM laboratory_ip_addresses 
        WHERE laboratory_precinct_id = $1 
        AND is_active = true
      `, [studentAssignment.rows[0].precinct_id]);
      registeredIPs = ipCheck.rows;
    }
    
    res.json({
      studentId,
      electionId,
      clientIP,
      studentAssignment: studentAssignment.rows[0] || null,
      registeredIPs,
      allHeaders: req.headers
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/ballot/:id/student", verifyToken, isStudent, validateVotingIP, getBallotForStudent);
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
