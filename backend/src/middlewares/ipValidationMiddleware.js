const { getStudentLaboratoryAssignment } = require('../models/laboratoryPrecinctModel');

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

    const { pool } = require('../config/db');
    
    // Check if student is assigned to any precinct for this election
    const studentAssignment = await pool.query(`
      SELECT 
        s.course_name,
        epp.precinct,
        p.id as precinct_id,
        p.name as precinct_name
      FROM students s
      JOIN election_precinct_programs epp ON epp.programs @> ARRAY[s.course_name::text]
      JOIN precincts p ON p.name = epp.precinct
      WHERE s.id = $1 AND epp.election_id = $2
    `, [studentId, electionId]);
    
    console.log(`[IP Validation] Student assignment query result: ${studentAssignment.rows.length} rows`);
    
    // If no assignment found, deny access (strict mode)
    if (studentAssignment.rows.length === 0) {
      console.log(`[IP Validation] No precinct assignment found for student ${studentId} in election ${electionId}`);
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not assigned to any laboratory for this election. Please contact your election administrator.'
      });
    }
    
    const precinctId = studentAssignment.rows[0].precinct_id;
    const precinctName = studentAssignment.rows[0].precinct_name;
    
    console.log(`[IP Validation] Student assigned to precinct: ${precinctName} (ID: ${precinctId})`);
    
    // Check if client IP is registered for the assigned precinct
    const ipCheck = await pool.query(`
      SELECT ip_address, ip_type
      FROM laboratory_ip_addresses 
      WHERE laboratory_precinct_id = $1 
      AND is_active = true
    `, [precinctId]);
    
    console.log(`[IP Validation] Found ${ipCheck.rows.length} registered IPs for precinct ${precinctId}`);
    ipCheck.rows.forEach(row => {
      console.log(`[IP Validation] Registered IP: ${row.ip_address} (${row.ip_type})`);
    });
    
    // If no IP addresses registered for this precinct, deny access
    if (ipCheck.rows.length === 0) {
      console.log(`[IP Validation] No IP addresses registered for precinct ${precinctName}`);
      return res.status(403).json({
        success: false,
        message: `Access denied. No IP addresses are registered for your assigned laboratory: ${precinctName}. Please contact your election administrator.`
      });
    }
    
    // Check if client IP matches any registered IP
    let ipMatch = false;
    for (const ipRecord of ipCheck.rows) {
      const registeredIP = ipRecord.ip_address;
      
      // Check for exact match
      if (registeredIP === clientIP || 
          registeredIP === req.ip || 
          registeredIP === req.connection.remoteAddress ||
          registeredIP === req.socket.remoteAddress) {
        ipMatch = true;
        console.log(`[IP Validation] IP match found: ${clientIP} matches ${registeredIP}`);
        break;
      }
      
      // Check for IPv6-mapped IPv4 match
      if (clientIP.startsWith('::ffff:') && registeredIP === clientIP.substring(7)) {
        ipMatch = true;
        console.log(`[IP Validation] IPv6-mapped IP match found: ${clientIP} matches ${registeredIP}`);
        break;
      }
      
      // Check reverse IPv6-mapped match
      if (registeredIP.startsWith('::ffff:') && clientIP === registeredIP.substring(7)) {
        ipMatch = true;
        console.log(`[IP Validation] Reverse IPv6-mapped IP match found: ${clientIP} matches ${registeredIP}`);
        break;
      }
    }
    
    if (!ipMatch) {
      console.log(`[IP Validation] Access denied for student ${studentId} from IP ${clientIP} - no match found`);
      return res.status(403).json({
        success: false,
        message: `Access denied. You can only vote from your assigned laboratory: ${precinctName}. Please go to the designated laboratory to cast your vote.`
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