const express = require("express");
const { 
  addPartylistCandidate, 
  getPartylistCandidates, 
  removePartylistCandidate, 
  updatePartylistCandidate,
  getStudentPartylist,
  uploadCandidateImage
} = require("../controllers/partylistCandidateController");
const { verifyToken, isSuperAdmin} = require("../middlewares/authMiddleware");
const { checkPermission } = require("../middlewares/permissionMiddleware");
const { candidateUploadMiddleware } = require("../middlewares/candidateUploadMiddleware");
const router = express.Router();

// Get all candidates for a partylist
router.get("/:partylistId/candidates", getPartylistCandidates);

// Add a candidate to a partylist
router.post("/:partylistId/candidates", verifyToken, checkPermission("manage_partylists"), addPartylistCandidate);

// Remove a candidate from a partylist
router.delete("/candidates/:candidateId",  verifyToken, checkPermission("manage_partylists"), removePartylistCandidate);

// Update a candidate
router.put("/candidates/:candidateId",  verifyToken, checkPermission("manage_partylists"), updatePartylistCandidate);

// Get student's partylist
router.get("/student/:studentNumber", verifyToken, getStudentPartylist);

// Image upload route
router.post(
  "/upload-image",
  verifyToken,
  checkPermission("manage_partylists"),
  candidateUploadMiddleware.single("image"),
  uploadCandidateImage
);

module.exports = router; 