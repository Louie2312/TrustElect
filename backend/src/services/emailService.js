// services/emailService.js
const nodemailer = require('nodemailer');
const pool = require('../config/db');

// Create Gmail transporter with simplified configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, 
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  },
  tls: {
    rejectUnauthorized: false
  }
});

const logEmailStatus = async (userId, email, emailType, status, messageId = null, errorMessage = null, isSystemAccount = false, recipientEmail = null) => {
  try {
    await pool.query(
      `INSERT INTO email_logs 
        (user_id, email, email_type, status, message_id, error_message, is_forwarded, forwarded_to)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [userId, email, emailType, status, messageId, errorMessage, isSystemAccount, recipientEmail]
    );
  } catch (error) {
    console.error('Error logging email status:', error);
  }
};

const getFormattedPhTime = (date) => {
  return new Intl.DateTimeFormat('en-PH', {
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Manila'
  }).format(date);
};

const isSystemAccount = (email) => {
  if (!email) return false;
  return /^(superadmin|admin)\.\d+@novaliches\.sti\.edu\.ph$/i.test(email);
};

const getAdminGmail = () => {
  return process.env.ADMIN_EMAIL || 'louielouie457@gmail.com';
};

const sendOTPEmail = async (userId, email, otp) => {
  try {
    const isAdmin = isSystemAccount(email);
    const originalEmail = email;

    let recipientEmail = email;
    if (isAdmin) {
      recipientEmail = getAdminGmail();
      console.log(`System account detected. Sending OTP for ${originalEmail} directly to ${recipientEmail}`);
    }

    const expiryTime = new Date(Date.now() + 10 * 60 * 1000);
    const formattedTime = getFormattedPhTime(expiryTime);

    let subject = 'Your TrustElect Verification Code';
    if (isAdmin) {
      subject = `[${originalEmail}] TrustElect Verification Code`;
    }

    // Simplified email content
    const mailOptions = {
      from: `"STI TrustElect" <${process.env.GMAIL_USER}>`,
      to: recipientEmail, 
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #01579B; padding: 15px; text-align: center; color: white;">
            <h2>STI TrustElect</h2>
          </div>
          <div style="padding: 15px; border: 1px solid #e0e0e0;">
            <p>Hello${isAdmin ? ' Administrator' : ''},</p>
            ${isAdmin ? `<p>This code is for account: <strong>${originalEmail}</strong></p>` : ''}
            <p>Your verification code is:</p>
            <div style="background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 24px; font-weight: bold; margin: 15px 0;">
              ${otp}
            </div>
            <p>This code will expire at ${formattedTime}.</p>
            <p style="font-size: 12px; color: #666;">
              If you did not request this code, please ignore this email.
            </p>
            <div style="margin-top: 20px; font-size: 12px; color: #666; text-align: center;">
              <p>STI Novaliches - TrustElect System</p>
            </div>
          </div>
        </div>
      `,
      text: `Verification code: ${otp}. ${isAdmin ? `For account: ${originalEmail}. ` : ''}Expires at ${formattedTime}`
    };

    if (process.env.NODE_ENV === 'development') {
      console.log(`🔹 [DEV MODE] OTP ${otp} for ${originalEmail}${isAdmin ? ` (would be sent to ${recipientEmail})` : ''}`);
      
      try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`DEV MODE: Email sent to ${recipientEmail}: ${info.messageId}`);
        
        await logEmailStatus(
          userId, 
          originalEmail, 
          'otp', 
          'sent_dev_mode', 
          info.messageId,
          null,
          isAdmin,
          isAdmin ? recipientEmail : null
        );
      } catch (error) {
        console.error('DEV MODE: Email sending failed:', error.message);
      }
      
      return { 
        success: true, 
        dev: true,
        otp,
        originalEmail,
        recipientEmail,
        isSystemAccount: isAdmin
      };
    }

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${recipientEmail}: ${info.messageId}`);

    await logEmailStatus(
      userId, 
      originalEmail, 
      'otp', 
      'sent', 
      info.messageId,
      null,
      isAdmin,
      isAdmin ? recipientEmail : null
    );
    
    return { 
      success: true, 
      messageId: info.messageId,
      originalEmail,
      recipientEmail,
      isSystemAccount: isAdmin
    };
  } catch (error) {
    console.error('ERROR SENDING EMAIL:', error.message);
    console.error('Error stack:', error.stack);

    await logEmailStatus(
      userId, 
      email, 
      'otp', 
      'failed', 
      null, 
      error.message,
      isSystemAccount(email),
      isSystemAccount(email) ? getAdminGmail() : null
    );
    
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

const testConnection = async () => {
  try {
    console.log('Testing SMTP connection with settings:');
    console.log(`- Gmail User: ${process.env.GMAIL_USER}`);
    console.log(`- App Password: ${process.env.GMAIL_APP_PASSWORD ? '******' : 'NOT SET'}`);
    console.log(`- Admin Email: ${getAdminGmail()}`);
    
    const result = await transporter.verify();
    console.log('Gmail connection verified:', result);
    return { success: true };
  } catch (error) {
    console.error('Gmail connection failed:', error);
    return { success: false, error: error.message };
  }
};

const testSystemAccount = (email) => {
  const result = isSystemAccount(email);
  console.log(`Email "${email}" is ${result ? 'a system account' : 'a regular account'}`);
  
  if (result) {
    console.log(`OTPs will be sent to ${getAdminGmail()}`);
  } else {
    console.log(`OTPs will be sent directly to ${email}`);
  }
  
  return { 
    isSystemAccount: result,
    recipientEmail: result ? getAdminGmail() : email
  };
};

module.exports = {
  sendOTPEmail,
  testConnection,
  isSystemAccount,
  testSystemAccount
};