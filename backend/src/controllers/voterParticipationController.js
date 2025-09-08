const pool = require("../config/db");

exports.getVoterParticipation = async (req, res) => {
  try {
    // Get all elections with their overall stats
    const electionsQuery = `
      SELECT 
        e.id,
        e.title,
        e.status,
        e.date_from,
        e.date_to,
        COUNT(DISTINCT ev.id) as total_eligible_voters,
        COUNT(DISTINCT v.student_id) as total_votes_cast,
        CASE 
          WHEN COUNT(DISTINCT ev.id) > 0 
          THEN ROUND(CAST((COUNT(DISTINCT v.student_id) * 100.0 / COUNT(DISTINCT ev.id)) AS numeric), 1)
          ELSE 0
        END as turnout_percentage
      FROM elections e
      LEFT JOIN eligible_voters ev ON e.id = ev.election_id
      LEFT JOIN votes v ON v.election_id = e.id
      WHERE e.status IN ('active', 'completed')
      GROUP BY e.id, e.title, e.status, e.date_from, e.date_to
      ORDER BY e.date_from DESC
    `;

    const { rows: elections } = await pool.query(electionsQuery);

    if (!elections || elections.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No elections found'
      });
    }

    // Get detailed data for each election
    const electionData = await Promise.all(elections.map(async (election) => {
      try {
        // Get department statistics
        const departmentStatsQuery = `
          WITH all_departments AS (
            SELECT DISTINCT course_name as department
            FROM students
            WHERE is_active = TRUE
          ),
          department_stats AS (
            SELECT 
              s.course_name as department,
              COUNT(DISTINCT ev.id) as eligible_voters,
              COUNT(DISTINCT v.student_id) as votes_cast
            FROM eligible_voters ev
            JOIN students s ON ev.student_id = s.id
            LEFT JOIN votes v ON v.election_id = ev.election_id AND v.student_id = s.id
            WHERE ev.election_id = $1
            GROUP BY s.course_name
          )
          SELECT 
            ad.department,
            COALESCE(ds.eligible_voters, 0) as eligible_voters,
            COALESCE(ds.votes_cast, 0) as votes_cast,
            CASE 
              WHEN COALESCE(ds.eligible_voters, 0) > 0 
              THEN ROUND(CAST((COALESCE(ds.votes_cast, 0) * 100.0 / COALESCE(ds.eligible_voters, 1)) AS numeric), 1)
              ELSE 0
            END as turnout
          FROM all_departments ad
          LEFT JOIN department_stats ds ON ds.department = ad.department
          ORDER BY ad.department
        `;

        const { rows: departmentStats } = await pool.query(departmentStatsQuery, [election.id]);

        // Get voter details
        const votersQuery = `
          SELECT 
            s.student_number as student_id,
            s.first_name,
            s.last_name,
            s.course_name as department,
            (CASE WHEN v.student_id IS NOT NULL THEN TRUE ELSE FALSE END) as has_voted,
            v.created_at as vote_date
          FROM eligible_voters ev
          JOIN students s ON ev.student_id = s.id
          LEFT JOIN votes v ON v.student_id = s.id AND v.election_id = $1
          WHERE ev.election_id = $1
          ORDER BY s.course_name, s.last_name, s.first_name
        `;

        const { rows: voters } = await pool.query(votersQuery, [election.id]);

        return {
          id: election.id,
          title: election.title,
          status: election.status,
          date_from: election.date_from,
          date_to: election.date_to,
          total_eligible_voters: parseInt(election.total_eligible_voters),
          total_votes_cast: parseInt(election.total_votes_cast),
          turnout_percentage: parseFloat(election.turnout_percentage),
          department_stats: departmentStats.map(stat => ({
            department: stat.department,
            eligible_voters: parseInt(stat.eligible_voters),
            votes_cast: parseInt(stat.votes_cast),
            turnout: parseFloat(stat.turnout)
          })),
          voters: voters.map(voter => ({
            student_id: voter.student_id,
            name: `${voter.first_name || ''} ${voter.last_name || ''}`.trim(),
            department: voter.department,
            has_voted: Boolean(voter.has_voted),
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
      details: error.message
    });
  }
}; 