const pool = require("../config/db");

exports.getVotingTimeData = async (req, res) => {
  try {
    const query = `
      SELECT 
        v.student_id,
        e.title as election_title,
        MIN(v.created_at) as first_vote_time,
        MAX(v.created_at) as last_vote_time,
        COUNT(*) as total_votes
      FROM votes v
      JOIN elections e ON v.election_id = e.id
      GROUP BY v.student_id, e.title
      ORDER BY v.student_id, e.title;
    `;

    const result = await pool.query(query);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching voting time data:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching voting time data',
      error: error.message
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