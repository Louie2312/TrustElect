const express = require("express");
const {
  createBallot,
  getBallot,
  updateBallotdescription,
  deleteBallot,
  addPosition,
  updatePosition,
  deletePosition,
  addCandidate,
  updateCandidate,
  deleteCandidate,
  getBallotById,
  uploadMiddleware,
  getBallotByElection,
  uploadCandidateImage
} = require("../controllers/ballotController");
const { verifyToken, isSuperAdmin } = require("../middlewares/authMiddleware");

const router = express.Router();


router.post("/", verifyToken,  createBallot);
router.get("/", verifyToken, createBallot);
router.get("/:electionId/ballot", verifyToken, getBallotByElection);
router.put("/:ballotId/description", verifyToken,  updateBallotdescription);
router.delete("/:ballotId", verifyToken,  deleteBallot);

router.post("/:ballotId/positions", verifyToken,  addPosition);
router.put("/positions/:positionId", verifyToken,  updatePosition);
router.delete("/positions/:positionId", verifyToken,  deletePosition);

router.post(
  "/candidates/upload-image",
  verifyToken,
  
  uploadMiddleware,
  uploadCandidateImage
);

router.post(
  "/positions/:positionId/candidates",
  verifyToken,
 
  uploadMiddleware,
  addCandidate
);
router.put("/candidates/:candidateId", verifyToken, updateCandidate);
router.delete("/candidates/:candidateId", verifyToken,deleteCandidate);

module.exports = router;