const pool = require("../config/db");

const getElectionSummary = async () => {
  const result = await pool.query(`
    WITH election_stats AS (
      SELECT 
        e.id,
        e.title,
        e.description,
        e.date_from,
        e.date_to,
        e.start_time,
        e.end_time,
        e.status,
        e.election_type,
        COUNT(DISTINCT ev.id) as total_eligible_voters,
        COALESCE(COUNT(DISTINCT CASE WHEN v.id IS NOT NULL THEN CONCAT(v.student_id, '-', v.election_id) END), 0) as total_votes,
        CASE 
          WHEN COUNT(DISTINCT ev.id) = 0 THEN 0
          ELSE ROUND(
            (COALESCE(COUNT(DISTINCT CASE WHEN v.id IS NOT NULL THEN CONCAT(v.student_id, '-', v.election_id) END), 0)::numeric * 100.0) / 
            COUNT(DISTINCT ev.id)::numeric
          , 2)
        END as voter_turnout_percentage,
        COUNT(DISTINCT p.id) as total_positions,
        COUNT(DISTINCT c.id) as total_candidates
      FROM elections e
      LEFT JOIN eligible_voters ev ON e.id = ev.election_id
      LEFT JOIN votes v ON e.id = v.election_id
      LEFT JOIN ballots b ON e.id = b.election_id
      LEFT JOIN positions p ON b.id = p.ballot_id
      LEFT JOIN candidates c ON p.id = c.position_id
      WHERE (
        e.needs_approval = FALSE 
        OR e.needs_approval IS NULL
        OR EXISTS (
          SELECT 1 FROM users u 
          WHERE u.id = e.created_by 
          AND u.role_id = 1
        )
      )
      GROUP BY e.id
    )
    SELECT 
      es.*,
      (
        SELECT CASE 
          WHEN SUM(total_eligible_voters) = 0 THEN 0
          ELSE ROUND(
            (SUM(total_votes)::numeric * 100.0) / SUM(total_eligible_voters)::numeric
          , 2)
        END
        FROM election_stats
      ) as overall_turnout_percentage
    FROM election_stats es
    ORDER BY es.date_from DESC
  `);
  
  return result.rows;
};

const getElectionDetails = async (electionId) => {
  const result = await pool.query(`
    WITH position_stats AS (
      SELECT 
        p.id as position_id,
        p.name as position_name,
        p.max_choices,
        COUNT(DISTINCT c.id) as candidate_count,
        json_agg(json_build_object(
          'id', c.id,
          'name', CONCAT(c.first_name, ' ', c.last_name),
          'party', c.party,
          'vote_count', (
            SELECT COUNT(*) 
            FROM votes v 
            WHERE v.candidate_id = c.id
          )
        )) as candidates
      FROM positions p
      LEFT JOIN candidates c ON p.id = c.position_id
      WHERE p.ballot_id IN (SELECT id FROM ballots WHERE election_id = $1)
      GROUP BY p.id, p.name, p.max_choices
    )
    SELECT 
      e.id,
      e.title,
      e.description,
      e.date_from,
      e.date_to,
      e.start_time,
      e.end_time,
      e.status,
      e.election_type,
      COUNT(DISTINCT ev.id) as total_eligible_voters,
      COALESCE(COUNT(DISTINCT CASE WHEN v.id IS NOT NULL THEN CONCAT(v.student_id, '-', v.election_id) END), 0) as total_votes,
      CASE 
        WHEN COUNT(DISTINCT ev.id) = 0 THEN 0
        ELSE ROUND(
          (COALESCE(COUNT(DISTINCT CASE WHEN v.id IS NOT NULL THEN CONCAT(v.student_id, '-', v.election_id) END), 0)::numeric * 100.0) / 
          COUNT(DISTINCT ev.id)::numeric
        , 2)
      END as voter_turnout_percentage,
      (
        SELECT json_agg(pos)
        FROM position_stats pos
      ) as positions
    FROM elections e
    LEFT JOIN eligible_voters ev ON e.id = ev.election_id
    LEFT JOIN votes v ON e.id = v.election_id
    WHERE e.id = $1
    GROUP BY e.id
  `, [electionId]);
  
  return result.rows[0];
};

module.exports = {
  getElectionSummary,
  getElectionDetails
}; 