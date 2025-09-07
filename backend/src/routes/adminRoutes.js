const express = require("express");
const { check } = require("express-validator");
const { registerAdmin, getAllAdmins, updateAdmin, softDeleteAdmin, restoreAdmin, resetAdminPassword, permanentlyDeleteAdmin, unlockAdminAccount, getAdminProfile, uploadAdminProfilePicture} = require("../controllers/adminController");
const { verifyToken, isAdmin, isSuperAdmin } = require("../middlewares/authMiddleware");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadsDir = path.join(__dirname, '../../uploads/admins');
    // Ensure the directory exists
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, "admin-" + uniqueSuffix + ext);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

// Admin profile routes
router.get("/profile", verifyToken, isAdmin, getAdminProfile);
router.post("/upload", verifyToken, isAdmin, upload.single("profilePic"), uploadAdminProfilePicture);

// Super admin routes
router.get("/admins", verifyToken, isSuperAdmin, getAllAdmins);

router.post(
  "/admins",
  verifyToken,
  isSuperAdmin,
  [
    check("firstName", "First Name is required").not().isEmpty(),
    check("lastName", "Last Name is required").not().isEmpty(),
    check("email", "Valid email is required")
      .isEmail()
      .matches(/^[a-zA-Z0-9._%+-]+@novaliches\.sti\.edu(\.ph)?$/),
    check("employeeNumber", "Employee Number must be at least 4 digits.").isLength({ min: 4 }),
    check("department", "Department is required.").not().isEmpty(),
  ],
  registerAdmin
);

router.put("/admins/:id", verifyToken, isSuperAdmin, updateAdmin);
router.delete("/admins/:id", verifyToken, isSuperAdmin, softDeleteAdmin);
router.patch("/admins/:id/restore", verifyToken, isSuperAdmin, restoreAdmin);
router.delete("/admins/:id/permanent-delete", verifyToken, isSuperAdmin, permanentlyDeleteAdmin);
router.patch("/admins/:id/unlock", verifyToken, isSuperAdmin, unlockAdminAccount);

router.post("/admins/reset-password", verifyToken, isSuperAdmin, resetAdminPassword);

router.get("/protected", verifyToken, isSuperAdmin, (req, res) => {
  res.status(200).json({ message: "Welcome, Super Admin! This is a protected route." });
});

// Add admin's own permissions route
router.get('/permissions', verifyToken, async (req, res) => {
  try {
    // The user ID is available from the JWT token in req.user.id
    const adminId = req.user.id;
    
    // Use the existing getAdminPermissions function
    const { getAdminPermissions } = require('../models/adminPermissionModel');
    const permissions = await getAdminPermissions(adminId);
    
    // Format permissions for the frontend
    const formattedPermissions = {};
    permissions.forEach(perm => {
      formattedPermissions[perm.module] = {
        canView: perm.can_view,
        canCreate: perm.can_create,
        canEdit: perm.can_edit,
        canDelete: perm.can_delete
      };
    });
    
    res.json({ permissions: formattedPermissions });
  } catch (error) {
    console.error("Error getting admin permissions:", error);
    res.status(500).json({ message: "Failed to retrieve permissions" });
  }
});

module.exports = router;
