const pool = require("../config/db");

// Test endpoint to debug issues
exports.testVotingTimeEndpoint = async (req, res) => {
  try {
    console.log('Testing voting time endpoint...');
    
    // Test database connection
    const testQuery = await pool.query('SELECT 1 as test');
    console.log('Database connection test passed');
    
    // Test table existence
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('eligible_voters', 'elections', 'students', 'users', 'audit_logs', 'votes')
      ORDER BY table_name
    `);
    
    console.log('Available tables:', tableCheck.rows.map(r => r.table_name));
    
    // Test basic data counts
    const counts = {};
    try {
      const eligibleVotersCount = await pool.query('SELECT COUNT(*) as count FROM eligible_voters');
      counts.eligible_voters = eligibleVotersCount.rows[0].count;
    } catch (e) {
      counts.eligible_voters = 'Error: ' + e.message;
    }
    
    try {
      const electionsCount = await pool.query('SELECT COUNT(*) as count FROM elections');
      counts.elections = electionsCount.rows[0].count;
    } catch (e) {
      counts.elections = 'Error: ' + e.message;
    }
    
    try {
      const studentsCount = await pool.query('SELECT COUNT(*) as count FROM students');
      counts.students = studentsCount.rows[0].count;
    } catch (e) {
      counts.students = 'Error: ' + e.message;
    }
    
    try {
      const usersCount = await pool.query('SELECT COUNT(*) as count FROM users');
      counts.users = usersCount.rows[0].count;
    } catch (e) {
      counts.users = 'Error: ' + e.message;
    }
    
    try {
      const auditLogsCount = await pool.query('SELECT COUNT(*) as count FROM audit_logs');
      counts.audit_logs = auditLogsCount.rows[0].count;
    } catch (e) {
      counts.audit_logs = 'Error: ' + e.message;
    }
    
    try {
      const votesCount = await pool.query('SELECT COUNT(*) as count FROM votes');
      counts.votes = votesCount.rows[0].count;
    } catch (e) {
      counts.votes = 'Error: ' + e.message;
    }
    
    res.json({
      success: true,
      message: 'Voting time endpoint test completed',
      database_connection: 'OK',
      available_tables: tableCheck.rows.map(r => r.table_name),
      table_counts: counts
    });
    
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({
      success: false,
      message: 'Test endpoint failed',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

exports.getVotingTimeData = async (req, res) => {
  try {
    const { page = 1, limit = 100 } = req.query;
    const offset = (page - 1) * limit;

    console.log('Fetching voting time data with params:', { page, limit, offset });

    // Try a simple query first to test database connectivity
    try {
      const testQuery = await pool.query('SELECT 1 as test');
      console.log('Database connection test passed');
    } catch (dbError) {
      console.error('Database connection test failed:', dbError);
      return res.status(500).json({
        success: false,
        message: 'Database connection failed',
        error: dbError.message
      });
    }

    // Check if tables exist
    let tableExists = false;
    try {
      const tableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name IN ('eligible_voters', 'elections', 'students', 'users', 'audit_logs', 'votes')
        ) as tables_exist
      `);
      tableExists = tableCheck.rows[0].tables_exist;
      console.log('Tables exist:', tableExists);
    } catch (tableError) {
      console.error('Table check failed:', tableError);
      return res.status(500).json({
        success: false,
        message: 'Required database tables not found',
        error: tableError.message
      });
    }

    if (!tableExists) {
      return res.status(500).json({
        success: false,
        message: 'Required database tables are missing'
      });
    }

    // Get total count for pagination
    let totalCount = 0;
    try {
      const countQuery = `
        SELECT COUNT(*) as total FROM (
          SELECT DISTINCT ev.student_id, ev.election_id
          FROM eligible_voters ev
          JOIN elections e ON ev.election_id = e.id
        ) as distinct_voters
      `;
      const countResult = await pool.query(countQuery);
      totalCount = parseInt(countResult.rows[0].total);
      console.log('Total count:', totalCount);
    } catch (countError) {
      console.error('Count query failed:', countError);
      totalCount = 0;
    }

    // Simplified query with better error handling
    let result;
    try {
      const query = `
        SELECT 
          ev.student_id,
          ev.election_id,
          e.title as election_title,
          s.student_number as voter_id,
          s.first_name,
          s.last_name,
          s.course_name,
          -- Get login time from audit logs
          (SELECT MIN(al.created_at) 
           FROM audit_logs al 
           JOIN users u ON al.user_id = u.id
           WHERE u.email = s.email 
           AND al.action = 'LOGIN' 
           AND al.created_at >= e.date_from 
           AND al.created_at <= COALESCE(e.date_to, NOW())
          ) as login_time,
          -- Get vote submission time
          (SELECT MIN(v.created_at) 
           FROM votes v 
           WHERE v.student_id = ev.student_id 
           AND v.election_id = ev.election_id
          ) as vote_submitted_time,
          -- Get IP address and user agent from audit logs
          (SELECT al.ip_address 
           FROM audit_logs al 
           JOIN users u ON al.user_id = u.id
           WHERE u.email = s.email 
           AND al.action = 'LOGIN' 
           AND al.created_at >= e.date_from 
           AND al.created_at <= COALESCE(e.date_to, NOW())
           ORDER BY al.created_at DESC 
           LIMIT 1
          ) as ip_address,
          (SELECT al.user_agent 
           FROM audit_logs al 
           JOIN users u ON al.user_id = u.id
           WHERE u.email = s.email 
           AND al.action = 'LOGIN' 
           AND al.created_at >= e.date_from 
           AND al.created_at <= COALESCE(e.date_to, NOW())
           ORDER BY al.created_at DESC 
           LIMIT 1
          ) as user_agent,
          -- Determine voting status
          CASE 
            WHEN EXISTS(SELECT 1 FROM votes v WHERE v.student_id = ev.student_id AND v.election_id = ev.election_id)
            THEN 'Voted'
            ELSE 'Not Voted'
          END as status
        FROM eligible_voters ev
        JOIN elections e ON ev.election_id = e.id
        JOIN students s ON ev.student_id = s.id
        ORDER BY ev.student_id, e.id
        LIMIT $1 OFFSET $2
      `;

      result = await pool.query(query, [limit, offset]);
      console.log('Query result rows:', result.rows.length);
    } catch (queryError) {
      console.error('Main query failed:', queryError);
      
      // Return sample data as fallback for testing
      console.log('Returning sample data as fallback');
      const sampleData = [
        {
          student_id: 1,
          election_id: 1,
          election_title: "Sample Election",
          voter_id: "102001",
          first_name: "John",
          last_name: "Doe",
          course_name: "Computer Science",
          login_time: "2025-01-21T08:02:14.000Z",
          vote_submitted_time: "2025-01-21T08:04:45.000Z",
          ip_address: "192.168.1.20",
          user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          status: "Voted",
          session_duration: "2m 31s",
          device_browser_info: "192.168.1.20 Windows / Chrome"
        },
        {
          student_id: 2,
          election_id: 1,
          election_title: "Sample Election",
          voter_id: "102002",
          first_name: "Jane",
          last_name: "Smith",
          course_name: "Information Technology",
          login_time: "2025-01-21T08:10:32.000Z",
          vote_submitted_time: null,
          ip_address: null,
          user_agent: null,
          status: "Not Voted",
          session_duration: "—",
          device_browser_info: "—"
        }
      ];
      
      return res.json({
        success: true,
        data: sampleData,
        pagination: {
          currentPage: parseInt(page),
          totalPages: 1,
          totalCount: sampleData.length,
          hasNextPage: false,
          hasPrevPage: false
        },
        fallback: true,
        original_error: queryError.message
      });
    }
    
    // Process the results to add calculated fields
    const processedData = result.rows.map(row => {
      // Calculate session duration
      let sessionDuration = '—';
      if (row.login_time && row.vote_submitted_time) {
        const loginTime = new Date(row.login_time);
        const voteTime = new Date(row.vote_submitted_time);
        const diffSeconds = Math.floor((voteTime - loginTime) / 1000);
        if (diffSeconds > 0) {
          const minutes = Math.floor(diffSeconds / 60);
          const seconds = diffSeconds % 60;
          sessionDuration = `${minutes}m ${seconds}s`;
        }
      }

      // Format device/browser info
      let deviceBrowserInfo = '—';
      if (row.user_agent) {
        let os = 'Unknown OS';
        let browser = 'Unknown Browser';
        
        if (row.user_agent.toLowerCase().includes('windows')) os = 'Windows';
        else if (row.user_agent.toLowerCase().includes('mac')) os = 'macOS';
        else if (row.user_agent.toLowerCase().includes('linux')) os = 'Linux';
        else if (row.user_agent.toLowerCase().includes('android')) os = 'Android';
        else if (row.user_agent.toLowerCase().includes('iphone') || row.user_agent.toLowerCase().includes('ipad')) os = 'iOS';
        
        if (row.user_agent.toLowerCase().includes('chrome')) browser = 'Chrome';
        else if (row.user_agent.toLowerCase().includes('firefox')) browser = 'Firefox';
        else if (row.user_agent.toLowerCase().includes('safari')) browser = 'Safari';
        else if (row.user_agent.toLowerCase().includes('edge')) browser = 'Edge';
        else if (row.user_agent.toLowerCase().includes('opera')) browser = 'Opera';
        
        deviceBrowserInfo = `${row.ip_address || 'Unknown IP'} ${os} / ${browser}`;
      }

      return {
        ...row,
        session_duration: sessionDuration,
        device_browser_info: deviceBrowserInfo
      };
    });
    
    res.json({
      success: true,
      data: processedData,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching voting time data:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error fetching voting time data',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

exports.getVotingTimeDataByElection = async (req, res) => {
  try {
    const { electionId } = req.params;

    const result = await pool.query(`
      WITH vote_details AS (
        SELECT 
          v.student_id,
          v.election_id,
          v.created_at,
          COUNT(*) as total_votes,
          bool_or(v.is_rejected) as has_rejected_votes
        FROM votes v
        WHERE v.election_id = $1
        GROUP BY v.student_id, v.election_id, v.created_at
      )
      SELECT 
        vd.student_id,
        e.title as election_title,
        vd.created_at as timestamp,
        CASE 
          WHEN vd.has_rejected_votes THEN 'rejected'
          ELSE 'valid'
        END as status,
        CASE 
          WHEN vd.has_rejected_votes THEN 'Vote rejected due to validation failure'
          ELSE CONCAT(vd.total_votes, ' vote(s) cast successfully')
        END as details
      FROM vote_details vd
      JOIN elections e ON vd.election_id = e.id
      ORDER BY vd.created_at DESC
    `, [electionId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching voting time data for election:', error);
    res.status(500).json({ error: 'Failed to fetch voting time data for election' });
  }
}; 