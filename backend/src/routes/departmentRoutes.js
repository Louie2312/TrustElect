const express = require("express");
const router = express.Router();
const { verifyToken, isSuperAdmin, isAdmin } = require("../middlewares/authMiddleware");
const departmentController = require("../controllers/departmentController");

// Middleware to check if user is either Admin or Super Admin
const isAdminOrSuperAdmin = (req, res, next) => {
  console.log("isAdminOrSuperAdmin middleware - User info:", {
    id: req.user?.id,
    role_id: req.user?.role_id,
    normalizedRole: req.user?.normalizedRole,
    role: req.user?.role
  });
  
  if (req.user.normalizedRole === 'Admin' || req.user.normalizedRole === 'Super Admin' || 
      req.user.role === 'Admin' || req.user.role === 'Super Admin' ||
      req.user.role_id === 1 || req.user.role_id === 2) {
    console.log("Access granted for user:", req.user.id);
    next();
  } else {
    console.log("Access denied for user:", req.user);
    return res.status(403).json({ message: "Access denied. Admin or Super Admin required." });
  }
};

// Get all departments - allow both admin and super admin
router.get("/departments", verifyToken, (req, res, next) => {
  console.log("=== DEPARTMENT ROUTE HIT ===");
  console.log("Path:", req.path);
  console.log("Method:", req.method);
  console.log("User info:", {
    id: req.user?.id,
    role_id: req.user?.role_id,
    normalizedRole: req.user?.normalizedRole,
    role: req.user?.role
  });
  next();
}, isAdminOrSuperAdmin, departmentController.getAllDepartments);

router.get("/departments/archived", verifyToken, (req, res, next) => {
  console.log("=== ARCHIVED DEPARTMENTS ROUTE HIT ===");
  console.log("Path:", req.path);
  console.log("Method:", req.method);
  console.log("User info:", {
    id: req.user?.id,
    role_id: req.user?.role_id,
    normalizedRole: req.user?.normalizedRole,
    role: req.user?.role
  });
  next();
}, isAdminOrSuperAdmin, departmentController.getArchivedDepartments);

router.get("/department-names", verifyToken, departmentController.getDepartmentNames);

router.get("/departments/:id", verifyToken, departmentController.getDepartmentById);

router.get("/departments/:id/admins", verifyToken, departmentController.getAdminsByDepartment);

router.post("/departments", verifyToken, isAdminOrSuperAdmin, departmentController.createDepartment);

router.put("/departments/:id", verifyToken, isAdminOrSuperAdmin, departmentController.updateDepartment);

router.delete("/departments/:id", verifyToken, isAdminOrSuperAdmin, departmentController.deleteDepartment);

router.patch("/departments/:id/restore", verifyToken, isAdminOrSuperAdmin, departmentController.restoreDepartment);

router.delete("/departments/:id/permanent", verifyToken, isAdminOrSuperAdmin, departmentController.permanentDelete);

module.exports = router;  