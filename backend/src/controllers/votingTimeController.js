const pool = require("../config/db");

exports.getVotingTimeData = async (req, res) => {
  try {
    const { page = 1, limit = 100 } = req.query;
    const offset = (page - 1) * limit;

    console.log('Fetching voting time data with params:', { page, limit, offset });

    // Get total count for pagination - count all eligible voters
    const countQuery = `
      SELECT COUNT(*) as total FROM (
        SELECT DISTINCT ev.student_id, ev.election_id
        FROM eligible_voters ev
        JOIN elections e ON ev.election_id = e.id
      ) as distinct_voters
    `;
    const countResult = await pool.query(countQuery);
    const totalCount = parseInt(countResult.rows[0].total);

    console.log('Total count:', totalCount);

    // Get comprehensive voting activity data
    const query = `
      WITH voter_activity AS (
        SELECT 
          ev.student_id,
          ev.election_id,
          e.title as election_title,
          e.id as election_id,
          s.student_number,
          s.first_name,
          s.last_name,
          s.course_name,
          -- Get login time from audit logs
          (SELECT MIN(al.created_at) 
           FROM audit_logs al 
           WHERE al.user_id = u.id 
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
          -- Get session duration (time between login and vote)
          (SELECT 
            CASE 
              WHEN MIN(al.created_at) IS NOT NULL AND MIN(v.created_at) IS NOT NULL 
              THEN EXTRACT(EPOCH FROM (MIN(v.created_at) - MIN(al.created_at)))::INTEGER
              ELSE NULL 
            END
           FROM audit_logs al, votes v
           WHERE al.user_id = u.id 
           AND al.action = 'LOGIN' 
           AND al.created_at >= e.date_from 
           AND al.created_at <= COALESCE(e.date_to, NOW())
           AND v.student_id = ev.student_id 
           AND v.election_id = ev.election_id
          ) as session_duration_seconds,
          -- Get IP address and user agent from audit logs
          (SELECT al.ip_address 
           FROM audit_logs al 
           WHERE al.user_id = u.id 
           AND al.action = 'LOGIN' 
           AND al.created_at >= e.date_from 
           AND al.created_at <= COALESCE(e.date_to, NOW())
           ORDER BY al.created_at DESC 
           LIMIT 1
          ) as ip_address,
          (SELECT al.user_agent 
           FROM audit_logs al 
           WHERE al.user_id = u.id 
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
        JOIN users u ON s.email = u.email
        ORDER BY ev.student_id, e.id
      )
      SELECT 
        student_id,
        election_id,
        election_title,
        student_number as voter_id,
        first_name,
        last_name,
        course_name,
        login_time,
        vote_submitted_time,
        session_duration_seconds,
        ip_address,
        user_agent,
        status,
        -- Format session duration
        CASE 
          WHEN session_duration_seconds IS NOT NULL 
          THEN CONCAT(
            FLOOR(session_duration_seconds / 60), 'm ',
            (session_duration_seconds % 60), 's'
          )
          ELSE '—'
        END as session_duration,
        -- Format device/browser info
        CASE 
          WHEN user_agent IS NOT NULL 
          THEN CONCAT(
            COALESCE(ip_address, 'Unknown IP'), ' ',
            CASE 
              WHEN user_agent ILIKE '%windows%' THEN 'Windows'
              WHEN user_agent ILIKE '%mac%' THEN 'macOS'
              WHEN user_agent ILIKE '%linux%' THEN 'Linux'
              WHEN user_agent ILIKE '%android%' THEN 'Android'
              WHEN user_agent ILIKE '%iphone%' OR user_agent ILIKE '%ipad%' THEN 'iOS'
              ELSE 'Unknown OS'
            END, ' / ',
            CASE 
              WHEN user_agent ILIKE '%chrome%' THEN 'Chrome'
              WHEN user_agent ILIKE '%firefox%' THEN 'Firefox'
              WHEN user_agent ILIKE '%safari%' THEN 'Safari'
              WHEN user_agent ILIKE '%edge%' THEN 'Edge'
              WHEN user_agent ILIKE '%opera%' THEN 'Opera'
              ELSE 'Unknown Browser'
            END
          )
          ELSE '—'
        END as device_browser_info
      FROM voter_activity
      ORDER BY COALESCE(vote_submitted_time, login_time, '1900-01-01'::timestamp) DESC
      LIMIT $1 OFFSET $2
    `;

    const result = await pool.query(query, [limit, offset]);
    
    console.log('Query result rows:', result.rows.length);
    
    res.json({
      success: true,
      data: result.rows,
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
    res.status(500).json({
      success: false,
      message: 'Error fetching voting time data',
      error: error.message,
      stack: error.stack
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