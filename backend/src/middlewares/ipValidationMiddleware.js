const { getStudentLaboratoryAssignment, validateStudentVotingIP } = require('../models/laboratoryPrecinctModel');

const validateVotingIP = async (req, res, next) => {
  try {
    const studentId = req.user?.studentId;
    const electionId = req.params?.id;
    
    // Get client IP from various sources
    let clientIP = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                   req.headers['x-real-ip'] ||
                   req.connection.remoteAddress ||
                   req.socket.remoteAddress ||
                   req.ip ||
                   req.ips?.[0];
    
    // Clean IPv6-mapped IPv4 addresses
    if (clientIP && clientIP.startsWith('::ffff:')) {
      clientIP = clientIP.substring(7);
    }
    
    // Handle localhost variations
    if (clientIP === '::1') {
      clientIP = '127.0.0.1';
    }
    
    console.log(`[IP Validation] Student ${studentId}, Election ${electionId}, Client IP: ${clientIP}`);
    
    // Validate required parameters
    if (!studentId || !electionId) {
      console.log('[IP Validation] Missing studentId or electionId');
      return res.status(400).json({
        success: false,
        message: 'Student ID and Election ID are required for IP validation'
      });
    }

    // Use the database function for proper IP validation
    const isValidIP = await validateStudentVotingIP(studentId, electionId, clientIP);
    
    console.log(`[IP Validation] IP validation result: ${isValidIP}`);
    
    if (!isValidIP) {
      // Get student assignment details for better error message
      const assignment = await getStudentLaboratoryAssignment(studentId, electionId);
      const laboratoryName = assignment ? assignment.laboratory_name : 'assigned laboratory';
      
      console.log(`[IP Validation] Access denied for student ${studentId} from IP ${clientIP}`);
      
      return res.status(403).json({
        success: false,
        message: `Access denied. You can only vote from your assigned laboratory: ${laboratoryName}. Please go to the designated laboratory to cast your vote.`
      });
    }
    
    console.log(`[IP Validation] Access granted for student ${studentId} from IP ${clientIP}`);
    next();
    
  } catch (error) {
    console.error('[IP Validation] Error during IP validation:', error);
    
    // In case of error, deny access for security
    return res.status(500).json({
      success: false,
      message: 'IP validation error. Please contact your election administrator.'
    });
  }
};

module.exports = { validateVotingIP };