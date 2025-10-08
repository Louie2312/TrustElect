const { getStudentLaboratoryAssignment, validateStudentVotingIP } = require('../models/laboratoryPrecinctModel');

const validateVotingIP = async (req, res, next) => {
  try {
    const studentId = req.user?.studentId;
    const electionId = req.params?.id;
    // Get client IP with better detection
    let clientIP = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                   req.headers['x-real-ip'] ||
                   req.connection.remoteAddress ||
                   req.socket.remoteAddress ||
                   req.ip;
    
    // Clean IPv6-mapped IPv4 addresses
    if (clientIP && clientIP.startsWith('::ffff:')) {
      clientIP = clientIP.substring(7);
    }
    
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

            // Try multiple IP detection methods and log all possibilities
            const possibleIPs = [
              req.headers['x-forwarded-for']?.split(',')[0]?.trim(),
              req.headers['x-real-ip'],
              req.connection.remoteAddress,
              req.socket.remoteAddress,
              req.ip,
              req.ips?.[0],
              req.headers['cf-connecting-ip'],
              req.headers['x-client-ip']
            ].filter(ip => ip && ip !== '::1' && ip !== '127.0.0.1');

            console.log(`[IP Validation] All possible IPs detected:`, possibleIPs);
    
    // Get student's laboratory assignment for this election
    let labAssignment;
    try {
      labAssignment = await getStudentLaboratoryAssignment(studentId, electionId);
      console.log(`[IP Validation] Laboratory assignment result:`, labAssignment);
    } catch (assignmentError) {
      console.error(`[IP Validation] Error getting laboratory assignment:`, assignmentError);
      // If we can't get assignment, deny access for security
      console.log(`[IP Validation] Denying access due to assignment error`);
      return res.status(403).json({
        success: false,
        message: 'Unable to verify laboratory assignment. Please contact your administrator.'
      });
    }
    
    // If no laboratory assignment, deny access for security
    if (!labAssignment) {
      console.log(`[IP Validation] No laboratory assignment found for student ${studentId}, denying access`);
      return res.status(403).json({
        success: false,
        message: 'No laboratory assignment found. Please contact your administrator to assign you to a laboratory.'
      });
    }
    
    console.log(`[IP Validation] Student assigned to laboratory: ${labAssignment.laboratory_name}`);
    
            // Validate IP against assigned laboratory
            try {
              let isValidIP = await validateStudentVotingIP(studentId, electionId, clientIP);
              console.log(`[IP Validation] IP validation result for ${clientIP}: ${isValidIP}`);

              // If first IP doesn't work, try all possible IPs
              if (!isValidIP && possibleIPs.length > 1) {
                console.log(`[IP Validation] Trying alternative IPs...`);
                for (const altIP of possibleIPs) {
                  if (altIP !== clientIP) {
                    console.log(`[IP Validation] Trying IP: ${altIP}`);
                    isValidIP = await validateStudentVotingIP(studentId, electionId, altIP);
                    if (isValidIP) {
                      console.log(`[IP Validation] Alternative IP ${altIP} is valid!`);
                      break;
                    }
                  }
                }
              }

              if (!isValidIP) {
                console.log(`[IP Validation] No valid IP found. Tried:`, [clientIP, ...possibleIPs]);
                return res.status(403).json({
                  success: false,
                  message: `Access denied. You can only vote from your assigned laboratory: ${labAssignment.laboratory_name}. Please go to the designated laboratory to cast your vote.`
                });
              }
            } catch (validationError) {
              console.error(`[IP Validation] Error validating IP:`, validationError);
              // If IP validation fails due to database error, deny access for security
              console.log(`[IP Validation] Denying access due to validation error`);
              return res.status(403).json({
                success: false,
                message: 'Unable to verify IP address. Please contact your administrator.'
              });
            }
    
    console.log(`[IP Validation] IP ${clientIP} authorized for laboratory ${labAssignment.laboratory_name}`);
    
    next();
  } catch (error) {
    console.error('IP validation error:', error);
    console.log(`[IP Validation] Denying access due to general error`);
    return res.status(403).json({
      success: false,
      message: 'IP validation failed. Please contact your administrator.'
    });
  }
};

module.exports = { validateVotingIP };