const pool = require("../config/db");
const { validateStudentVotingIP } = require('../models/laboratoryPrecinctModel');

const validateVotingIP = async (req, res, next) => {
  try {
    const { id: electionId } = req.params;
    const studentId = req.user.studentId;
    
    if (!studentId || !electionId) {
      return res.status(400).json({
        success: false,
        message: "Student ID and Election ID are required"
      });
    }

    // Check if student has laboratory assignment
    const laboratoryAssignment = await pool.query(`
      SELECT elp.laboratory_precinct_id, lp.name as laboratory_name
      FROM eligible_voters ev
      JOIN election_laboratory_precincts elp ON ev.election_laboratory_precinct_id = elp.id
      JOIN laboratory_precincts lp ON elp.laboratory_precinct_id = lp.id
      WHERE ev.student_id = $1 AND ev.election_id = $2
    `, [studentId, electionId]);

    if (laboratoryAssignment.rows.length > 0) {
      // Student has laboratory assignment - check IP
      const clientIP = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
                       req.headers['x-real-ip'] || 
                       req.connection.remoteAddress || 
                       req.socket.remoteAddress;
      
      const isValidIP = await validateStudentVotingIP(studentId, electionId, clientIP);
      
      if (!isValidIP) {
        return res.status(403).json({
          success: false,
          message: `You can only vote from ${laboratoryAssignment.rows[0].laboratory_name}. Please go to your assigned laboratory to cast your vote.`
        });
      }
    }

    next();
  } catch (error) {
    console.error("IP validation middleware error:", error);
    res.status(500).json({
      success: false,
      message: "IP validation failed"
    });
  }
};

module.exports = { validateVotingIP };
