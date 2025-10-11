const nodemailer = require('nodemailer');
const pool = require('../config/db');
const { generateUniqueCode } = require('../utils/verificationCodeGenerator');


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

  // Only systemadmin.00000 will be treated as special system account for email forwarding
  const isSuperAdmin = email.toLowerCase() === 'systemadmin.00000@novaliches.sti.edu.ph';
  
  if (isSuperAdmin) {
    return true;
  }
  
  const systemPatternResult = /^(systemadmin|admin)\.\d+@novaliches\.sti\.edu(\.ph)?$/i.test(email);
  const namePatternResult = /@novaliches\.sti\.edu(\.ph)?$/i.test(email) && email.includes('.');
  const employeeNumberPattern = /^[a-zA-Z]+\.\d{6}@novaliches\.sti\.edu(\.ph)?$/i.test(email);

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

    if (originalEmail.toLowerCase() === 'systemadmin.00000@novaliches.sti.edu.ph') {
      return process.env.ADMIN_EMAIL || 'louielouie457@gmail.com';
    }
    
    // All other accounts receive emails directly
    return originalEmail;
  } catch (error) {
    console.error('Error fetching admin forwarding email:', error);
    return originalEmail;
  }
};

const getAdminGmail = () => {
  return process.env.ADMIN_EMAIL || 'louielouie457@gmail.com';
};

const sendOTPEmail = async (userId, email, otp, purpose = 'login') => {
  try {
    const isSuperAdmin = email.toLowerCase() === 'systemadmin.00000@novaliches.sti.edu.ph';
    const originalEmail = email;

    let recipientEmail = email;
    if (isSuperAdmin) {

      recipientEmail = await getAdminForwardingEmail(originalEmail);
    } 

    const expiryTime = new Date(Date.now() + 10 * 60 * 1000);
    const formattedTime = getFormattedPhTime(expiryTime);

    let subject, title;
    if (purpose === 'reset') {
      subject = isSuperAdmin ? `[${originalEmail}] Password Reset Code` : 'Your TrustElect Password Reset Code';
      title = 'Password Reset Code';
    } else {
      subject = isSuperAdmin ? `[${originalEmail}] TrustElect Verification Code` : 'Your TrustElect Verification Code';
      title = 'Verification Code';
    }

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
            <p>Hello${isSuperAdmin ? ' Administrator' : ''},</p>
            ${isSuperAdmin ? `<p>This code is for account: <strong>${originalEmail}</strong></p>` : ''}
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
      text: `${title}: ${otp}. ${isSuperAdmin ? `For account: ${originalEmail}. ` : ''}Expires at ${formattedTime}`
    };

    if (process.env.NODE_ENV === 'development') {
      
      try {
        const info = await transporter.sendMail(mailOptions);
        
        await logEmailStatus(
          userId, 
          originalEmail, 
          'otp', 
          'sent_dev_mode', 
          info.messageId,
          null,
          isSuperAdmin,
          isSuperAdmin ? recipientEmail : null
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
        isSystemAccount: isSuperAdmin
      };
    }

    const info = await transporter.sendMail(mailOptions);
    console.log(`OTP ${otp} successfully sent to ${email}`);

    await logEmailStatus(
      userId, 
      originalEmail, 
      'otp', 
      'sent', 
      info.messageId,
      null,
      isSuperAdmin,
      isSuperAdmin ? recipientEmail : null
    );
    
    return { 
      success: true, 
      messageId: info.messageId,
      originalEmail,
      recipientEmail,
      isSystemAccount: isSuperAdmin
    };
  } catch (error) {
    console.error(`❌ ERROR SENDING OTP ${otp} to ${email}:`, error.message);
    console.error('Error stack:', error.stack);

    try {
      const isSuperAdmin = email.toLowerCase() === 'systemadmin.00000@novaliches.sti.edu.ph';
      const recipientEmail = isSuperAdmin ? await getAdminForwardingEmail(email) : email;
      
      await logEmailStatus(
        userId, 
        email, 
        'otp', 
        'failed', 
        null, 
        error.message,
        isSuperAdmin,
        isSuperAdmin ? recipientEmail : null
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
  const isSuperAdmin = email.toLowerCase() === 'systemadmin.00000@novaliches.sti.edu.ph';
  
  if (isSuperAdmin) {
    const forwardingEmail = await getAdminForwardingEmail(email);
    console.log(`Email "${email}" is a superadmin account. OTPs will be sent to ${forwardingEmail}`);
    return { 
      isSystemAccount: true,
      recipientEmail: forwardingEmail
    };
  } else {
    console.log(`Email "${email}" is a regular account. OTPs will be sent directly to ${email}`);
    return { 
      isSystemAccount: false,
      recipientEmail: email
    };
  }
};


const sendVoteReceiptEmail = async (userId, email, receiptData) => {
  try {
    console.log(`📧 sendVoteReceiptEmail called with:`, { userId, email, receiptData });
    console.log(`📧 Gmail credentials check:`, {
      user: process.env.GMAIL_USER,
      hasPassword: !!process.env.GMAIL_APP_PASSWORD,
      nodeEnv: process.env.NODE_ENV
    });
    
    const isSuperAdmin = email.toLowerCase() === 'systemadmin.00000@novaliches.sti.edu.ph';
    const originalEmail = email;

    let recipientEmail = email;
    if (isSuperAdmin) {
      recipientEmail = await getAdminForwardingEmail(originalEmail);
    }
    
    console.log(`📧 Email routing:`, { originalEmail, recipientEmail, isSuperAdmin });

    const verificationCode = generateUniqueCode(receiptData.voteToken);
    const voteDate = new Date(receiptData.voteDate).toLocaleString('en-PH', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const subject = isSuperAdmin ? `[${originalEmail}] Vote Receipt - ${receiptData.electionTitle}` : `Your Vote Receipt - ${receiptData.electionTitle}`;

    // Generate selections HTML
    const selectionsHtml = receiptData.selections.map(selection => {
      const candidatesHtml = selection.candidates.map(candidate => `
        <div style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 15px; margin: 10px 0;">
          <div style="display: flex; align-items: center; margin-bottom: 10px;">
            <div style="width: 60px; height: 60px; border-radius: 50%; background-color: #e3f2fd; display: flex; align-items: center; justify-content: center; margin-right: 15px;">
              <span style="font-size: 24px; font-weight: bold; color: #1976d2;">${candidate.name.charAt(0).toUpperCase()}</span>
            </div>
            <div>
              <h4 style="margin: 0; color: #333; font-size: 18px;">${candidate.name}</h4>
              ${candidate.party ? `<p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">${candidate.party}</p>` : ''}
            </div>
          </div>
        </div>
      `).join('');

      return `
        <div style="margin-bottom: 30px;">
          <h3 style="color: #01579B; border-bottom: 2px solid #01579B; padding-bottom: 10px; margin-bottom: 15px;">
            ${selection.position}
          </h3>
          ${candidatesHtml}
        </div>
      `;
    }).join('');

    const mailOptions = {
      from: `"STI TrustElect" <${process.env.GMAIL_USER}>`,
      to: recipientEmail,
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; background-color: #ffffff;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #01579B 0%, #0277BD 100%); padding: 25px; text-align: center; color: white; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px; font-weight: bold;">STI TrustElect</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Vote Receipt Confirmation</p>
          </div>

          <!-- Main Content -->
          <div style="padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
            <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
              Hello${isSuperAdmin ? ' Administrator' : ''},
            </p>
            ${isSuperAdmin ? `<p style="font-size: 14px; color: #666; margin-bottom: 20px;">This receipt is for account: <strong>${originalEmail}</strong></p>` : ''}
            
            <p style="font-size: 16px; color: #333; margin-bottom: 25px;">
              Thank you for participating in the election! Your vote has been successfully recorded and encrypted. 
              Below is your official vote receipt with verification details.
            </p>

            <!-- Election Info Card -->
            <div style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 10px; padding: 20px; margin-bottom: 25px;">
              <h2 style="color: #01579B; margin: 0 0 15px 0; font-size: 22px;">Election Information</h2>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div>
                  <p style="margin: 0; font-weight: bold; color: #333; font-size: 14px;">Election Title</p>
                  <p style="margin: 5px 0 0 0; color: #666; font-size: 16px;">${receiptData.electionTitle}</p>
                </div>
                <div>
                  <p style="margin: 0; font-weight: bold; color: #333; font-size: 14px;">Vote Date & Time</p>
                  <p style="margin: 5px 0 0 0; color: #666; font-size: 16px;">${voteDate}</p>
                </div>
              </div>
            </div>

            <!-- Verification Code Card -->
            <div style="background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%); border: 2px solid #2196f3; border-radius: 10px; padding: 25px; margin-bottom: 25px; text-align: center;">
              <h3 style="color: #01579B; margin: 0 0 15px 0; font-size: 20px;">Verification Code</h3>
              <div style="background-color: #ffffff; border: 2px solid #2196f3; border-radius: 8px; padding: 20px; margin: 15px 0;">
                <p style="margin: 0; font-size: 14px; color: #666; font-weight: bold;">YOUR UNIQUE VERIFICATION CODE</p>
                <div style="font-size: 32px; font-weight: bold; color: #1976d2; letter-spacing: 4px; margin: 10px 0; font-family: 'Courier New', monospace;">
                  ${verificationCode}
                </div>
                <p style="margin: 10px 0 0 0; font-size: 12px; color: #666;">Use this code to verify your vote was recorded correctly</p>
              </div>
              <div style="background-color: #ffffff; border-radius: 6px; padding: 15px; margin-top: 15px;">
                <p style="margin: 0; font-size: 12px; color: #666;">
                  <strong>Receipt ID:</strong> <span style="font-family: monospace; font-size: 11px; word-break: break-all;">${receiptData.voteToken}</span>
                </p>
              </div>
            </div>

            <!-- Student Info -->
            <div style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 10px; padding: 20px; margin-bottom: 25px;">
              <h3 style="color: #01579B; margin: 0 0 15px 0; font-size: 18px;">Voter Information</h3>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div>
                  <p style="margin: 0; font-weight: bold; color: #333; font-size: 14px;">Student Name</p>
                  <p style="margin: 5px 0 0 0; color: #666; font-size: 16px;">${receiptData.student.firstName} ${receiptData.student.lastName}</p>
                </div>
                <div>
                  <p style="margin: 0; font-weight: bold; color: #333; font-size: 14px;">Student ID</p>
                  <p style="margin: 5px 0 0 0; color: #666; font-size: 16px;">${receiptData.student.studentId}</p>
                </div>
              </div>
            </div>

            <!-- Vote Selections -->
            <div style="margin-bottom: 25px;">
              <h3 style="color: #01579B; margin: 0 0 20px 0; font-size: 20px; text-align: center;">Your Vote Selections</h3>
              ${selectionsHtml}
            </div>

            <!-- Important Notes -->
            <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 10px; padding: 20px; margin-bottom: 25px;">
              <h4 style="color: #856404; margin: 0 0 15px 0; font-size: 16px;">📋 Important Information</h4>
              <ul style="margin: 0; padding-left: 20px; color: #856404; font-size: 14px; line-height: 1.6;">
                <li style="margin-bottom: 8px;">Please save this receipt for your records as proof of your vote submission.</li>
                <li style="margin-bottom: 8px;">Use the verification code above to confirm your vote was recorded correctly.</li>
                <li style="margin-bottom: 8px;">Your vote is encrypted and stored securely in our system.</li>
                <li style="margin-bottom: 8px;">This receipt serves as official documentation of your participation in the election.</li>
              </ul>
            </div>

            <!-- Footer -->
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0; font-size: 14px; color: #666;">
                <strong>STI Novaliches - TrustElect System</strong>
              </p>
              <p style="margin: 5px 0 0 0; font-size: 12px; color: #999;">
                This is an automated message. Please do not reply to this email.
              </p>
            </div>
          </div>
        </div>
      `,
      text: `Vote Receipt - ${receiptData.electionTitle}\n\nVerification Code: ${verificationCode}\nReceipt ID: ${receiptData.voteToken}\nVote Date: ${voteDate}\n\nThank you for voting!`
    };

    // Send email directly without email_logs dependency (same as OTP emails)
    console.log(`📧 Attempting to send email with transporter...`);
    console.log(`📧 Mail options:`, {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject,
      hasHtml: !!mailOptions.html,
      hasText: !!mailOptions.text
    });
    
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Vote receipt email successfully sent to ${email}`);
    console.log(`✅ Message ID: ${info.messageId}`);
    
    return { 
      success: true, 
      messageId: info.messageId,
      verificationCode,
      originalEmail,
      recipientEmail,
      isSystemAccount: isSuperAdmin
    };
  } catch (error) {
    console.error(`❌ ERROR SENDING VOTE RECEIPT to ${email}:`, error.message);
    throw new Error(`Failed to send vote receipt email: ${error.message}`);
  }
};

module.exports = {
  sendOTPEmail,
  sendVoteReceiptEmail,
  testConnection,
  isSystemAccount,
  testSystemAccount,
  checkIfAdminEmail,
  getAdminForwardingEmail
};