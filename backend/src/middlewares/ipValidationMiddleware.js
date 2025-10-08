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
    
    console.log(`[IP Validation] Student: ${studentId}, Election: ${electionId}, IP: ${clientIP}`);
    
    // Validate required parameters
    if (!studentId || !electionId) {
      return res.status(400).json({
        success: false,
        message: 'Student ID and Election ID are required for IP validation'
      });
    }

    // DIRECT SOLUTION: Check if IP is registered for Lab 101
    const { pool } = require('../config/db');
    
    // Check if student is assigned to Lab 101 for this election
    const studentAssignment = await pool.query(`
      SELECT 
        s.course_name,
        epp.precinct,
        p.id as precinct_id
      FROM students s
      JOIN election_precinct_programs epp ON epp.programs @> ARRAY[s.course_name::text]
      JOIN precincts p ON p.name = epp.precinct
      WHERE s.id = $1 AND epp.election_id = $2 AND epp.precinct = 'Lab 101'
    `, [studentId, electionId]);
    
    if (studentAssignment.rows.length === 0) {
      console.log(`[IP Validation] Student ${studentId} not assigned to Lab 101 for election ${electionId}`);
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to Lab 101 for this election. Please contact your administrator.'
      });
    }
    
    const precinctId = studentAssignment.rows[0].precinct_id;
    console.log(`[IP Validation] Student assigned to Lab 101 (ID: ${precinctId})`);
    
    // Check if client IP is registered for Lab 101
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
    
    if (ipCheck.rows.length === 0) {
      console.log(`[IP Validation] IP ${clientIP} not registered for Lab 101`);
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only vote from Lab 101. Please go to the designated laboratory to cast your vote.'
      });
    }
    
    console.log(`[IP Validation] IP ${clientIP} authorized for Lab 101`);
    next();
    
  } catch (error) {
    console.error('IP validation error:', error);
    return res.status(403).json({
      success: false,
      message: 'IP validation failed. Please contact your administrator.'
    });
  }
};

module.exports = { validateVotingIP };