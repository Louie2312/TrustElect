const { getStudentLaboratoryAssignment, validateStudentVotingIP } = require('../models/laboratoryPrecinctModel');

const validateVotingIP = async (req, res, next) => {
  try {
    const studentId = req.user?.studentId;
    const electionId = req.params?.id;
    
    // Get client IP
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
      return res.status(400).json({
        success: false,
        message: 'Student ID and Election ID are required for IP validation'
      });
    }

    const { pool } = require('../config/db');
    
    // Check if student is assigned to any precinct for this election
    const studentAssignment = await pool.query(`
      SELECT 
        s.course_name,
        epp.precinct,
        p.id as precinct_id
      FROM students s
      JOIN election_precinct_programs epp ON epp.programs @> ARRAY[s.course_name::text]
      JOIN precincts p ON p.name = epp.precinct
      WHERE s.id = $1 AND epp.election_id = $2
    `, [studentId, electionId]);
    
    // If no assignment found, allow voting (backward compatibility)
    if (studentAssignment.rows.length === 0) {
      return next();
    }
    
    const precinctId = studentAssignment.rows[0].precinct_id;
    const precinctName = studentAssignment.rows[0].precinct;
    
    // Check if client IP is registered for the assigned precinct
    const ipCheck = await pool.query(`
      SELECT ip_address 
      FROM laboratory_ip_addresses 
      WHERE laboratory_precinct_id = $1 
      AND is_active = true 
      AND (
        ip_address = $2 
        OR ip_address = $3
        OR ip_address = '127.0.0.1'
      )
    `, [precinctId, clientIP, clientIP.startsWith('::ffff:') ? clientIP.substring(7) : clientIP]);
    
    // If IP not found, deny access
    if (ipCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: `Access denied. You can only vote from your assigned laboratory: ${precinctName}. Please go to the designated laboratory to cast your vote.`
      });
    }
    
    // IP is valid, allow voting
    next();
    
  } catch (error) {
    // If any error occurs, allow voting (backward compatibility)
    return next();
  }
};

module.exports = { validateVotingIP };