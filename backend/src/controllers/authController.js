const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const { getAdminByEmail } = require("../models/adminModel");
const { getStudentByEmail } = require("../models/studentModel");
const pool = require("../config/db");
const otpService = require('../services/otpService');
const { logAction } = require('../middlewares/auditLogMiddleware');
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
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

    if (!email || !email.endsWith("@novaliches.sti.edu.ph")) {
      return res.status(400).json({ success: false, message: "Invalid email format." });
    }

    let user = null;
    let role = null;
    let studentId = null;

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

      await logAction(
        { id: 0, email: email, role: 'Unknown' },
        'LOGIN_FAILED',
        'auth',
        null,
        { reason: 'Invalid credentials', ipAddress }
      );
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    if (user.is_locked && user.locked_until > new Date()) {
      await logAction(
        { id: user.id, email: user.email, role },
        'LOGIN_FAILED',
        'auth',
        null,
        { reason: 'Account locked', ipAddress }
      );
      return res.status(403).json({
        success: false,
        message: `Your account is locked. Try again later.`,
      });
    }

    if (!user.is_active) {

      await logAction(
        { id: user.id, email: user.email, role },
        'LOGIN_FAILED',
        'auth',
        null,
        { reason: 'Account inactive', ipAddress }
      );
      return res.status(403).json({
        success: false,
        message: "Account is deactivated. Contact your admin.",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      await handleFailedLogin(user.id);
      // Log failed login with wrong password
      await logAction(
        { id: user.id, email: user.email, role },
        'LOGIN_FAILED',
        'auth',
        null,
        { reason: 'Invalid password', ipAddress }
      );
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
      { expiresIn: "7d" }
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

    // Log successful login
    await logAction(
      { id: user.id, email: user.email, role },
      'LOGIN',
      'auth',
      user.id,
      { ipAddress, userAgent: req.headers['user-agent'] || 'unknown' }
    );

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
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

    // Get student with both user and student info
    const student = await getStudentByEmail(email);
    if (!student) {
      // Log failed student login
      await logAction(
        { id: 0, email, role: 'Student' },
        'LOGIN_FAILED',
        'auth',
        null,
        { reason: 'Invalid credentials', ipAddress }
      );
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isValidPassword = await bcrypt.compare(password, student.password);
    if (!isValidPassword) {
      // Log failed student login with wrong password
      await logAction(
        { id: student.id, email: student.email, role: 'Student' },
        'LOGIN_FAILED',
        'auth',
        student.id,
        { reason: 'Invalid password', ipAddress }
      );
      return res.status(401).json({ message: "Invalid email or password" });
    }


    if (!student.student_id) {
      console.error("Student ID missing for student:", student.id);
      // Log configuration error
      await logAction(
        { id: student.id, email: student.email, role: 'Student' },
        'LOGIN_FAILED',
        'auth',
        student.id,
        { reason: 'Configuration error', ipAddress }
      );
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
      { expiresIn: "7d" }
    );

    // Log successful student login
    await logAction(
      { id: student.id, email: student.email, role: 'Student' },
      'LOGIN',
      'auth',
      student.id,
      { ipAddress, userAgent: req.headers['user-agent'] || 'unknown' }
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

exports.requestOTP = async (req, res) => {
  try {
    const { userId, email } = req.body;
 
    if (!userId || !email) {
      return res.status(400).json({
        success: false,
        message: 'User ID and email are required'
      });
    }
    
    const result = await otpService.requestOTP(userId, email);

    if (process.env.NODE_ENV === 'development' && result.dev) {
      const maskedEmail = maskEmail(result.email);
      

      return res.status(200).json({
        success: true,
        message: `Verification code for ${maskedEmail}`,
        devMode: true,
        otp: result.otp
      });
    }
    
    if (result.isSystemAccount) {
      const maskedOriginal = maskEmail(result.email);
      const maskedRecipient = maskEmail(result.recipientEmail);
      
      return res.status(200).json({
        success: true,
        message: `Verification code for ${maskedOriginal} sent to administrator (${maskedRecipient})`,
        isSystemAccount: true
      });
    }

    const maskedEmail = maskEmail(email);
    return res.status(200).json({
      success: true,
      message: `Verification code sent to ${maskedEmail}`
    });
  } catch (error) {
    console.error('Error in requestOTP:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to send verification code'
    });
  }
};

exports.verifyOTP = async (req, res) => {
  try {
    const { userId, otp } = req.body;

    if (!userId || !otp) {
      return res.status(400).json({
        success: false,
        message: 'User ID and verification code are required'
      });
    }

    const isValid = await otpService.verifyOTP(userId, otp);
    
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Verification successful',
      verified: true
    });
  } catch (error) {
    console.error('Error in verifyOTP:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Verification failed'
    });
  }
};

exports.checkFirstLogin = async (req, res) => {
  try {
    const userId = req.userId; // From auth middleware
    
    const query = "SELECT is_first_login FROM users WHERE id = $1";
    const result = await pool.query(query, [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      isFirstLogin: result.rows[0].is_first_login
    });
  } catch (error) {
    console.error('Error checking first login status:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to check first login status'
    });
  }
};

exports.changeFirstLoginPassword = async (req, res) => {
  try {
    const userId = req.userId; 
    const { newPassword } = req.body;
    
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters'
      });
    }

    const checkQuery = "SELECT is_first_login, role_id FROM users WHERE id = $1";
    const checkResult = await pool.query(checkQuery, [userId]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const user = checkResult.rows[0];
 
    if (!user.is_first_login) {
      return res.status(400).json({
        success: false,
        message: 'This is not your first login'
      });
    }
  
    if (user.role_id !== 2 && user.role_id !== 3) {
      return res.status(403).json({
        success: false,
        message: 'Operation not allowed for this user type'
      });
    }
 
    const hashedPassword = await bcrypt.hash(newPassword, 10);
  
    const updateQuery = `
      UPDATE users
      SET password_hash = $1, is_first_login = FALSE, updated_at = NOW()
      WHERE id = $2
    `;
    
    await pool.query(updateQuery, [hashedPassword, userId]);
    
    return res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Error changing first-time password:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to change password'
    });
  }
};

function maskEmail(email) {
  if (!email) return '***@***.com';
  
  const [localPart, domain] = email.split('@');
  const maskedLocal = localPart.charAt(0) + 
                    '*'.repeat(Math.max(localPart.length - 2, 1)) + 
                    localPart.charAt(localPart.length - 1);
  return `${maskedLocal}@${domain}`;
}

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email || !email.endsWith("@novaliches.sti.edu.ph")) {
      return res.status(400).json({ 
        success: false, 
        message: "Please enter a valid STI email address." 
      });
    }
    const userQuery = "SELECT id, role_id FROM users WHERE email = $1 AND is_active = TRUE";
    const userResult = await pool.query(userQuery, [email]);
    
    if (userResult.rows.length === 0) {
      return res.status(200).json({
        success: true,
        message: "If your email is registered, you will receive a reset code."
      });
    }
    
    const userId = userResult.rows[0].id;
 
    const result = await otpService.requestOTP(userId, email);

    await pool.query(
      "UPDATE otps SET purpose = 'reset' WHERE user_id = $1 AND verified = FALSE",
      [userId]
    );

    if (process.env.NODE_ENV === 'development' && result.dev) {
      const maskedEmail = maskEmail(email);
      return res.status(200).json({
        success: true,
        message: `Password reset code for ${maskedEmail}`,
        devMode: true,
        otp: result.otp
      });
    }
    
    const maskedEmail = maskEmail(email);
    return res.status(200).json({
      success: true,
      message: `Password reset code sent to ${maskedEmail}`
    });
  } catch (error) {
    console.error('Error in forgotPassword:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process password reset request. Please try again later.'
    });
  }
};

exports.verifyResetOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and verification code are required'
      });
    }

    const userQuery = "SELECT id FROM users WHERE email = $1";
    const userResult = await pool.query(userQuery, [email]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }
    
    const userId = userResult.rows[0].id;

    const otpQuery = `
      SELECT id FROM otps 
      WHERE user_id = $1 
      AND otp = $2 
      AND expires_at > NOW() 
      AND verified = FALSE 
      AND attempts <= 5
      AND (purpose = 'reset' OR purpose IS NULL)
    `;
    
    const otpResult = await pool.query(otpQuery, [userId, otp]);
    
    if (otpResult.rows.length === 0) {
      await pool.query(
        'UPDATE otps SET attempts = attempts + 1 WHERE user_id = $1 AND verified = FALSE',
        [userId]
      );
      
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code'
      });
    }

    await pool.query(
      'UPDATE otps SET verified = TRUE WHERE id = $1',
      [otpResult.rows[0].id]
    );

    const resetToken = jwt.sign(
      { userId, purpose: 'reset' },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );
    
    return res.status(200).json({
      success: true,
      message: 'Verification successful',
      resetToken
    });
  } catch (error) {
    console.error('Error in verifyResetOTP:', error);
    return res.status(500).json({
      success: false,
      message: 'Verification failed. Please try again.'
    });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;
    
    if (!resetToken || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Reset token and new password are required'
      });
    }
    
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters'
      });
    }
    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
      
      if (decoded.purpose !== 'reset') {
        throw new Error('Invalid token purpose');
      }
    } catch (tokenError) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const updateQuery = `
      UPDATE users
      SET password_hash = $1, updated_at = NOW(), is_first_login = FALSE
      WHERE id = $2
      RETURNING id, email
    `;
    
    const updateResult = await pool.query(updateQuery, [hashedPassword, decoded.userId]);
    
    if (updateResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Password reset successful'
    });
  } catch (error) {
    console.error('Error in resetPassword:', error);
    return res.status(500).json({
      success: false,
      message: 'Password reset failed. Please try again.'
    });
  }
};

// Add a new logout endpoint
exports.logoutUser = async (req, res) => {
  try {
    let userData = null;
    
    // First try to get user data from authenticated request
    if (req.user) {
      userData = { 
        id: req.user.id, 
        email: req.user.email, 
        role: req.user.role || 'Unknown' 
      };
    } 
    // If not authenticated, try to get user info from request body
    else if (req.body.userId || req.body.email) {
      userData = {
        id: req.body.userId || 0,
        email: req.body.email || 'unknown@example.com',
        role: req.body.role || 'Unknown'
      };
    }
    
    // Log the logout action if we have user data
    if (userData) {
      await logAction(
        userData,
        'LOGOUT',
        'auth',
        userData.id !== 0 ? userData.id : null,
        { 
          ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        }
      );
    }

    res.status(200).json({ 
      success: true, 
      message: "Logout successful" 
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ success: false, message: "Error processing logout" });
  }
};