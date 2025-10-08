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
      return res.status(400).json({
        success: false,
        message: 'Student ID and Election ID are required for IP validation'
      });
    }

    console.log(`[IP Validation] Student: ${studentId}, Election: ${electionId}, IP: ${clientIP}`);
    console.log(`[IP Validation] Headers:`, {
      'x-forwarded-for': req.headers['x-forwarded-for'],
      'x-real-ip': req.headers['x-real-ip'],
      'connection-remoteAddress': req.connection.remoteAddress,
      'socket-remoteAddress': req.socket.remoteAddress,
      'req.ip': req.ip
    });
    
    // Get student's laboratory assignment for this election
    const labAssignment = await getStudentLaboratoryAssignment(studentId, electionId);
    
    // If no laboratory assignment, allow voting (backward compatibility)
    if (!labAssignment) {
      console.log(`[IP Validation] No laboratory assignment found for student ${studentId}, allowing access`);
      return next();
    }
    
    console.log(`[IP Validation] Student assigned to laboratory: ${labAssignment.laboratory_name}`);
    
    // Validate IP against assigned laboratory
    const isValidIP = await validateStudentVotingIP(studentId, electionId, clientIP);
    
    if (!isValidIP) {
      console.log(`[IP Validation] IP ${clientIP} not authorized for laboratory ${labAssignment.laboratory_name}`);
      return res.status(403).json({
        success: false,
        message: `Access denied. You can only vote from your assigned laboratory: ${labAssignment.laboratory_name}. Please go to the designated laboratory to cast your vote.`
      });
    }
    
    console.log(`[IP Validation] IP ${clientIP} authorized for laboratory ${labAssignment.laboratory_name}`);
    
    next();
  } catch (error) {
    console.error('IP validation error:', error);
    return res.status(500).json({
      success: false,
      message: 'IP validation failed'
    });
  }
};

module.exports = { validateVotingIP };