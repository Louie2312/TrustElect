const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const { getAdminByEmail } = require("../models/adminModel");
const { getStudentByEmail } = require("../models/studentModel");
const pool = require("../config/db");
require("dotenv").config();

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_TIME_MINUTES = 5;

exports.checkEmailExists = async (req, res) => {
  
  try {
    const { email } = req.body;

    if (!email || !email.endsWith("@novaliches.sti.edu.ph")) {
      return res.status(400).json({ success: false, message: "Invalid STI email format." });
    }

    const query = "SELECT id FROM users WHERE email = $1";
    const result = await pool.query(query, [email]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Email is not registered." });
    }

    return res.status(200).json({ success: true, message: "Email is valid" });

  } catch (error) {
    console.error("Error checking email:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error." });
  }
};


exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !email.endsWith("@novaliches.sti.edu.ph")) {
      return res.status(400).json({ success: false, message: "Invalid email format." });
    }

    let user = null;
    let role = null;
    let studentId = null;

    //Check if user is Super Admin
    const superAdminQuery = "SELECT * FROM users WHERE email = $1 AND role_id = 1";
    const superAdminResult = await pool.query(superAdminQuery, [email]);

    if (superAdminResult.rows.length > 0) {
      user = superAdminResult.rows[0];
      role = "Super Admin";
    }

    if (!user) {
      user = await getAdminByEmail(email);
      role = "Admin";
    }

   
    if (!user) {
      user = await getStudentByEmail(email);
      role = "Student";
      
    
      if (user) {
        const studentQuery = "SELECT id FROM students WHERE email = $1";
        const studentResult = await pool.query(studentQuery, [email]);
        if (studentResult.rows.length > 0) {
          studentId = studentResult.rows[0].id;
      
        }
      }
    }

    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    if (user.is_locked && user.locked_until > new Date()) {
      return res.status(403).json({
        success: false,
        message: `Your account is locked. Try again later.`,
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: "Account is deactivated. Contact your admin.",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      await handleFailedLogin(user.id);
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }
    await resetFailedAttempts(user.id);

    // Include studentId in token if user is a student
    const tokenPayload = { 
      id: user.id, 
      email: user.email, 
      role 
    };
    

    if (role === "Student" && studentId) {
      tokenPayload.studentId = studentId;
    }

    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET,
      { expiresIn: "6h" }
    );
    
    const response = {
      success: true,
      message: "Login successful",
      token,
      user_id: user.id,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        username: user.username,
        role,
      },
      role: role,
    };
    

    if (role === "Student" && studentId) {
      response.studentId = studentId;
    }

    res.status(200).json(response);
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error. Please try again." });
  }
};

const handleFailedLogin = async (userId) => {
  try {
    const query = `
      UPDATE users
      SET login_attempts = login_attempts + 1,
          is_locked = CASE WHEN login_attempts + 1 >= $1 THEN TRUE ELSE FALSE END,
          locked_until = CASE WHEN login_attempts + 1 >= $1 THEN NOW() + (CAST($2 AS INTEGER) * INTERVAL '1 minute') ELSE NULL END
      WHERE id = $3 RETURNING login_attempts, is_locked, locked_until;
    `;
    const result = await pool.query(query, [MAX_FAILED_ATTEMPTS, LOCK_TIME_MINUTES, userId]);

    if (result.rows.length > 0) {
      console.log(`User ${userId} failed login attempt: ${result.rows[0].login_attempts}`);
      if (result.rows[0].is_locked) {
        console.log(`User ${userId} is now locked until ${result.rows[0].locked_until}`);
      }
    }
  } catch (error) {
    console.error("Error handling failed login attempt:", error);
  }
};

const resetFailedAttempts = async (userId) => {
  try {
    const query = `
      UPDATE users
      SET login_attempts = 0, is_locked = FALSE, locked_until = NULL
      WHERE id = $1;
    `;
    await pool.query(query, [userId]);
  } catch (error) {
    console.error("Error resetting failed login attempts:", error);
  }
};

exports.studentLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Get student with both user and student info
    const student = await getStudentByEmail(email);
    if (!student) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isValidPassword = await bcrypt.compare(password, student.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid email or password" });
    }


    if (!student.student_id) {
      console.error("Student ID missing for student:", student.id);
      return res.status(500).json({ message: "Student account configuration error" });
    }

    const token = jwt.sign(
      { 
        id: student.id,
        studentId: student.student_id,
        role: "Student",
        email: student.email
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      user: {
        id: student.id,
        email: student.email,
        role: "Student",
        studentId: student.student_id
      },
      studentId: student.student_id
    });
  } catch (error) {
    console.error("Student login error:", error);
    res.status(500).json({ message: "Error during login" });
  }
};

