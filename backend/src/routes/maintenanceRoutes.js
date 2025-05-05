const express = require("express");
const {
  getPrograms, createProgram, updateProgram, deleteProgram,
  getElectionTypes, createElectionType, updateElectionType, deleteElectionType,
  getYearLevels, createYearLevel, updateYearLevel, deleteYearLevel,
  getGenders, createGender, updateGender, deleteGender,
  getSemesters, createSemester, updateSemester, deleteSemester,
  getPrecincts, createPrecinct, updatePrecinct, deletePrecinct,
  getPartylists, createPartylist, updatePartylist, deletePartylist,
  getCurrentSemester, setCurrentSemester
} = require("../controllers/maintenanceController");
const { verifyToken, isSuperAdmin } = require("../middlewares/authMiddleware");

const router = express.Router();

// Programs
router.get("/programs", verifyToken, getPrograms);
router.post("/programs", verifyToken, isSuperAdmin, createProgram);
router.put("/programs/:id", verifyToken, isSuperAdmin, updateProgram);
router.delete("/programs/:id", verifyToken, isSuperAdmin, deleteProgram);

// Election Types
router.get("/election-types", verifyToken,  getElectionTypes);
router.post("/election-types", verifyToken, isSuperAdmin, createElectionType);
router.put("/election-types/:id", verifyToken, isSuperAdmin, updateElectionType);
router.delete("/election-types/:id", verifyToken, isSuperAdmin, deleteElectionType);

// Year Levels
router.get("/year-levels", verifyToken,  getYearLevels);
router.post("/year-levels", verifyToken, isSuperAdmin, createYearLevel);
router.put("/year-levels/:id", verifyToken, isSuperAdmin, updateYearLevel);
router.delete("/year-levels/:id", verifyToken, isSuperAdmin, deleteYearLevel);

// Genders
router.get("/genders", verifyToken,  getGenders);
router.post("/genders", verifyToken, isSuperAdmin, createGender);
router.put("/genders/:id", verifyToken, isSuperAdmin, updateGender);
router.delete("/genders/:id", verifyToken, isSuperAdmin, deleteGender);

// Semesters
router.get("/semesters", verifyToken,  getSemesters);
router.post("/semesters", verifyToken, isSuperAdmin, createSemester);
router.put("/semesters/:id", verifyToken, isSuperAdmin, updateSemester);
router.delete("/semesters/:id", verifyToken, isSuperAdmin, deleteSemester);

// Precincts
router.get("/precincts", verifyToken, getPrecincts);
router.post("/precincts", verifyToken, isSuperAdmin, createPrecinct);
router.put("/precincts/:id", verifyToken, isSuperAdmin, updatePrecinct);
router.delete("/precincts/:id", verifyToken, isSuperAdmin, deletePrecinct);

// Partylists
router.get("/partylists", verifyToken, getPartylists);
router.post("/partylists", verifyToken, isSuperAdmin, createPartylist);
router.put("/partylists/:id", verifyToken, isSuperAdmin, updatePartylist);
router.delete("/partylists/:id", verifyToken, isSuperAdmin, deletePartylist);

// Current Semester
router.get("/current-semester", verifyToken, getCurrentSemester);
router.post("/set-current-semester", verifyToken, isSuperAdmin, setCurrentSemester);

module.exports = router;