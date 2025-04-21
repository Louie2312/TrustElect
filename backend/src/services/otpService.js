const pool = require('../config/db');
const emailService = require('./emailService');

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const createOTP = async (userId, email) => {
  try {
  
    const otp = generateOTP();
 
    const expiryTime = new Date();
    expiryTime.setMinutes(expiryTime.getMinutes() + 10);

    await pool.query(
      'DELETE FROM otps WHERE user_id = $1 AND verified = FALSE',
      [userId]
    );
 
    await pool.query(
      'INSERT INTO otps (user_id, otp, expires_at) VALUES ($1, $2, $3)',
      [userId, otp, expiryTime]
    );
    
    return otp;
  } catch (error) {
    console.error('Error creating OTP:', error);
    throw error;
  }
};

const requestOTP = async (userId, email) => {
  try {

    const otp = await createOTP(userId, email);

    const emailResult = await emailService.sendOTPEmail(userId, email, otp);

    if (process.env.NODE_ENV === 'development' && emailResult.dev) {

      return {
        success: true,
        dev: true,
        otp: otp,
        email: emailResult.originalEmail,
        isSystemAccount: emailResult.isSystemAccount,
        recipientEmail: emailResult.recipientEmail
      };
    }
    
    return {
      success: true,
      email: emailResult.originalEmail,
      isSystemAccount: emailResult.isSystemAccount,
      recipientEmail: emailResult.recipientEmail
    };
  } catch (error) {
    console.error('Error requesting OTP:', error);
    throw error;
  }
};

const verifyOTP = async (userId, otpCode) => {
  try {

    await pool.query(
      'UPDATE otps SET attempts = attempts + 1 WHERE user_id = $1 AND verified = FALSE',
      [userId]
    );

    const result = await pool.query(
      `SELECT id FROM otps 
       WHERE user_id = $1 
       AND otp = $2 
       AND expires_at > NOW() 
       AND verified = FALSE 
       AND attempts <= 5`,
      [userId, otpCode]
    );
    
    if (result.rows.length === 0) {
      return false;
    }

    await pool.query(
      'UPDATE otps SET verified = TRUE WHERE id = $1',
      [result.rows[0].id]
    );
    
    return true;
  } catch (error) {
    console.error('Error verifying OTP:', error);
    throw error;
  }
};

module.exports = {
  generateOTP,
  createOTP,
  requestOTP,
  verifyOTP
};