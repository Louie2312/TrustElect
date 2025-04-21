const express = require("express");
const router = express.Router();
const { verifyToken, isSuperAdmin } = require("../middlewares/authMiddleware");
const departmentController = require("../controllers/departmentController");

// Get all departments
router.get("/departments", verifyToken, departmentController.getAllDepartments);

// Get archived departments (Super Admin only)
router.get("/departments/archived", verifyToken, isSuperAdmin, departmentController.getArchivedDepartments);

// Get all department names (for dropdown lists)
router.get("/department-names", verifyToken, departmentController.getDepartmentNames);

// Get department by ID
router.get("/departments/:id", verifyToken, departmentController.getDepartmentById);

// Get admins by department
router.get("/departments/:id/admins", verifyToken, departmentController.getAdminsByDepartment);

// Create department (Super Admin only)
router.post("/departments", verifyToken, isSuperAdmin, departmentController.createDepartment);

// Update department (Super Admin only)
router.put("/departments/:id", verifyToken, isSuperAdmin, departmentController.updateDepartment);

// Delete department (Super Admin only)
router.delete("/departments/:id", verifyToken, isSuperAdmin, departmentController.deleteDepartment);

// Restore department (Super Admin only)
router.patch("/departments/:id/restore", verifyToken, isSuperAdmin, departmentController.restoreDepartment);

module.exports = router;  