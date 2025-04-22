const nodemailer = require('nodemailer');
const pool = require('../config/db');


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

const isSystemAccount = async (email) => {
  if (!email) return false;

  const systemPatternResult = /^(superadmin|admin)\.\d+@novaliches\.sti\.edu\.ph$/i.test(email);

  const namePatternResult = /@novaliches\.sti\.edu\.ph$/i.test(email) && email.includes('.');

  const employeeNumberPattern = /^[a-zA-Z]+\.\d{6}@novaliches\.sti\.edu\.ph$/i.test(email);

  if (systemPatternResult) {
    return true;
  }

  if (namePatternResult || employeeNumberPattern) {

    return checkIfAdminEmail(email);
  }
  
  return false;
};

const checkIfAdminEmail = async (email) => {
  try {
    const query = `
      SELECT COUNT(*) as count 
      FROM admins 
      WHERE email = $1
    `;
    const result = await pool.query(query, [email]);

    return result.rows[0].count > 0;
  } catch (error) {
    console.error('Error checking if email is admin:', error);
  
    return false;
  }
};

const getAdminForwardingEmail = async (originalEmail) => {
  try {
 
    const query = `
      SELECT a.forwarding_email 
      FROM admins a 
      WHERE a.email = $1 AND a.forwarding_email IS NOT NULL
    `;
    const result = await pool.query(query, [originalEmail]);
    
    if (result.rows.length > 0 && result.rows[0].forwarding_email) {
      return result.rows[0].forwarding_email;
    }
    
    // If no specific forwarding address found, use the default admin email
    return process.env.ADMIN_EMAIL || 'louielouie457@gmail.com';
  } catch (error) {
    console.error('Error fetching admin forwarding email:', error);
    return process.env.ADMIN_EMAIL || 'louielouie457@gmail.com';
  }
};

// For backward compatibility, keep the old function but use the new one internally
const getAdminGmail = () => {
  return process.env.ADMIN_EMAIL || 'louielouie457@gmail.com';
};

const sendOTPEmail = async (userId, email, otp, purpose = 'login') => {
  try {
    // Check if this is an admin account that needs email forwarding
    const isAdmin = await isSystemAccount(email);
    const originalEmail = email;

    let recipientEmail = email;
    if (isAdmin) {
      // For admin accounts, use forwarding email
      recipientEmail = await getAdminForwardingEmail(originalEmail);
      console.log(`Admin account detected. Sending OTP for ${originalEmail} to ${recipientEmail}`);
    } else {
      // For student accounts, send directly to their institutional email
      console.log(`Student account detected. Sending OTP directly to ${originalEmail}`);
    }

    const expiryTime = new Date(Date.now() + 10 * 60 * 1000);
    const formattedTime = getFormattedPhTime(expiryTime);

    // Customize subject and title based on purpose
    let subject, title;
    if (purpose === 'reset') {
      subject = isAdmin ? `[${originalEmail}] Password Reset Code` : 'Your TrustElect Password Reset Code';
      title = 'Password Reset Code';
    } else {
      subject = isAdmin ? `[${originalEmail}] TrustElect Verification Code` : 'Your TrustElect Verification Code';
      title = 'Verification Code';
    }

    // Email content
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
            <p>Your ${purpose === 'reset' ? 'password reset' : 'verification'} code is:</p>
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
      text: `${title}: ${otp}. ${isAdmin ? `For account: ${originalEmail}. ` : ''}Expires at ${formattedTime}`
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

    try {
      const isAdminAccount = await isSystemAccount(email);
      const recipientEmail = isAdminAccount ? await getAdminForwardingEmail(email) : email;
      
      await logEmailStatus(
        userId, 
        email, 
        'otp', 
        'failed', 
        null, 
        error.message,
        isAdminAccount,
        isAdminAccount ? recipientEmail : null
      );
    } catch (logError) {
      console.error('Error logging email status:', logError);
    }
    
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

const testConnection = async () => {
  try {
  
    const result = await transporter.verify();
    return { success: true };
  } catch (error) {
    console.error('Gmail connection failed:', error);
    return { success: false, error: error.message };
  }
};

const testSystemAccount = async (email) => {
  const result = await isSystemAccount(email);
  
  if (result) {
    const forwardingEmail = await getAdminForwardingEmail(email);
    console.log(`Email "${email}" is an admin account. OTPs will be sent to ${forwardingEmail}`);
    return { 
      isSystemAccount: true,
      recipientEmail: forwardingEmail
    };
  } else {
    console.log(`Email "${email}" is a regular student account. OTPs will be sent directly to ${email}`);
    return { 
      isSystemAccount: false,
      recipientEmail: email
    };
  }
};

module.exports = {
  sendOTPEmail,
  testConnection,
  isSystemAccount,
  testSystemAccount,
  checkIfAdminEmail,
  getAdminForwardingEmail
};