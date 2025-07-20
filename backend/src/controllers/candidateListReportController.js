const pool = require("../config/db");

exports.getCandidateList = async (req, res) => {
  try {
    const query = `
      WITH election_candidates AS (
        SELECT 
          e.id as election_id,
          e.title as election_title,
          e.status as election_status,
          e.date_from,
          e.date_to,
          e.start_time,
          e.end_time,
          e.election_type,
          p.name as position_name,
          c.id as candidate_id,
          c.first_name,
          c.last_name,
          c.party,
          c.image_url,
          COALESCE(s.course_name, 'Not a student') as course,
          COALESCE(COUNT(DISTINCT v.id), 0) as vote_count
        FROM elections e
        JOIN ballots b ON e.id = b.election_id
        JOIN positions p ON b.id = p.ballot_id
        JOIN candidates c ON p.id = c.position_id
        LEFT JOIN students s ON LOWER(CONCAT(s.first_name, ' ', s.last_name)) = LOWER(CONCAT(c.first_name, ' ', c.last_name))
        LEFT JOIN votes v ON c.id = v.candidate_id
        GROUP BY 
          e.id, e.title, e.status, e.date_from, e.date_to, 
          e.start_time, e.end_time, e.election_type,
          p.name, c.id, c.first_name, c.last_name, 
          c.party, c.image_url, s.course_name
      ),
      position_candidates AS (
        SELECT
          election_id,
          election_title,
          election_status,
          date_from,
          date_to,
          start_time,
          end_time,
          election_type,
          position_name,
          jsonb_agg(
            jsonb_build_object(
              'id', candidate_id,
              'first_name', first_name,
              'last_name', last_name,
              'party', party,
              'image_url', image_url,
              'course', course,
              'vote_count', vote_count
            )
            ORDER BY last_name, first_name
          ) as candidates
        FROM election_candidates
        GROUP BY 
          election_id, election_title, election_status,
          date_from, date_to, start_time, end_time,
          election_type, position_name
      )
      SELECT 
        election_id as id,
        election_title as title,
        election_status as status,
        date_from,
        date_to,
        start_time,
        end_time,
        election_type as type,
        jsonb_agg(
          jsonb_build_object(
            'position', position_name,
            'candidates', candidates
          )
          ORDER BY position_name
        ) as positions
      FROM position_candidates
      GROUP BY 
        election_id, election_title, election_status,
        date_from, date_to, start_time, end_time,
        election_type
      ORDER BY date_from DESC;
    `;

    const result = await pool.query(query);

    res.json({
      success: true,
      data: {
        elections: result.rows
      }
    });
  } catch (error) {
    console.error('Error in getCandidateList:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}; 