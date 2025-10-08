const { getStudentLaboratoryAssignment, validateStudentVotingIP } = require('../models/laboratoryPrecinctModel');

const validateVotingIP = async (req, res, next) => {
  try {
    const studentId = req.user?.studentId;
    const electionId = req.params?.id;
    const clientIP = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
                     req.headers['x-real-ip'] || 
                     req.connection.remoteAddress || 
                     req.socket.remoteAddress ||
                     req.ip;
    
    // Validate required parameters
    if (!studentId || !electionId) {
      console.log(`[IP Validation] Missing parameters - Student: ${studentId}, Election: ${electionId}`);
      return res.status(400).json({
        success: false,
        message: 'Student ID and Election ID are required for IP validation'
      });
    }

    console.log(`[IP Validation] Starting validation - Student: ${studentId}, Election: ${electionId}, IP: ${clientIP}`);
    console.log(`[IP Validation] Headers:`, {
      'x-forwarded-for': req.headers['x-forwarded-for'],
      'x-real-ip': req.headers['x-real-ip'],
      'connection-remoteAddress': req.connection.remoteAddress,
      'socket-remoteAddress': req.socket.remoteAddress,
      'req.ip': req.ip
    });
    
    // Log all request headers for debugging
    console.log(`[IP Validation] All headers:`, req.headers);
    
    // Log additional IP detection methods
    console.log(`[IP Validation] Additional IP info:`, {
      'req.connection.remoteAddress': req.connection.remoteAddress,
      'req.socket.remoteAddress': req.socket.remoteAddress,
      'req.ip': req.ip,
      'req.ips': req.ips,
      'x-forwarded-for': req.headers['x-forwarded-for'],
      'x-real-ip': req.headers['x-real-ip'],
      'cf-connecting-ip': req.headers['cf-connecting-ip'],
      'x-client-ip': req.headers['x-client-ip']
    });
    
    // Get student's laboratory assignment for this election
    let labAssignment;
    try {
      labAssignment = await getStudentLaboratoryAssignment(studentId, electionId);
      console.log(`[IP Validation] Laboratory assignment result:`, labAssignment);
    } catch (assignmentError) {
      console.error(`[IP Validation] Error getting laboratory assignment:`, assignmentError);
      // If we can't get assignment, allow voting (backward compatibility)
      console.log(`[IP Validation] Allowing access due to assignment error (backward compatibility)`);
      return next();
    }
    
    // If no laboratory assignment, allow voting (backward compatibility)
    if (!labAssignment) {
      console.log(`[IP Validation] No laboratory assignment found for student ${studentId}, allowing access`);
      return next();
    }
    
    console.log(`[IP Validation] Student assigned to laboratory: ${labAssignment.laboratory_name}`);
    
    // Validate IP against assigned laboratory
    try {
      const isValidIP = await validateStudentVotingIP(studentId, electionId, clientIP);
      console.log(`[IP Validation] IP validation result: ${isValidIP}`);
      
      if (!isValidIP) {
        console.log(`[IP Validation] IP ${clientIP} not authorized for laboratory ${labAssignment.laboratory_name}`);
        return res.status(403).json({
          success: false,
          message: `Access denied. You can only vote from your assigned laboratory: ${labAssignment.laboratory_name}. Please go to the designated laboratory to cast your vote.`
        });
      }
    } catch (validationError) {
      console.error(`[IP Validation] Error validating IP:`, validationError);
      // If IP validation fails due to database error, allow voting for now (backward compatibility)
      console.log(`[IP Validation] Allowing access due to validation error (backward compatibility)`);
      return next();
    }
    
    console.log(`[IP Validation] IP ${clientIP} authorized for laboratory ${labAssignment.laboratory_name}`);
    
    next();
  } catch (error) {
    console.error('IP validation error:', error);
    // For now, allow voting if there's any error (backward compatibility)
    console.log(`[IP Validation] Allowing access due to general error (backward compatibility)`);
    return next();
  }
};

module.exports = { validateVotingIP };