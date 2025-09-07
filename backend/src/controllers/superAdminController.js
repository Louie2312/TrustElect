const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");
const fs = require("fs");
const { validationResult } = require("express-validator");
const { checkSuperAdminExists, createSuperAdmin, getSuperAdminByEmail, updateSuperAdmin } = require("../models/superAdminModel");
const multer = require("multer");
const db = require("../config/db");
require("dotenv").config();

exports.registerSuperAdmin = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { firstName, lastName, password } = req.body;

    if (await checkSuperAdminExists()) {
      return res.status(400).json({ message: "Super Admin already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = await createSuperAdmin(firstName, lastName, hashedPassword);

    res.status(201).json({ message: "Super Admin registered successfully", user: newAdmin });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


exports.loginSuperAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const superAdmin = await getSuperAdminByEmail(email);

    if (!superAdmin || !(await bcrypt.compare(password, superAdmin.password_hash))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: superAdmin.id, email: superAdmin.email, role: "Super Admin" }, // Changed from "SuperAdmin" to "Super Admin"
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.cookie("user_id", superAdmin.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
    });

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: superAdmin.id,
        firstName: superAdmin.first_name,
        lastName: superAdmin.last_name,
        email: superAdmin.email,
        username: superAdmin.username,
        role: "Super Admin", // Changed from "SuperAdmin" to "Super Admin"
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


const uploadDir = path.join(__dirname, "../../uploads/profiles");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `profile_${Date.now()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({ storage });

const buildAbsoluteUrl = (req, relativePath) => {
  if (!relativePath) return null;
  let basePath = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  // Normalize to /api/uploads if the path starts with /uploads
  if (basePath.startsWith('/uploads/')) {
    basePath = `/api${basePath}`; // serve under /api/uploads as well
  }
  const protocol = req.protocol;
  const host = req.get('host');
  return `${protocol}://${host}${basePath}`;
};

exports.uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const filePath = `/uploads/profiles/${req.file.filename}`;
    const absoluteUrl = buildAbsoluteUrl(req, filePath);

    return res.json({ success: true, filePath, url: absoluteUrl });
  } catch (error) {
    console.error("Error uploading file:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

exports.getSuperAdminProfile = async (req, res) => {
  try {
    const superAdmin = await db.query("SELECT first_name, last_name, profile_picture, email FROM users WHERE role_id = 1");

    if (!superAdmin.rows.length) {
      return res.status(404).json({ message: "Super Admin not found" });
    }

    const profile = superAdmin.rows[0];
    const filePath = profile.profile_picture ? `/uploads/profiles/${profile.profile_picture}` : null;
    const absoluteUrl = buildAbsoluteUrl(req, filePath);

    res.json({
      firstName: profile.first_name,
      lastName: profile.last_name,
      email: profile.email,
      profile_picture: absoluteUrl || null,
    });
  } catch (error) {
    console.error("Error fetching Super Admin profile:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

exports.updateSuperAdminProfile = async (req, res) => {
  try {
    let { firstName, lastName, profile_picture } = req.body;

    if (!firstName || !lastName) {
      return res.status(400).json({ message: "First Name and Last Name are required." });
    }

    const profilePicPath = (profile_picture || '').split('?')[0];
    const profilePicFilename = profilePicPath?.includes("/uploads/profiles/")
      ? profilePicPath.split("/uploads/profiles/")[1]
      : profilePicPath?.startsWith('http')
        ? profilePicPath.split('/').pop()
        : profilePicPath;

    await db.query("UPDATE users SET first_name = $1, last_name = $2, profile_picture = $3 WHERE role_id = 1", [firstName, lastName, profilePicFilename]);

    const updatedProfile = await db.query("SELECT first_name, last_name, profile_picture FROM users WHERE role_id = 1");

    if (!updatedProfile.rows.length) {
      return res.status(404).json({ message: "Super Admin not found" });
    }

    const filePath = updatedProfile.rows[0].profile_picture ? `/uploads/profiles/${updatedProfile.rows[0].profile_picture}` : null;
    const absoluteUrl = buildAbsoluteUrl(req, filePath);

    res.json({
      firstName: updatedProfile.rows[0].first_name,
      lastName: updatedProfile.rows[0].last_name,
      profile_picture: absoluteUrl || null,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current password and new password are required" });
    }
    
    if (newPassword.length < 8) {
      return res.status(400).json({ message: "New password must be at least 8 characters long" });
    }

    const superAdmin = await db.query("SELECT id, password_hash FROM users WHERE role_id = 1");
    
    if (!superAdmin.rows.length) {
      return res.status(404).json({ message: "Super Admin not found" });
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, superAdmin.rows[0].password_hash);
    
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.query("UPDATE users SET password_hash = $1 WHERE role_id = 1", [hashedPassword]);
    
    res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


