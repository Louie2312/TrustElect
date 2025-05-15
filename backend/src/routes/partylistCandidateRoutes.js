const express = require("express");
const { addPartylistCandidate, getPartylistCandidates, removePartylistCandidate, updatePartylistCandidate } = require("../controllers/partylistCandidateController");
const { verifyToken, isSuperAdmin } = require("../middlewares/authMiddleware");
const router = express.Router();

// Get all candidates for a partylist - no auth for development
router.get("/partylists/:partylistId/candidates", getPartylistCandidates);

// Add a candidate to a partylist - no auth for development
router.post("/partylists/:partylistId/candidates", addPartylistCandidate);

// Remove a candidate from a partylist - no auth for development
router.delete("/candidates/:candidateId", removePartylistCandidate);

// Update a candidate - no auth for development
router.put("/candidates/:candidateId", updatePartylistCandidate);

module.exports = router; 