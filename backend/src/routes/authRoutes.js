const express = require("express");
const { check } = require("express-validator");
const { 
  loginUser, 
  checkEmailExists, 
  requestOTP, 
  verifyOTP,
  checkFirstLogin,
  changeFirstLoginPassword
} = require("../controllers/authController");
const { verifyToken } = require("../middlewares/authMiddleware");
const router = express.Router();

router.post(
  "/login",
  [
    check("email", "Valid email is required").isEmail(),
    check("password", "Password is required").not().isEmpty(),
  ],
  loginUser
);

router.post("/check-email", checkEmailExists);

router.post('/request-otp', requestOTP);
router.post('/verify-otp', verifyOTP);

// First-time login password change routes
router.get('/check-first-login', verifyToken, checkFirstLogin);
router.post('/change-first-password', verifyToken, [
  check("newPassword", "Password must be at least 8 characters").isLength({ min: 8 }),
], changeFirstLoginPassword);

module.exports = router;
