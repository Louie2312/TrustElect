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
    
    // Check if IP validation is enabled by checking if tables exist
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'election_precinct_programs'
      ) as table_exists
    `);
    
    if (!tableCheck.rows[0].table_exists) {
      console.log('[IP Validation] IP validation tables not found, allowing access');
      return next();
    }
    
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
    
    // If no assignment found, allow access (IP validation not configured)
    if (studentAssignment.rows.length === 0) {
      console.log(`[IP Validation] No precinct assignment found for student ${studentId} in election ${electionId}, allowing access`);
      return next();
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
    
    // If no IP addresses registered for this precinct, allow access
    if (ipCheck.rows.length === 0) {
      console.log(`[IP Validation] No IP addresses registered for precinct ${precinctName}, allowing access`);
      return next();
    }
    
    // Check if client IP matches any registered IP
    let ipMatch = false;
    const possibleIPs = [
      clientIP,
      req.ip,
      req.connection.remoteAddress,
      req.socket.remoteAddress,
      req.headers['x-forwarded-for']?.split(',')[0]?.trim(),
      req.headers['x-real-ip']
    ].filter(ip => ip && ip !== '::1');
    
    for (const ipRecord of ipCheck.rows) {
      const registeredIP = ipRecord.ip_address;
      
      for (const possibleIP of possibleIPs) {
        // Clean the possible IP
        let cleanIP = possibleIP;
        if (cleanIP && cleanIP.startsWith('::ffff:')) {
          cleanIP = cleanIP.substring(7);
        }
        if (cleanIP === '::1') {
          cleanIP = '127.0.0.1';
        }
        
        // Check for exact match
        if (registeredIP === cleanIP) {
          ipMatch = true;
          console.log(`[IP Validation] IP match found: ${cleanIP} matches ${registeredIP}`);
          break;
        }
      }
      
      if (ipMatch) break;
    }
    
    if (!ipMatch) {
      console.log(`[IP Validation] Access denied for student ${studentId} from IP ${clientIP} - no match found`);
      console.log(`[IP Validation] Possible IPs checked: ${possibleIPs.join(', ')}`);
      console.log(`[IP Validation] Registered IPs: ${ipCheck.rows.map(r => r.ip_address).join(', ')}`);
      
      return res.status(403).json({
        success: false,
        message: `Access denied. You can only vote from your assigned laboratory: ${precinctName}. Please go to the designated laboratory to cast your vote.`
      });
    }
    
    console.log(`[IP Validation] Access granted for student ${studentId} from IP ${clientIP}`);
    next();
    
  } catch (error) {
    console.error('[IP Validation] Error during IP validation:', error);
    
    // In case of error, allow access
    console.log('[IP Validation] Allowing access due to error');
    next();
  }
};

module.exports = { validateVotingIP };