const pool = require('../config/db');

const getElectionSummary = async (req, res) => {
  try {
    // Get all elections
    const result = await pool.query(`
      SELECT 
        e.*,
        COUNT(DISTINCT ev.id) as voter_count,
        COALESCE(COUNT(DISTINCT CASE WHEN v.id IS NOT NULL THEN CONCAT(v.student_id, '-', v.election_id) END), 0) as vote_count,
        CASE 
          WHEN COUNT(DISTINCT ev.id) = 0 THEN 0
          ELSE ROUND(
            (COALESCE(COUNT(DISTINCT CASE WHEN v.id IS NOT NULL THEN CONCAT(v.student_id, '-', v.election_id) END), 0)::numeric * 100.0) / 
            COUNT(DISTINCT ev.id)::numeric
          , 2)
        END as voter_turnout_percentage
      FROM elections e
      LEFT JOIN eligible_voters ev ON e.id = ev.election_id
      LEFT JOIN votes v ON e.id = v.election_id
      GROUP BY e.id
      ORDER BY e.created_at DESC
    `);

    const elections = result.rows;

    // Get total active students
    const totalStudentsResult = await pool.query(`
      SELECT COUNT(*) as total_students
      FROM students
      WHERE is_active = TRUE
    `);
    const totalEligibleVoters = parseInt(totalStudentsResult.rows[0].total_students);

    // Calculate summary statistics
    const summary = {
      total_elections: elections.length,
      ongoing_elections: elections.filter(e => e.status === 'ongoing').length,
      completed_elections: elections.filter(e => e.status === 'completed').length,
      upcoming_elections: elections.filter(e => e.status === 'upcoming').length,
      total_eligible_voters: totalEligibleVoters,
      total_votes_cast: elections.reduce((sum, e) => sum + parseInt(e.vote_count || 0), 0),
      voter_turnout_percentage: 0
    };

    if (summary.total_eligible_voters > 0) {
      summary.voter_turnout_percentage = ((summary.total_votes_cast / summary.total_eligible_voters) * 100).toFixed(2);
    }

    // Transform election data for the response
    const recentElections = elections.map(election => ({
      id: election.id,
      title: election.title,
      status: election.status,
      election_type: election.election_type,
      start_date: election.date_from,
      end_date: election.date_to,
      voter_count: election.voter_count || 0,
      total_votes: election.vote_count || 0,
      voter_turnout_percentage: election.voter_turnout_percentage || 0
    }));

    res.status(200).json({
      success: true,
      data: {
        summary,
        recent_elections: recentElections
      }
    });

  } catch (error) {
    console.error('Error in getElectionSummary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch election summary report'
    });
  }
};

const getElectionDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT 
        e.*,
        COUNT(DISTINCT ev.id) as voter_count,
        COALESCE(COUNT(DISTINCT CASE WHEN v.id IS NOT NULL THEN CONCAT(v.student_id, '-', v.election_id) END), 0) as vote_count,
        CASE 
          WHEN COUNT(DISTINCT ev.id) = 0 THEN 0
          ELSE ROUND(
            (COALESCE(COUNT(DISTINCT CASE WHEN v.id IS NOT NULL THEN CONCAT(v.student_id, '-', v.election_id) END), 0)::numeric * 100.0) / 
            COUNT(DISTINCT ev.id)::numeric
          , 2)
        END as voter_turnout_percentage
      FROM elections e
      LEFT JOIN eligible_voters ev ON e.id = ev.election_id
      LEFT JOIN votes v ON e.id = v.election_id
      WHERE e.id = $1
      GROUP BY e.id
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Election not found'
      });
    }

    const election = result.rows[0];

    // Get ballot details
    const ballotResult = await pool.query(`
      SELECT 
        p.id as position_id,
        p.name as position_name,
        p.max_choices,
        json_agg(
          json_build_object(
            'id', c.id,
            'first_name', c.first_name,
            'last_name', c.last_name,
            'party', c.party,
            'slogan', c.slogan,
            'platform', c.platform,
            'image_url', c.image_url
          )
        ) as candidates
      FROM positions p
      LEFT JOIN candidates c ON p.id = c.position_id
      WHERE p.ballot_id IN (SELECT id FROM ballots WHERE election_id = $1)
      GROUP BY p.id, p.name, p.max_choices
    `, [id]);

    const electionDetails = {
      id: election.id,
      title: election.title,
      description: election.description,
      election_type: election.election_type,
      status: election.status,
      date_from: election.date_from,
      date_to: election.date_to,
      start_time: election.start_time,
      end_time: election.end_time,
      voter_count: election.voter_count || 0,
      vote_count: election.vote_count || 0,
      voter_turnout_percentage: election.voter_turnout_percentage || 0,
      ballot: {
        positions: ballotResult.rows.map(position => ({
          id: position.position_id,
          name: position.position_name,
          max_choices: position.max_choices,
          candidates: position.candidates || []
        }))
      }
    };

    res.status(200).json({
      success: true,
      data: electionDetails
    });

  } catch (error) {
    console.error('Error in getElectionDetails:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch election details'
    });
  }
};

const getUpcomingElections = async (req, res) => {
  try {
    // Get current date at start of day
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Get start of current month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Get all upcoming elections with their ballot information
    const result = await pool.query(`
      WITH upcoming_elections AS (
        SELECT 
          e.*,
          COUNT(DISTINCT ev.id) as voter_count
        FROM elections e
        LEFT JOIN eligible_voters ev ON e.id = ev.election_id
        WHERE e.status = 'upcoming'
          AND e.date_from >= $1
        GROUP BY e.id
        ORDER BY e.date_from ASC
      ),
      election_positions AS (
        SELECT 
          b.election_id,
          json_agg(
            json_build_object(
              'id', p.id,
              'name', p.name,
              'max_choices', p.max_choices,
              'candidates', (
                SELECT json_agg(
                  json_build_object(
                    'id', c.id,
                    'first_name', c.first_name,
                    'last_name', c.last_name,
                    'party', c.party,
                    'slogan', c.slogan,
                    'platform', c.platform,
                    'image_url', c.image_url
                  )
                )
                FROM candidates c
                WHERE c.position_id = p.id
              )
            )
          ) as positions
        FROM ballots b
        JOIN positions p ON b.id = p.ballot_id
        GROUP BY b.election_id
      )
      SELECT 
        ue.*,
        ep.positions as ballot_positions
      FROM upcoming_elections ue
      LEFT JOIN election_positions ep ON ue.id = ep.election_id
    `, [now.toISOString()]);

    const upcomingElections = result.rows;

    // Get elections starting this month
    const upcomingThisMonth = upcomingElections.filter(election => {
      const electionStart = new Date(election.date_from);
      return electionStart >= startOfMonth && electionStart <= endOfMonth;
    });

    // Calculate total expected voters
    const totalExpectedVoters = upcomingElections.reduce((sum, election) => {
      return sum + (parseInt(election.voter_count) || 0);
    }, 0);

    // Transform the data for the response
    const transformedElections = upcomingElections.map(election => ({
      id: election.id,
      title: election.title,
      description: election.description,
      election_type: election.election_type,
      date_from: election.date_from,
      date_to: election.date_to,
      start_time: election.start_time,
      end_time: election.end_time,
      voter_count: parseInt(election.voter_count) || 0,
      ballot: election.ballot_positions ? {
        positions: election.ballot_positions
      } : null
    }));

    res.status(200).json({
      success: true,
      data: {
        total_upcoming: upcomingElections.length,
        upcoming_this_month: upcomingThisMonth.length,
        total_expected_voters: totalExpectedVoters,
        elections: transformedElections
      }
    });

  } catch (error) {
    console.error('Error in getUpcomingElections:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch upcoming elections report'
    });
  }
};

const getLiveVoteCount = async (req, res) => {
  try {
    // Get all ongoing elections with their vote counts
    const result = await pool.query(`
      WITH live_election_stats AS (
        SELECT 
          e.id,
          e.title,
          e.description,
          e.election_type,
          e.date_from,
          e.date_to,
          e.start_time,
          e.end_time,
          COUNT(DISTINCT ev.id) as eligible_voters,
          COALESCE(COUNT(DISTINCT CASE WHEN v.id IS NOT NULL THEN CONCAT(v.student_id, '-', v.election_id) END), 0) as current_votes,
          CASE 
            WHEN COUNT(DISTINCT ev.id) = 0 THEN 0
            ELSE ROUND(
              (COALESCE(COUNT(DISTINCT CASE WHEN v.id IS NOT NULL THEN CONCAT(v.student_id, '-', v.election_id) END), 0)::numeric * 100.0) / 
              COUNT(DISTINCT ev.id)::numeric
            , 2)
          END as live_turnout
        FROM elections e
        LEFT JOIN eligible_voters ev ON e.id = ev.election_id
        LEFT JOIN votes v ON e.id = v.election_id
        WHERE e.status = 'ongoing'
        GROUP BY e.id
        ORDER BY e.date_from DESC
      )
      SELECT 
        les.*,
        CASE
          WHEN (NOW()::timestamp)::time > les.end_time THEN '0 minutes'
          ELSE concat(
            EXTRACT(HOUR FROM (les.date_to + les.end_time::interval - NOW()))::int, ' hours ',
            EXTRACT(MINUTE FROM (les.date_to + les.end_time::interval - NOW()))::int, ' minutes'
          )
        END as time_remaining
      FROM live_election_stats les
    `);

    const liveElections = result.rows;

    // Calculate summary statistics
    const summary = {
      total_live_elections: liveElections.length,
      total_current_voters: liveElections.reduce((sum, e) => sum + parseInt(e.current_votes || 0), 0),
      average_turnout: liveElections.length > 0 
        ? (liveElections.reduce((sum, e) => sum + parseFloat(e.live_turnout || 0), 0) / liveElections.length).toFixed(2)
        : 0
    };

    res.status(200).json({
      success: true,
      data: {
        summary,
        live_elections: liveElections
      }
    });

  } catch (error) {
    console.error('Error in getLiveVoteCount:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch live vote count'
    });
  }
};

module.exports = {
  getElectionSummary,
  getElectionDetails,
  getUpcomingElections,
  getLiveVoteCount
}; 