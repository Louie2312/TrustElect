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
const {
  getPositions, getPositionById, createPosition, updatePosition, deletePosition
} = require("../controllers/positionController");
const { verifyToken, isSuperAdmin } = require("../middlewares/authMiddleware");
const { checkPermission } = require("../middlewares/permissionMiddleware");

const router = express.Router();

router.get("/programs", verifyToken, getPrograms);
router.post("/programs", verifyToken, checkPermission("maintenance", "create"), createProgram);
router.put("/programs/:id", verifyToken, checkPermission("maintenance", "edit"), updateProgram);
router.delete("/programs/:id", verifyToken, checkPermission("maintenance", "delete"), deleteProgram);

router.get("/election-types", verifyToken,  getElectionTypes);
router.post("/election-types", verifyToken, checkPermission("maintenance", "create"), createElectionType);
router.put("/election-types/:id", verifyToken, checkPermission("maintenance", "edit"), updateElectionType);
router.delete("/election-types/:id", verifyToken, checkPermission("maintenance", "delete"), deleteElectionType);

router.get("/positions", verifyToken, getPositions);
router.get("/positions/:id", verifyToken, getPositionById);
router.post("/positions", verifyToken, checkPermission("maintenance", "create"), createPosition);
router.put("/positions/:id", verifyToken, checkPermission("maintenance", "edit"), updatePosition);
router.delete("/positions/:id", verifyToken, checkPermission("maintenance", "delete"), deletePosition);

router.get("/year-levels", verifyToken,  getYearLevels);
router.post("/year-levels", verifyToken, checkPermission("maintenance", "create"), createYearLevel);
router.put("/year-levels/:id", verifyToken, checkPermission("maintenance", "edit"), updateYearLevel);
router.delete("/year-levels/:id", verifyToken, checkPermission("maintenance", "delete"), deleteYearLevel);

router.get("/genders", verifyToken,  getGenders);
router.post("/genders", verifyToken, checkPermission("maintenance", "create"), createGender);
router.put("/genders/:id", verifyToken, checkPermission("maintenance", "edit"), updateGender);
router.delete("/genders/:id", verifyToken, checkPermission("maintenance", "delete"), deleteGender);

router.get("/semesters", verifyToken,  getSemesters);
router.post("/semesters", verifyToken, checkPermission("maintenance", "create"), createSemester);
router.put("/semesters/:id", verifyToken, checkPermission("maintenance", "edit"), updateSemester);
router.delete("/semesters/:id", verifyToken, checkPermission("maintenance", "delete"), deleteSemester);

router.get("/precincts", verifyToken, getPrecincts);
router.post("/precincts", verifyToken, checkPermission("maintenance", "create"), createPrecinct);
router.put("/precincts/:id", verifyToken, checkPermission("maintenance", "edit"), updatePrecinct);
router.delete("/precincts/:id", verifyToken, checkPermission("maintenance", "delete"), deletePrecinct);

router.get("/partylists", verifyToken, getPartylists);
router.post("/partylists", verifyToken, checkPermission("maintenance", "create"), createPartylist);
router.put("/partylists/:id", verifyToken, checkPermission("maintenance", "edit"), updatePartylist);
router.delete("/partylists/:id", verifyToken, checkPermission("maintenance", "delete"), deletePartylist);

router.get("/current-semester", verifyToken, getCurrentSemester);
router.post("/set-current-semester", verifyToken, checkPermission("maintenance", "edit"), setCurrentSemester);

module.exports = router;