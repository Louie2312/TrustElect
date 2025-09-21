const express = require("express");
const router = express.Router();
const { verifyToken, isSuperAdmin } = require("../middlewares/authMiddleware");
const departmentController = require("../controllers/departmentController");

// Get all departments
router.get("/departments", verifyToken, departmentController.getAllDepartments);

router.get("/departments/archived", verifyToken, isSuperAdmin, departmentController.getArchivedDepartments);

router.get("/department-names", verifyToken, departmentController.getDepartmentNames);

router.get("/departments/:id", verifyToken, departmentController.getDepartmentById);

router.get("/departments/:id/admins", verifyToken, departmentController.getAdminsByDepartment);

router.post("/departments", verifyToken, isSuperAdmin, departmentController.createDepartment);

router.put("/departments/:id", verifyToken, isSuperAdmin, departmentController.updateDepartment);

router.delete("/departments/:id", verifyToken, isSuperAdmin, departmentController.deleteDepartment);

router.patch("/departments/:id/restore", verifyToken, isSuperAdmin, departmentController.restoreDepartment);

router.delete("/departments/:id/permanent", verifyToken, isSuperAdmin, departmentController.permanentDelete);

module.exports = router;  