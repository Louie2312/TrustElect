const { getStudentLaboratoryAssignment, validateStudentVotingIP } = require('../models/laboratoryPrecinctModel');

const validateVotingIP = async (req, res, next) => {
  try {
    const { studentId, electionId } = req.body;
    const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    
    // Get student's laboratory assignment for this election
    const labAssignment = await getStudentLaboratoryAssignment(studentId, electionId);
    
    // If no laboratory assignment, allow voting (backward compatibility)
    if (!labAssignment) {
      return next();
    }
    
    // Validate IP against assigned laboratory
    const isValidIP = await validateStudentVotingIP(studentId, electionId, clientIP);
    
    if (!isValidIP) {
      return res.status(403).json({
        success: false,
        message: `Access denied. You can only vote from your assigned laboratory: ${labAssignment.laboratory_name}`
      });
    }
    
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