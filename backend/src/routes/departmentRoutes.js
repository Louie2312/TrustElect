const express = require("express");
const router = express.Router();
const { verifyToken, isSuperAdmin, isAdmin } = require("../middlewares/authMiddleware");
const departmentController = require("../controllers/departmentController");

// Get all departments - allow both admin and super admin
router.get("/departments", verifyToken, (req, res, next) => {
  console.log("Department route - User info:", {
    id: req.user?.id,
    role_id: req.user?.role_id,
    normalizedRole: req.user?.normalizedRole,
    role: req.user?.role
  });
  
  if (req.user.normalizedRole === 'Admin' || req.user.normalizedRole === 'Super Admin' || 
      req.user.role === 'Admin' || req.user.role === 'Super Admin' ||
      req.user.role_id === 1 || req.user.role_id === 2) {
    next();
  } else {
    console.log("Access denied for user:", req.user);
    return res.status(403).json({ message: "Access denied. Admin or Super Admin required." });
  }
}, departmentController.getAllDepartments);

router.get("/departments/archived", verifyToken, (req, res, next) => {
  console.log("Archived departments route - User info:", {
    id: req.user?.id,
    role_id: req.user?.role_id,
    normalizedRole: req.user?.normalizedRole,
    role: req.user?.role
  });
  
  if (req.user.normalizedRole === 'Admin' || req.user.normalizedRole === 'Super Admin' || 
      req.user.role === 'Admin' || req.user.role === 'Super Admin' ||
      req.user.role_id === 1 || req.user.role_id === 2) {
    next();
  } else {
    console.log("Access denied for archived departments for user:", req.user);
    return res.status(403).json({ message: "Access denied. Admin or Super Admin required." });
  }
}, departmentController.getArchivedDepartments);

router.get("/department-names", verifyToken, departmentController.getDepartmentNames);

router.get("/departments/:id", verifyToken, departmentController.getDepartmentById);

router.get("/departments/:id/admins", verifyToken, departmentController.getAdminsByDepartment);

router.post("/departments", verifyToken, isSuperAdmin, departmentController.createDepartment);

router.put("/departments/:id", verifyToken, isSuperAdmin, departmentController.updateDepartment);

router.delete("/departments/:id", verifyToken, isSuperAdmin, departmentController.deleteDepartment);

router.patch("/departments/:id/restore", verifyToken, (req, res, next) => {
  if (req.user.normalizedRole === 'Admin' || req.user.normalizedRole === 'Super Admin' || 
      req.user.role === 'Admin' || req.user.role === 'Super Admin' ||
      req.user.role_id === 1 || req.user.role_id === 2) {
    next();
  } else {
    return res.status(403).json({ message: "Access denied. Admin or Super Admin required." });
  }
}, departmentController.restoreDepartment);

router.delete("/departments/:id/permanent", verifyToken, (req, res, next) => {
  if (req.user.normalizedRole === 'Admin' || req.user.normalizedRole === 'Super Admin' || 
      req.user.role === 'Admin' || req.user.role === 'Super Admin' ||
      req.user.role_id === 1 || req.user.role_id === 2) {
    next();
  } else {
    return res.status(403).json({ message: "Access denied. Admin or Super Admin required." });
  }
}, departmentController.permanentDelete);

module.exports = router;  