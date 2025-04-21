const express = require("express");
const { check } = require("express-validator");
const { 
  registerSuperAdmin, 
  loginSuperAdmin, 
  getSuperAdminProfile, 
  updateSuperAdminProfile, 
  uploadProfilePicture 
} = require("../controllers/superAdminController");
const { verifyToken, isSuperAdmin } = require("../middlewares/authMiddleware");
const { loginLimiter } = require("../middlewares/rateLimit");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, "../../uploads/profiles");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

//If no superadmin exist
router.post(
  "/register-super-admin",
  [
    check("fullName", "Full Name is required").not().isEmpty(),
    check("password", "Password must be at least 8 characters").isLength({ min: 8 }),
  ],
  registerSuperAdmin
);


router.post(
  "/login-super-admin",
  loginLimiter,
  [
    check("email", "Valid email is required").isEmail(),
    check("password", "Password is required").not().isEmpty(),
  ],
  loginSuperAdmin
);

router.get("/protected", verifyToken, isSuperAdmin, (req, res) => {
  res.status(200).json({ message: "Welcome, Super Admin! This is a protected route." });
});


router.get("/profile", verifyToken, isSuperAdmin, getSuperAdminProfile);

router.put("/profile", verifyToken, isSuperAdmin, updateSuperAdminProfile);

router.post("/upload", verifyToken, isSuperAdmin, upload.single("profilePic"), uploadProfilePicture, (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  const filePath = `/uploads/${req.file.filename}`;
  res.json({ filePath: filePath }); 
});

// Debug route to test superadmin notifications
router.post('/test-notifications', verifyToken, async (req, res) => {
  try {
    // Only allow superadmins to use this route
    if (req.user.role !== 'SuperAdmin') {
      return res.status(403).json({ 
        success: false, 
        message: "Only superadmins can use this route" 
      });
    }
    
    const notificationService = require('../services/notificationService');
    const result = await notificationService.debugSendTestToSuperadmins();
    
    return res.status(200).json({
      success: true,
      message: `Successfully sent ${result.length} test notifications to superadmins`,
      notifications: result
    });
  } catch (error) {
    console.error('Error sending test notifications:', error);
    return res.status(500).json({
      success: false,
      message: 'Error sending test notifications',
      error: error.message
    });
  }
});

module.exports = router;