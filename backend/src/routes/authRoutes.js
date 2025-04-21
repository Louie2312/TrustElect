const express = require("express");
const { check } = require("express-validator");
const { loginUser, checkEmailExists } = require("../controllers/authController");
const router = express.Router();

router.post(
  "/login",
  [
    check("email", "Valid email is required").isEmail(),
    check("password", "Password is required").not().isEmpty(),
  ],
  loginUser
);

router.post("/check-email", checkEmailExists)


module.exports = router;
