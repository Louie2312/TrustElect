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

// DEBUG: Check IP detection - MUST be before /:id routes
router.get("/debug-ip", (req, res) => {
  const clientIP = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                   req.headers['x-real-ip'] ||
                   req.connection.remoteAddress ||
                   req.socket.remoteAddress ||
                   req.ip ||
                   req.ips?.[0];
  
  let cleanIP = clientIP;
  if (cleanIP && cleanIP.startsWith('::ffff:')) {
    cleanIP = cleanIP.substring(7);
  }
  if (cleanIP === '::1') {
    cleanIP = '127.0.0.1';
  }
  
  res.json({
    clientIP,
    cleanIP,
    req_ip: req.ip,
    connection_remoteAddress: req.connection.remoteAddress,
    socket_remoteAddress: req.socket.remoteAddress,
    x_forwarded_for: req.headers['x-forwarded-for'],
    x_real_ip: req.headers['x-real-ip'],
    all_ips: req.ips
  });
});

// DEBUG: Check IP validation for specific election
router.get("/debug-ip-validation/:electionId", verifyToken, isStudent, async (req, res) => {
  try {
    const studentId = req.user?.studentId;
    const electionId = req.params.electionId;
    
    const { pool } = require('../config/db');
    
    // Get client IP
    const clientIP = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                     req.headers['x-real-ip'] ||
                     req.connection.remoteAddress ||
                     req.socket.remoteAddress ||
                     req.ip ||
                     req.ips?.[0];
    
    let cleanIP = clientIP;
    if (cleanIP && cleanIP.startsWith('::ffff:')) {
      cleanIP = cleanIP.substring(7);
    }
    if (cleanIP === '::1') {
      cleanIP = '127.0.0.1';
    }
    
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
    
    let ipCheck = null;
    if (studentAssignment.rows.length > 0) {
      const precinctId = studentAssignment.rows[0].precinct_id;
      ipCheck = await pool.query(`
        SELECT ip_address, ip_type, is_active
        FROM laboratory_ip_addresses 
        WHERE laboratory_precinct_id = $1 AND is_active = true
      `, [precinctId]);
    }
    
    res.json({
      studentId,
      electionId,
      clientIP,
      cleanIP,
      studentAssignment: studentAssignment.rows[0] || null,
      registeredIPs: ipCheck?.rows || [],
      allPossibleIPs: [
        clientIP,
        cleanIP,
        req.ip,
        req.connection.remoteAddress,
        req.socket.remoteAddress,
        req.headers['x-forwarded-for']?.split(',')[0]?.trim(),
        req.headers['x-real-ip']
      ].filter(ip => ip && ip !== '::1' && ip !== 'undefined' && ip !== 'null')
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

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

// Ballot routes
router.get("/ballot/:id/student", verifyToken, isStudent, getBallotForStudent);

module.exports = router;