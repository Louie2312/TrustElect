const pool = require("../config/db");

exports.getVoterParticipation = async (req, res) => {
  try {
    // Get all active and completed elections with their voter statistics
    const electionsQuery = `
      SELECT 
        e.id,
        e.title,
        e.status,
        e.date_from,
        e.date_to,
        COUNT(DISTINCT ev.id) as total_eligible_voters,
        COUNT(DISTINCT v.id) as total_votes_cast,
        CASE 
          WHEN COUNT(DISTINCT ev.id) > 0 
          THEN ROUND(CAST((COUNT(DISTINCT v.id) * 100.0 / COUNT(DISTINCT ev.id)) AS numeric), 1)
          ELSE 0
        END as turnout_percentage
      FROM elections e
      LEFT JOIN eligible_voters ev ON e.id = ev.election_id
      LEFT JOIN votes v ON e.id = v.election_id
      WHERE e.status IN ('active', 'completed')
      GROUP BY e.id, e.title, e.status, e.date_from, e.date_to
      ORDER BY e.date_from DESC
    `;

    console.log('Executing elections query...');
    const { rows: elections } = await pool.query(electionsQuery);
    console.log(`Found ${elections.length} elections`);

    if (!elections || elections.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No elections found'
      });
    }

    const electionData = await Promise.all(elections.map(async (election) => {
      try {
        // Get department statistics based on course_name
        const departmentStatsQuery = `
          WITH department_stats AS (
            SELECT 
              c.course_name as department,
              COUNT(DISTINCT ev.id) as eligible_voters,
              COUNT(DISTINCT v.id) as votes_cast
            FROM courses c
            JOIN students s ON s.course_name = c.course_name
            JOIN eligible_voters ev ON ev.student_id = s.id
            LEFT JOIN votes v ON v.student_id = s.id AND v.election_id = $1
            WHERE ev.election_id = $1
            GROUP BY c.course_name
          )
          SELECT 
            department,
            eligible_voters,
            votes_cast,
            CASE 
              WHEN eligible_voters > 0 
              THEN ROUND(CAST((votes_cast * 100.0 / eligible_voters) AS numeric), 1)
              ELSE 0
            END as turnout
          FROM department_stats
          ORDER BY department
        `;

        console.log(`Fetching department stats for election ${election.id}...`);
        const { rows: departmentStats } = await pool.query(departmentStatsQuery, [election.id]);
        console.log(`Found ${departmentStats.length} departments for election ${election.id}`);

        // Get voters list with their voting status
        const votersQuery = `
          SELECT 
            s.student_number as student_id,
            s.first_name,
            s.last_name,
            s.course_name as department,
            CASE WHEN v.id IS NOT NULL THEN true ELSE false END as has_voted,
            v.created_at as vote_date
          FROM eligible_voters ev
          JOIN students s ON ev.student_id = s.id
          LEFT JOIN votes v ON v.student_id = s.id AND v.election_id = $1
          WHERE ev.election_id = $1
          ORDER BY s.course_name, s.last_name, s.first_name
        `;

        console.log(`Fetching voters for election ${election.id}...`);
        const { rows: voters } = await pool.query(votersQuery, [election.id]);
        console.log(`Found ${voters.length} voters for election ${election.id}`);

        return {
          id: election.id,
          title: election.title,
          total_eligible_voters: parseInt(election.total_eligible_voters),
          total_votes_cast: parseInt(election.total_votes_cast),
          turnout_percentage: parseFloat(election.turnout_percentage),
          department_stats: departmentStats,
          voters: voters.map(voter => ({
            student_id: voter.student_id,
            first_name: voter.first_name,
            last_name: voter.last_name,
            department: voter.department,
            has_voted: voter.has_voted,
            vote_date: voter.vote_date
          }))
        };
      } catch (error) {
        console.error(`Error processing election ${election.id}:`, error);
        throw error;
      }
    }));

    res.json({
      success: true,
      data: {
        elections: electionData
      }
    });

  } catch (error) {
    console.error('Error in getVoterParticipation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch voter participation data',
      details: error.message,
      hint: error.hint,
      code: error.code
    });
  }
}; 