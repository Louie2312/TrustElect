const jwt = require("jsonwebtoken"); //Import jsonwebtoken
const bcrypt = require("bcryptjs");
const { validationResult } = require("express-validator");
const { checkEmployeeNumberExists, registerAdmin, checkAdminEmailExists, getAllAdmins, updateAdmin, softDeleteAdmin, restoreAdmin, resetAdminPassword, deleteAdminPermanently, unlockAdminAccount, getSuperAdmins, getAdminById} = require("../models/adminModel");
const crypto = require("crypto"); 
const pool = require("../config/db");
const { setAdminPermissions } = require('../models/adminPermissionModel');

const generatePassword = (lastName, employeeNumber) => {
  const lastThreeDigits = employeeNumber.slice(-3);
  const specialChars = "!";

  return `${lastName}${lastThreeDigits}${specialChars}`;
};

exports.registerAdmin = async (req, res) => {
  try {
    console.log('Admin registration attempt with data:', req.body);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ message: "Validation failed", errors: errors.array() });
    }

    const { 
      firstName, 
      lastName, 
      email, 
      employeeNumber, 
      department, 
      password, 
      permissions 
    } = req.body;

    console.log('Extracted data:', { firstName, lastName, email, employeeNumber, department });

    const token = req.header("Authorization")?.replace("Bearer ", "") || req.cookies?.token;
    if (!token) return res.status(401).json({ message: "Unauthorized. Token is missing." });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const createdBy = decoded.id || 1; 

    if (!email.endsWith("@novaliches.sti.edu.ph") && !email.endsWith("@novaliches.sti.edu")) {
      console.log('Email domain validation failed for:', email);
      return res.status(400).json({ message: "Invalid email domain. Only @novaliches.sti.edu.ph or @novaliches.sti.edu emails are allowed." });
    }

    console.log('Email domain validation passed for:', email);

    const emailExists = await checkAdminEmailExists(email);
    const employeeNumberExists = await checkEmployeeNumberExists(employeeNumber);

    console.log('Email exists check:', emailExists);
    console.log('Employee number exists check:', employeeNumberExists);

    if (emailExists) return res.status(400).json({ message: "Email is already registered." });
    if (employeeNumberExists) return res.status(400).json({ message: "Employee Number already exists." });

    const autoPassword = generatePassword(lastName, employeeNumber);
    console.log('Generated password:', autoPassword);


    const hashedPassword = await bcrypt.hash(autoPassword, 10);
    console.log('Password hashed successfully');
    
    const username = email;
    console.log('About to register admin in database...');
    
    const newAdmin = await registerAdmin(
      firstName, 
      lastName, 
      email, 
      username, 
      hashedPassword, 
      employeeNumber, 
      department, 
      createdBy
    );
    
    console.log('Admin registered successfully:', newAdmin);


    if (permissions && typeof permissions === 'object') {
      console.log('Setting admin permissions...');
      await setAdminPermissions(newAdmin.id, permissions);
      console.log('Admin permissions set successfully');
    }

    console.log('Admin registration completed successfully');
    return res.status(201).json({
      message: "Admin registered successfully!",
      generatedPassword: autoPassword, 
      admin: {
        id: newAdmin.id,
        firstName: newAdmin.firstName,
        lastName: newAdmin.lastName,
        email: newAdmin.email,
        department: newAdmin.department,
        employeeNumber: newAdmin.employeeNumber
      }
    });

  } catch (error) {
    console.error("Error Registering Admin:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ message: "Internal Server Error.", error: error.message });
  }
};

exports.getAllAdmins = async (req, res) => {
  try {
    const regularAdmins = await getAllAdmins();
    const superAdmins = await getSuperAdmins();

    const formattedSuperAdmins = superAdmins.map(admin => ({
      ...admin,
      role_id: 1, 
      employee_number: "", 
      department: "Administration" 
    }));

    const allAdmins = [...regularAdmins, ...formattedSuperAdmins];
    
    res.json({ admins: allAdmins });
  } catch (error) {
    console.error("Error fetching admins:", error);
    res.status(500).json({ message: "Internal Server Error.", error: error.message });
  }
};

exports.getArchivedAdmins = async (req, res) => {
  try {
    // Get only archived admins using the model function directly
    const { getAllAdmins: getAllAdminsModel } = require('../models/adminModel');
    const archivedAdmins = await getAllAdminsModel(true); // Pass true for archived only
    res.json({ admins: archivedAdmins });
  } catch (error) {
    console.error("Error fetching archived admins:", error);
    res.status(500).json({ message: "Internal Server Error.", error: error.message });
  }
};

exports.updateAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      firstName, 
      lastName, 
      email, 
      employeeNumber, 
      department,
      permissions 
    } = req.body;

    if (!firstName && !lastName && !email && !employeeNumber && !department && !permissions) {
      return res.status(400).json({ message: "At least one field is required to update." });
    }

    if (email && !email.endsWith("@novaliches.sti.edu.ph") && !email.endsWith("@novaliches.sti.edu")) {
      return res.status(400).json({ message: "Invalid email domain. Only @novaliches.sti.edu.ph or @novaliches.sti.edu emails are allowed." });
    }

    const updatedAdmin = await updateAdmin(id, { 
      firstName, 
      lastName, 
      email, 
      employeeNumber, 
      department 
    });

    if (!updatedAdmin) {
      return res.status(404).json({ message: "Admin not found." });
    }

    if (permissions && typeof permissions === 'object') {
      await setAdminPermissions(id, permissions);
    }

    return res.json({ 
      message: "Admin updated successfully!", 
      admin: updatedAdmin 
    });
    
  } catch (error) {
    console.error("Error updating admin:", error);
    res.status(500).json({ message: "Internal Server Error.", error: error.message });
  }
};

exports.softDeleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user is trying to delete themselves
    if (req.user.id === parseInt(id)) {
      return res.status(403).json({ message: "You cannot delete your own account." });
    }

    // Check if the admin being deleted is a Super Admin and the current user is not a Super Admin
    const adminToDelete = await getAdminById(id);
    if (adminToDelete && adminToDelete.role_id === 1 && req.user.role_id !== 1) {
      return res.status(403).json({ message: "Only Super Admins can delete other Super Admins." });
    }

    const deletedAdmin = await softDeleteAdmin(id);
    if (!deletedAdmin) {
      return res.status(404).json({ message: "Admin not found." });
    }

    return res.json({ message: "Admin deleted successfully (soft delete).", admin: deletedAdmin });
  } catch (error) {
    console.error("Error deleting admin:", error);
    res.status(500).json({ message: "Internal Server Error.", error: error.message });
  }
};

exports.restoreAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const restoredAdmin = await restoreAdmin(id);
    if (!restoredAdmin) {
      return res.status(404).json({ message: "Admin not found or already active." });
    }

    return res.json({ message: "Admin restored successfully!", admin: restoredAdmin });
  } catch (error) {
    console.error("Error restoring admin:", error);
    res.status(500).json({ message: "Internal Server Error.", error: error.message });
  }
};

exports.resetAdminPassword = async (req, res) => {
  try {
    const { id, newPassword } = req.body;

    if (req.user.id === parseInt(id)) {
      return res.status(403).json({ message: "Super Admin cannot reset their own password." });
    }

    if (!newPassword || newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/\d/.test(newPassword) || !/[!@#$%^&*]/.test(newPassword)) {
      return res.status(400).json({
        message: "Password must be at least 8 characters long and include uppercase, lowercase, a number, and a special character.",
      });
    }

    const updatedAdmin = await resetAdminPassword(id, newPassword);
    if (!updatedAdmin) {
      return res.status(404).json({ message: "Admin not found or cannot reset password." });
    }

    return res.json({ message: "Password reset successfully! The Super Admin set a new password manually." });
  } catch (error) {
    console.error("Error resetting admin password:", error);
    res.status(500).json({ message: "Internal Server Error.", error: error.message });
  }
};

exports.permanentlyDeleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("Attempting to permanently delete admin with ID:", id);

    const adminExists = await getAdminById(id);
    console.log("Admin found:", adminExists);
    
    if (!adminExists) {
      return res.status(404).json({ message: "Admin not found." });
    }

    if (adminExists.role_id === 1) {
      return res.status(403).json({ message: "Super Admin account cannot be permanently deleted." });
    }

    const deletedAdmin = await deleteAdminPermanently(id);
    if (!deletedAdmin) {
      return res.status(500).json({ message: "Failed to delete admin permanently." });
    }

    res.status(200).json({ message: "Admin permanently deleted." });
  } catch (error) {
    console.error("Error permanently deleting admin:", error);
    res.status(500).json({ message: "Internal Server Error.", error: error.message });
  }
};

exports.unlockAdminAccount = async (req, res) => {
  try {
    const adminId = req.params.id;
    const unlockedAccount = await unlockAdminAccount(adminId);
    
    if (!unlockedAccount) {
      return res.status(404).json({ message: "Admin not found" });
    }
    
    res.status(200).json({ message: "Admin account unlocked successfully" });
  } catch (error) {
    console.error("Error unlocking admin account:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


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

exports.getAdminProfile = async (req, res) => {
  try {

    const userId = req.user.id;

    const query = `
      SELECT 
        a.id, 
        a.employee_number as "employeeNumber", 
        a.department, 
        a.profile_picture,
        u.first_name as "firstName", 
        u.last_name as "lastName", 
        u.email
      FROM admins a
      JOIN users u ON a.user_id = u.id
      WHERE u.id = $1 AND a.is_active = true
    `;

    const result = await pool.query(query, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Admin profile not found" });
    }

    const admin = result.rows[0];
    const filePath = admin.profile_picture ? `/uploads/admins/${admin.profile_picture}` : null;
    const absoluteUrl = buildAbsoluteUrl(req, filePath);

    return res.status(200).json({
      ...admin,
      profile_picture: absoluteUrl || null
    });
  } catch (error) {
    console.error("Error fetching admin profile:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.uploadAdminProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const userId = req.user.id;

    const adminQuery = "SELECT id FROM admins WHERE user_id = $1 AND is_active = true";
    const adminResult = await pool.query(adminQuery, [userId]);

    if (adminResult.rows.length === 0) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const adminId = adminResult.rows[0].id;

    const filePath = `/uploads/admins/${req.file.filename}`;
    const absoluteUrl = buildAbsoluteUrl(req, filePath);
    
    const updateQuery = "UPDATE admins SET profile_picture = $1 WHERE id = $2 RETURNING *";
    const updateResult = await pool.query(updateQuery, [req.file.filename, adminId]);

    if (updateResult.rows.length === 0) {
      return res.status(500).json({ message: "Failed to update profile picture" });
    }

    return res.status(200).json({ 
      message: "Profile picture uploaded successfully", 
      filePath: filePath,
      url: absoluteUrl
    });
  } catch (error) {
    console.error("Error uploading profile picture:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

