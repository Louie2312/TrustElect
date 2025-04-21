const jwt = require("jsonwebtoken"); //Import jsonwebtoken
const bcrypt = require("bcrypt");
const { validationResult } = require("express-validator");
const { checkEmployeeNumberExists, registerAdmin, checkAdminEmailExists, getAllAdmins, updateAdmin, softDeleteAdmin, restoreAdmin, resetAdminPassword, deleteAdminPermanently, unlockAdminAccount, getSuperAdmins, getAdminById} = require("../models/adminModel");
const crypto = require("crypto"); 
const pool = require("../config/db");

// Function to Generate Auto Password: `{lastName}{last3digits of employee#}{special char}`
const generatePassword = (lastName, employeeNumber) => {
  const lastThreeDigits = employeeNumber.slice(-3);
  const specialChars = "!@#$%^&*";
  const randomSpecialChar = specialChars[Math.floor(Math.random() * specialChars.length)];

  return `${lastName}${lastThreeDigits}${randomSpecialChar}`;
};

// Register Admin with Auto-Generated Password
exports.registerAdmin = async (req, res) => {
  try {
    console.log("🔹 Received Register Admin Request:", req.body);

    // Validate Request Body
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Validation failed", errors: errors.array() });
    }

    let { firstName, lastName, email, employeeNumber, department } = req.body;
    email = email.trim().toLowerCase();

    // Validate Token & Ensure Super Admin
    const token = req.header("Authorization")?.replace("Bearer ", "") || req.cookies?.token;
    if (!token) return res.status(401).json({ message: "Unauthorized. Token is missing." });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "Super Admin") {  
      return res.status(403).json({ message: "Access Denied. Only Super Admins can create Admins." });
    }
    const createdBy = decoded.id || 1; 

    if (!email.endsWith("@novaliches.sti.edu.ph")) {
      return res.status(400).json({ message: "Invalid email domain. Only @novaliches.sti.edu.ph emails are allowed." });
    }

    // Ensure Email & Employee Number Are Unique
    const emailExists = await checkAdminEmailExists(email);
    const employeeNumberExists = await checkEmployeeNumberExists(employeeNumber);

    if (emailExists) return res.status(400).json({ message: "Email is already registered." });
    if (employeeNumberExists) return res.status(400).json({ message: "Employee Number already exists." });

    // Generate Auto Password
    const autoPassword = generatePassword(lastName, employeeNumber);
    console.log("Generated Password:", autoPassword); // Debugging

    // Hash Password
    const hashedPassword = await bcrypt.hash(autoPassword, 10);

    // Register Admin
    console.log("Registering Admin:", firstName, lastName, email);
    const username = email;
    const newAdmin = await registerAdmin(firstName, lastName, email, username, hashedPassword, employeeNumber, department, createdBy);

    return res.status(201).json({
      message: "Admin registered successfully!",
      generatedPassword: autoPassword, //Return generated password to frontend
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
    res.status(500).json({ message: "Internal Server Error.", error: error.message });
  }
};

exports.getAllAdmins = async (req, res) => {
  try {
    const regularAdmins = await getAllAdmins();
    const superAdmins = await getSuperAdmins();
    
    // Add role and department info for super admins
    const formattedSuperAdmins = superAdmins.map(admin => ({
      ...admin,
      role_id: 1, // Super Admin role_id
      employee_number: "", // Super admins don't have employee numbers
      department: "Administration" // Default department
    }));
    
    // Combine both types of admins
    const allAdmins = [...regularAdmins, ...formattedSuperAdmins];
    
    res.json({ admins: allAdmins });
  } catch (error) {
    console.error("Error fetching admins:", error);
    res.status(500).json({ message: "Internal Server Error.", error: error.message });
  }
};

exports.updateAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, employeeNumber, department } = req.body;

    if (!firstName && !lastName && !email && !employeeNumber && !department) {
      return res.status(400).json({ message: "At least one field is required to update." });
    }

    if (email && !email.endsWith("@novaliches.sti.edu.ph")) {
      return res.status(400).json({ message: "Invalid email domain. Only @novaliches.sti.edu.ph emails are allowed." });
    }

    const updatedAdmin = await updateAdmin(id, { firstName, lastName, email, employeeNumber, department });

    if (!updatedAdmin) {
      return res.status(404).json({ message: "Admin not found." });
    }

    //Return the updated admin in response
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

    // Prevent Super Admin from deleting themselves
    if (req.user.id === parseInt(id)) {
      return res.status(403).json({ message: "You cannot delete your own Super Admin account." });
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

    // Prevent Super Admin from resetting their own password
    if (req.user.id === parseInt(id)) {
      return res.status(403).json({ message: "Super Admin cannot reset their own password." });
    }

    // Ensure password meets security requirements
    if (!newPassword || newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/\d/.test(newPassword) || !/[!@#$%^&*]/.test(newPassword)) {
      return res.status(400).json({
        message: "Password must be at least 8 characters long and include uppercase, lowercase, a number, and a special character.",
      });
    }

    // Reset password in database
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

    // Ensure the admin exists before deletion
    const adminExists = await getAdminById(id);
    console.log("Admin found:", adminExists);
    
    if (!adminExists) {
      return res.status(404).json({ message: "Admin not found." });
    }

    // Prevent deleting Super Admin account
    if (adminExists.role_id === 1) {
      return res.status(403).json({ message: "Super Admin account cannot be permanently deleted." });
    }

    // Call the model function to delete permanently
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

// Get admin profile information
exports.getAdminProfile = async (req, res) => {
  try {
    // Get the authenticated admin's user ID from the token
    const userId = req.user.id;

    // Query the database to get admin information
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
    return res.status(200).json(admin);
  } catch (error) {
    console.error("Error fetching admin profile:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Upload profile picture for admin
exports.uploadAdminProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Get the authenticated admin's user ID from the token
    const userId = req.user.id;

    // Get the admin ID from the user ID
    const adminQuery = "SELECT id FROM admins WHERE user_id = $1 AND is_active = true";
    const adminResult = await pool.query(adminQuery, [userId]);

    if (adminResult.rows.length === 0) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const adminId = adminResult.rows[0].id;

    // Update the admin's profile picture path in the database
    const filePath = `/uploads/admins/${req.file.filename}`;
    const updateQuery = "UPDATE admins SET profile_picture = $1 WHERE id = $2 RETURNING *";
    const updateResult = await pool.query(updateQuery, [filePath, adminId]);

    if (updateResult.rows.length === 0) {
      return res.status(500).json({ message: "Failed to update profile picture" });
    }

    return res.status(200).json({ 
      message: "Profile picture uploaded successfully", 
      filePath: filePath
    });
  } catch (error) {
    console.error("Error uploading profile picture:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

