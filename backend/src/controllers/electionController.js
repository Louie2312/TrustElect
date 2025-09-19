const { 
  createElectionWithVoters, 
  getAllElections, 
  getElectionById, 
  updateElection, 
  deleteElection,
  getEligibleVotersCount,
  getElectionsByStatus,
  getElectionStatistics,
  getElectionWithBallot,
  updateElectionStatuses,
  getElectionStatus,
  createElection,
  approveElection,
  rejectElection,
  getPendingApprovalElections,
  getAllElectionsWithCreator
} = require("../models/electionModel");
const pool = require("../config/db");
const crypto = require('crypto');
const notificationService = require('../services/notificationService');
const cryptoService = require('../utils/cryptoService');
const electionModel = require("../models/electionModel");

exports.createElection = async (req, res) => {
  try {
    const { title, description, date_from, date_to, start_time, end_time, election_type, eligible_voters } = req.body;

    const isAdmin = req.user.role_id === 2;
    const isSuperAdmin = req.user.role_id === 1;

    const needsApproval = isAdmin;
    
    const result = await createElection(
      { title, description, dateFrom: date_from, dateTo: date_to, startTime: start_time, endTime: end_time, 
        electionType: election_type, eligibleVoters: eligible_voters },
      req.user.id, 
      needsApproval
    );

    // Send notifications if the election was created successfully
    if (result.election) {
      try {
        const electionWithCreator = {
          ...result.election,
          created_by: req.user.id, 
          title: title || result.election.title, 
          description: description || result.election.description
        };

        if (needsApproval) {
          // Send notification to superadmins for approval (admin-created election)
          const { rows: superadminDetails } = await pool.query(
            `SELECT id, email, active FROM users WHERE role_id = 1`
          );
          
          if (superadminDetails.length > 0) {
            const { createNotificationForUsers } = require('../models/notificationModel');
            const superadminIds = superadminDetails.map(sa => sa.id);
            
            await createNotificationForUsers(
              superadminIds,
              'Super Admin',
              'Election Needs Approval', 
              `Election "${electionWithCreator.title}" needs your approval.`,
              'info',
              'election',
              electionWithCreator.id
            );
          }
        } else if (isSuperAdmin) {
          // For superadmin-created elections, send notifications to other superadmins and admins
          const { createNotificationForUsers } = require('../models/notificationModel');
          
          // Notify other superadmins (excluding the creator)
          const { rows: otherSuperadminDetails } = await pool.query(
            `SELECT id, email, active FROM users WHERE role_id = 1 AND id != $1`,
            [req.user.id]
          );
          
          if (otherSuperadminDetails.length > 0) {
            const otherSuperadminIds = otherSuperadminDetails.map(sa => sa.id);
            
            await createNotificationForUsers(
              otherSuperadminIds,
              'Super Admin',
              'New Election Created', 
              `A new election "${electionWithCreator.title}" has been created by a Super Admin.`,
              'info',
              'election',
              electionWithCreator.id
            );
          }
          
          // Notify all admins about the new election
          const { rows: adminDetails } = await pool.query(
            `SELECT u.id, u.email, u.active FROM users u 
             JOIN admins a ON u.email = a.email 
             WHERE u.role_id = 2`
          );
          
          if (adminDetails.length > 0) {
            const adminIds = adminDetails.map(admin => admin.id);
            
            await createNotificationForUsers(
              adminIds,
              'Admin',
              'New Election Created', 
              `A new election "${electionWithCreator.title}" has been created by a Super Admin.`,
              'info',
              'election',
              electionWithCreator.id
            );
          }
          
          // Notify eligible students immediately
          await notificationService.notifyStudentsAboutElection(electionWithCreator);
        }
      } catch (notifError) {
        console.error('Failed to send notifications:', notifError);
        // Don't rethrow - we still want to return success response
      }
    }
    
    res.status(201).json({ 
      id: result.election.id,
      election: result.election,
      message: needsApproval 
        ? "Election created successfully and is pending approval from a Super Admin" 
        : "Election created successfully"
    });
  } catch (error) {
    console.error("Election creation error:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.previewEligibleVoters = async (req, res) => {
  try {
      const { eligible_voters } = req.body;
      
      const count = await getEligibleVotersCount(eligible_voters);
      
      res.status(200).json({ count });
  } catch (error) {
      console.error("Voter preview error:", error);
      res.status(500).json({ 
          message: error.message || "Internal server error" 
      });
  }
};

exports.getElections = async (req, res) => {
  try {
    let elections;
      if (req.user && req.user.role === 'superadmin') {
      elections = await getAllElectionsWithCreator();
    } else {
      elections = await getAllElections();
    }
    
    res.status(200).json(elections);
  } catch (error) {
    console.error("Error fetching elections:", error);
    res.status(500).json({ message: "Failed to retrieve elections" });
  }
};

exports.getElectionById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ message: "Invalid election ID" });
    }

    const election = await getElectionById(id);

    if (!election) {
      return res.status(404).json({ message: "Election not found" });
    }

    res.status(200).json(election);
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      message: error.message || "Internal Server Error",
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

exports.getElectionVoters = async (req, res) => {
  try {
    const { id } = req.params;
    
    const voters = await pool.query(`
      SELECT 
        ev.first_name, 
        ev.last_name,
        ev.course_name,
        ev.year_level,
        ev.gender
      FROM eligible_voters ev
      WHERE ev.election_id = $1
      ORDER BY ev.last_name, ev.first_name
    `, [id]);

    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        jsonb_agg(
          jsonb_build_object(
            'course_name', course_name,
            'count', COUNT(*)
          )
        ) as by_course,
        jsonb_agg(
          jsonb_build_object(
            'year_level', year_level,
            'count', COUNT(*)
          )
        ) as by_year,
        jsonb_agg(
          jsonb_build_object(
            'gender', gender,
            'count', COUNT(*)
          )
        ) as by_gender
      FROM eligible_voters
      WHERE election_id = $1
      GROUP BY election_id
    `, [id]);

    return res.status(200).json({
      voters: voters.rows,
      total: stats.rows[0]?.total || 0,
      byCourse: stats.rows[0]?.by_course || [],
      byYear: stats.rows[0]?.by_year || [],
      byGender: stats.rows[0]?.by_gender || []
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.updateElection = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const existingElection = await electionModel.getElectionById(id);
    
    if (!existingElection) {
      return res.status(404).json({
        success: false,
        message: "Election not found"
      });
    }

    if (existingElection.status !== 'upcoming' && existingElection.status !== 'ongoing' && existingElection.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: "Only upcoming, ongoing, or completed elections can be updated"
      });
    }

    if (req.user.role !== 'SuperAdmin' && existingElection.created_by !== userId) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to update this election"
      });
    }

    const updates = {};

    const allowedFields = [
      'title', 'description', 'election_type', 
      'date_from', 'date_to', 'start_time', 'end_time'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields to update"
      });
    }

    const updatedElection = await electionModel.updateElection(id, updates);
    
    res.status(200).json({
      success: true,
      message: "Election updated successfully",
      election: updatedElection
    });
  } catch (error) {
    console.error("Error updating election:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update election: " + error.message
    });
  }
};

exports.deleteElection = async (req, res) => {
  try {
      const { id } = req.params;
      await deleteElection(id);
      res.status(200).json({ message: "Election deleted successfully" });
  } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.getElectionsByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    
    const elections = await getElectionsByStatus(status);
    
    res.status(200).json(elections);
  } catch (error) {
    console.error(`Error fetching elections with status ${req.params.status}:`, error);
    res.status(500).json({ message: error.message });
  }
};

exports.getElectionStats = async (req, res) => {
  try {
    const stats = await getElectionStatistics();

    let pendingApprovalCount = 0;
    
    if (req.user.role === 'Admin') {
      const pendingElections = await getPendingApprovalElections(req.user.id);
      pendingApprovalCount = pendingElections.length;
    } else if (req.user.role === 'SuperAdmin') {
      const pendingElections = await getPendingApprovalElections();
      pendingApprovalCount = pendingElections.length;
    }
 
    stats.push({
      status: 'to_approve',
      count: pendingApprovalCount,
      total_voters: 0,
      total_votes: 0
    });
    
    res.status(200).json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getElectionDetails = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid election ID" 
      });
    }

    const election = await getElectionWithBallot(id);
    
    return res.status(200).json({
      success: true,
      election
    });
  } catch (error) {
    console.error('Error fetching election details:', error);
    return res.status(500).json({ 
      success: false,
      message: error.message || 'Failed to fetch election details'
    });
  }
};

exports.getElectionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const election = await getElectionById(id);
    
    if (!election) {
      return res.status(404).json({ message: "Election not found" });
    }

    const status = getElectionStatus(
      election.date_from,
      election.date_to,
      election.start_time,
      election.end_time
    );

    res.status(200).json({ status });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.updateElectionStatuses = async (req, res) => {
  try {
      const result = await updateElectionStatuses();

      if (result.statusChanges && result.statusChanges.length > 0) {
          const notificationPromises = result.statusChanges.map(async (change) => {
              try {
                  const election = await getElectionById(change.id);
                  if (election) {
                      return notificationService.notifyElectionStatusChange(election, change.oldStatus, change.newStatus);
                  }
              } catch (notifError) {
                  console.error(`Error sending notification for election ${change.id}:`, notifError);
                  return null;
              }
          });
          
          await Promise.allSettled(notificationPromises);
      }
      
      res.status(200).json({
          success: true,
          message: `Updated ${result.updated} election statuses`,
          statusChanges: result.statusChanges?.length || 0
      });
  } catch (error) {
      console.error('Status update error:', error);
      res.status(500).json({
          success: false,
          message: 'Failed to update election statuses'
      });
  }
};

exports.checkStudentEligibility = async (req, res) => {
  try {
    const { id: electionId } = req.params;
    const studentId = req.user.studentId;
    
    if (!studentId) {
      return res.status(401).json({ 
        eligible: false,
        message: "Authentication required. Student ID not found in token." 
      });
    }

    const electionCheck = await pool.query(
      `SELECT needs_approval FROM elections WHERE id = $1`,
      [electionId]
    );

    if (electionCheck.rows.length === 0) {
      return res.status(404).json({
        eligible: false,
        message: "Election not found"
      });
    }

    if (electionCheck.rows[0].needs_approval) {
      return res.status(403).json({
        eligible: false,
        message: "This election is not yet available for voting"
      });
    }

    const student = await pool.query(
      `SELECT s.id, s.course_name, s.year_level, s.gender, u.id as user_id
       FROM students s
       JOIN users u ON s.email = u.email
       WHERE s.id = $1 AND s.is_active = TRUE`,
      [studentId]
    );


    if (student.rows.length === 0) {
      console.error('Student record missing for ID:', studentId);
      return res.status(404).json({ 
        eligible: false,
        message: "Your student record could not be verified" 
      });
    }

    const eligibility = await pool.query(
      `SELECT has_voted FROM eligible_voters
       WHERE election_id = $1 AND student_id = $2`,
      [electionId, studentId]
    );

    if (eligibility.rows.length === 0) {
      return res.status(200).json({ 
        eligible: false,
        message: "You are not eligible to vote in this election" 
      });
    }


    const hasVoted = eligibility.rows[0].has_voted;

    res.status(200).json({ 
      eligible: true,
      hasVoted: hasVoted,
      message: hasVoted
        ? "You have already voted in this election"
        : "You are eligible to vote"
    });
  } catch (error) {
    console.error("Eligibility check error:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.getBallotForStudent = async (req, res) => {
  try {
    const { id: electionId } = req.params;
    const studentId = req.user.studentId;
    
    if (!studentId) {
      return res.status(401).json({ 
        message: "Authentication required. Student ID not found in token." 
      });
    }

    const electionCheck = await pool.query(
      `SELECT e.needs_approval, e.status, 
              EXISTS (
                SELECT 1 FROM users u 
                WHERE u.id = e.created_by 
                AND u.role_id = 1
              ) as is_superadmin_created
       FROM elections e 
       WHERE e.id = $1`,
      [electionId]
    );

    if (electionCheck.rows.length === 0) {
      return res.status(404).json({
        message: "Election not found"
      });
    }

    const election = electionCheck.rows[0];
    
    // Only check needs_approval if not created by superadmin
    if (!election.is_superadmin_created && election.needs_approval) {
      return res.status(403).json({
        message: "This election is not yet available"
      });
    }

    // Check if election is ongoing
    if (election.status !== 'ongoing') {
      return res.status(403).json({
        message: "This election is not currently active"
      });
    }

    const eligible = await pool.query(
      `SELECT 1 FROM eligible_voters 
       WHERE election_id = $1 AND student_id = $2`,
      [electionId, studentId]
    );

    if (eligible.rows.length === 0) {
      return res.status(403).json({ message: "Not eligible for this election" });
    }

    const ballot = await pool.query(
      `SELECT 
        p.id as position_id,
        p.name as position_name,
        p.max_choices,
        jsonb_agg(
          jsonb_build_object(
            'id', c.id,
            'name', c.first_name || ' ' || c.last_name,
            'party', COALESCE(c.party, ''),
            'image_url', c.image_url
          ) ORDER BY c.last_name, c.first_name
        ) as candidates
      FROM positions p
      JOIN candidates c ON p.id = c.position_id
      JOIN ballots b ON p.ballot_id = b.id
      WHERE b.election_id = $1
      GROUP BY p.id, p.name, p.max_choices
      ORDER BY p.display_order`,
      [electionId]
    );

    res.status(200).json({
      positions: ballot.rows,
      election: await getElectionById(electionId)
    });
  } catch (error) {
    console.error("Error in getBallotForStudent:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.getBallotForVoting = async (req, res) => {
  try {
    const { id: electionId } = req.params;
    const studentId = req.user.studentId;
    
    if (!studentId) {
      return res.status(401).json({ 
        message: "Authentication required. Student ID not found in token." 
      });
    }

    const electionCheck = await pool.query(
      `SELECT needs_approval FROM elections WHERE id = $1`,
      [electionId]
    );

    if (electionCheck.rows.length === 0) {
      return res.status(404).json({
        message: "Election not found"
      });
    }

    if (electionCheck.rows[0].needs_approval) {
      return res.status(403).json({
        message: "This election is not yet available for voting"
      });
    }

    const eligible = await pool.query(
      `SELECT id FROM eligible_voters 
       WHERE election_id = $1 AND student_id = $2 AND has_voted = FALSE`,
      [electionId, studentId]
    );

    if (eligible.rows.length === 0) {
      return res.status(403).json({ message: "Not eligible or already voted" });
    }

    const ballot = await pool.query(
      `SELECT 
        p.id as position_id,
        p.name as position_name,
        p.max_choices,
        jsonb_agg(
          jsonb_build_object(
            'id', c.id,
            'name', c.first_name || ' ' || c.last_name,
            'party', COALESCE(c.party, ''),
            'image_url', c.image_url
          ) ORDER BY c.last_name, c.first_name
        ) as candidates
      FROM positions p
      JOIN candidates c ON p.id = c.position_id
      JOIN ballots b ON p.ballot_id = b.id
      WHERE b.election_id = $1
      GROUP BY p.id, p.name, p.max_choices
      ORDER BY p.display_order`,
      [electionId]
    );

    res.status(200).json({
      positions: ballot.rows,
      election: await getElectionById(electionId)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.submitVote = async (req, res) => {
  const client = await pool.connect();

  const electionId = req.params.id;
  const studentId = req.user.studentId;
  
  try {
    await client.query('BEGIN');
    
    const { votes } = req.body;

    const electionCheck = await client.query(
      `SELECT e.needs_approval, e.status, 
              EXISTS (
                SELECT 1 FROM users u 
                WHERE u.id = e.created_by 
                AND u.role_id = 1
              ) as is_superadmin_created
       FROM elections e 
       WHERE e.id = $1`,
      [electionId]
    );

    if (electionCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: "Election not found"
      });
    }

    const election = electionCheck.rows[0];
    
    // Only check needs_approval if not created by superadmin
    if (!election.is_superadmin_created && election.needs_approval) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        message: "This election is not yet available for voting"
      });
    }

    // Check if election is ongoing
    if (election.status !== 'ongoing') {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        message: "This election is not currently active"
      });
    }

    const existingVoteCheck = await client.query(
      'SELECT 1 FROM eligible_voters WHERE election_id = $1 AND student_id = $2 AND has_voted = TRUE',
      [electionId, studentId]
    );

    if (existingVoteCheck.rows.length > 0) {
      const tokenResult = await client.query(
        'SELECT DISTINCT vote_token FROM votes WHERE election_id = $1 AND student_id = $2 LIMIT 1',
        [electionId, studentId]
      );
      
      const existingToken = tokenResult.rows.length > 0 ? tokenResult.rows[0].vote_token : null;
      
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'You have already voted in this election',
        voteToken: existingToken,
        alreadyVoted: true
      });
    }

    if (!Array.isArray(votes)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Invalid vote format. Votes must be an array.'
      });
    }

    const voteToken = cryptoService.generateVoteToken();

    const blindedVoterId = cryptoService.createBlindedId(studentId, electionId);


    const validPositions = await client.query(
      `SELECT p.id, p.max_choices 
       FROM positions p
       JOIN ballots b ON p.ballot_id = b.id
       WHERE b.election_id = $1`,
      [electionId]
    );

    const validPositionMap = {};
    validPositions.rows.forEach(pos => {
      validPositionMap[pos.id] = pos.max_choices;
    });

    const completeBallot = {
      timestamp: new Date().toISOString(),
      electionId: parseInt(electionId),
      studentId, 
      selections: votes
    };

    const encryptedBallot = cryptoService.encryptData(completeBallot);

    await client.query(
      `INSERT INTO encrypted_ballots (
        vote_token, 
        election_id, 
        blinded_voter_id, 
        encrypted_data, 
        encryption_iv, 
        encryption_tag, 
        encryption_key
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        voteToken,
        electionId,
        blindedVoterId,
        encryptedBallot.encrypted,
        encryptedBallot.iv,
        encryptedBallot.authTag,
        encryptedBallot.key 
      ]
    );

    for (const vote of votes) {
      const { positionId, candidateIds } = vote;
      
      if (!positionId || !Array.isArray(candidateIds) || candidateIds.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Invalid vote format for position: ${positionId}. Each vote must have a positionId and an array of candidateIds.`
        });
      }
  
      if (!validPositionMap[positionId]) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Invalid position ID: ${positionId} for election: ${electionId}`
        });
      }

      const maxChoices = validPositionMap[positionId];

      if (candidateIds.length > maxChoices) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Too many candidates selected for position ${positionId}. Maximum allowed: ${maxChoices}`
        });
      }

      for (const candidateId of candidateIds) {
        const candidateCheck = await client.query(
          'SELECT id FROM candidates WHERE id = $1 AND position_id = $2',
          [candidateId, positionId]
        );

        if (candidateCheck.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            success: false,
            message: `Invalid candidate ID: ${candidateId} for position: ${positionId}`
          });
        }

        const voteData = {
          timestamp: new Date().toISOString(),
          electionId: parseInt(electionId),
          positionId: parseInt(positionId),
          candidateId: parseInt(candidateId)
        };

        const encryptedVote = cryptoService.encryptData(voteData);

        const duplicateCheck = await client.query(
          'SELECT 1 FROM votes WHERE election_id = $1 AND student_id = $2 AND position_id = $3 AND candidate_id = $4',
          [electionId, studentId, positionId, candidateId]
        );
        
        if (duplicateCheck.rows.length === 0) {

          await client.query(
            `INSERT INTO votes (
              election_id,
              student_id,
              position_id,
              candidate_id,
              vote_token,
              encrypted_vote,
              encryption_iv,
              encryption_tag,
              encryption_key,
              blinded_voter_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
              electionId,
              studentId,
              positionId,
              candidateId,
              voteToken,
              encryptedVote.encrypted,
              encryptedVote.iv,
              encryptedVote.authTag,
              encryptedVote.key, 
              blindedVoterId
            ]
          );
        }
      }
    }

    await client.query(
      'UPDATE eligible_voters SET has_voted = TRUE WHERE election_id = $1 AND student_id = $2',
      [electionId, studentId]
    );

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      message: 'Vote submitted successfully',
      voteToken
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error submitting vote:', error);

    if (error.code === '23505') { 
      try {
        const tokenResult = await client.query(
          'SELECT DISTINCT vote_token FROM votes WHERE election_id = $1 AND student_id = $2 LIMIT 1',
          [electionId, studentId]
        );
        
        const existingToken = tokenResult.rows.length > 0 ? tokenResult.rows[0].vote_token : null;
        
        return res.status(400).json({
          success: false,
          message: 'You have already voted in this election',
          voteToken: existingToken,
          alreadyVoted: true
        });
      } catch (innerError) {
        console.error('Error fetching existing vote token:', innerError);
        return res.status(400).json({
          success: false,
          message: 'You have already voted in this election',
          alreadyVoted: true
        });
      }
    }

    return res.status(500).json({
      success: false,
      message: 'An error occurred while submitting your vote'
    });
  } finally {
    client.release();
  }
};

function generateVoteToken() {
  return cryptoService.generateVoteToken();
}

exports.getVoteReceipt = async (req, res) => {
    try {
        const { id } = req.params;
        const studentId = req.user.studentId;

        const voteToken = req.headers['x-vote-token'];

        let voteQuery;
        let voteParams;
        
        if (voteToken) {
            voteQuery = `
                SELECT DISTINCT ON (v.vote_token)
                    v.vote_token,
                    v.created_at,
                    e.title as election_title,
                    e.created_at as election_date,
                    s.first_name as student_first_name,
                    s.last_name as student_last_name,
                    s.student_number as student_number
                FROM votes v
                JOIN elections e ON v.election_id = e.id
                JOIN students s ON v.student_id = s.id
                WHERE v.election_id = $1 AND v.student_id = $2 AND v.vote_token = $3
                ORDER BY v.vote_token, v.created_at DESC
                LIMIT 1
            `;
            voteParams = [id, studentId, voteToken];
        } else {
            voteQuery = `
                SELECT DISTINCT ON (v.vote_token)
                    v.vote_token,
                    v.created_at,
                    e.title as election_title,
                    e.created_at as election_date,
                    s.first_name as student_first_name,
                    s.last_name as student_last_name,
                    s.student_number as student_number
                FROM votes v
                JOIN elections e ON v.election_id = e.id
                JOIN students s ON v.student_id = s.id
                WHERE v.election_id = $1 AND v.student_id = $2
                ORDER BY v.vote_token, v.created_at DESC
                LIMIT 1
            `;
            voteParams = [id, studentId];
        }
        
        const voteResult = await pool.query(voteQuery, voteParams);

        if (voteResult.rows.length === 0) {
            return res.status(404).json({ message: "No vote found for this election" });
        }

        const retrievedVoteToken = voteResult.rows[0].vote_token;

        const encryptedBallotQuery = `
            SELECT * FROM encrypted_ballots
            WHERE vote_token = $1 AND election_id = $2
            LIMIT 1
        `;
        
        const encryptedBallotResult = await pool.query(encryptedBallotQuery, [retrievedVoteToken, id]);

        let selections = [];
        
        if (encryptedBallotResult.rows.length > 0) {
            try {
                const encryptedBallot = encryptedBallotResult.rows[0];

                const decryptedBallot = cryptoService.decryptData({
                    encrypted: encryptedBallot.encrypted_data,
                    iv: encryptedBallot.encryption_iv,
                    authTag: encryptedBallot.encryption_tag,
                    key: encryptedBallot.encryption_key
                });

                for (const selection of decryptedBallot.selections) {
                    const positionResult = await pool.query(
                        `SELECT name FROM positions WHERE id = $1`,
                        [selection.positionId]
                    );
                    
            if (positionResult.rows.length > 0) {
                const positionName = positionResult.rows[0].name;
                const candidates = [];
                
                for (const candidateId of selection.candidateIds) {
                    const candidateResult = await pool.query(
                        `SELECT id, first_name, last_name, party, image_url 
                          FROM candidates 
                          WHERE id = $1`,
                        [candidateId]
                    );
                    
                if (candidateResult.rows.length > 0) {
                    candidates.push({
                        id: candidateResult.rows[0].id,
                        firstName: candidateResult.rows[0].first_name,
                        lastName: candidateResult.rows[0].last_name,
                        party: candidateResult.rows[0].party,
                        imageUrl: candidateResult.rows[0].image_url
                    });
                }
                }
                
                selections.push({
                    position: positionName,
                    candidates: candidates
                });
                    }
                }
            } catch (decryptError) {
                console.error('Error decrypting ballot:', decryptError);
      
            }
        }
        
        if (selections.length === 0) {
            const selectionsQuery = `
                SELECT 
                    v.position_id,
                    v.candidate_id,
                    v.encrypted_vote,
                    v.encryption_iv,
                    v.encryption_tag,
                    v.encryption_key,
                    c.first_name as candidate_first_name,
                    c.last_name as candidate_last_name,
                    c.party as candidate_party,
                    c.image_url as candidate_image,
                    p.name as position_name,
                    p.max_choices
                FROM votes v
                JOIN candidates c ON v.candidate_id = c.id
                JOIN positions p ON v.position_id = p.id
                WHERE v.election_id = $1 AND v.student_id = $2 AND v.vote_token = $3
                ORDER BY p.display_order, c.last_name, c.first_name
            `;
            const selectionsResult = await pool.query(selectionsQuery, [id, studentId, retrievedVoteToken]);

            const selectionsByPosition = {};
            
            for (const row of selectionsResult.rows) {

                if (row.encrypted_vote && row.encryption_iv && row.encryption_tag && row.encryption_key) {
                    try {
                        const decryptedVote = cryptoService.decryptData({
                            encrypted: row.encrypted_vote,
                            iv: row.encryption_iv,
                            authTag: row.encryption_tag,
                            key: row.encryption_key
                        });

                        if (decryptedVote.positionId != row.position_id || 
                            decryptedVote.candidateId != row.candidate_id) {
                            console.warn(`Vote integrity issue detected: metadata mismatch for vote in election ${id}`);

                            continue;
                        }
                    } catch (err) {
                        console.error('Error decrypting individual vote:', err);

                        continue;
                    }
                }
                
                if (!selectionsByPosition[row.position_name]) {
                    selectionsByPosition[row.position_name] = {
                        position: row.position_name,
                        candidates: []
                    };
                }
                
                selectionsByPosition[row.position_name].candidates.push({
                    id: row.candidate_id,
                    firstName: row.candidate_first_name,
                    lastName: row.candidate_last_name,
                    party: row.candidate_party,
                    imageUrl: row.candidate_image
                });
            }
            
            selections = Object.values(selectionsByPosition);
        }

        const receipt = {
            electionTitle: voteResult.rows[0].election_title,
            voteDate: voteResult.rows[0].created_at,
            voteToken: retrievedVoteToken,
            student: {
                firstName: voteResult.rows[0].student_first_name,
                lastName: voteResult.rows[0].student_last_name,
                studentId: voteResult.rows[0].student_number
            },
            selections: selections,
            verificationHash: cryptoService.hashData([retrievedVoteToken, id, studentId])
        };

        res.json(receipt);
    } catch (error) {
        console.error("Error fetching vote receipt:", error);
        res.status(500).json({ message: "Error fetching vote receipt: " + error.message });
    }
};

exports.getVoteToken = async (req, res) => {
  try {
    const { id: electionId } = req.params;
    const studentId = req.user.studentId;
    
    if (!studentId) {
      return res.status(401).json({ 
        success: false,
        message: "Authentication required. Student ID not found in token." 
      });
    }

    const query = `
      SELECT vote_token 
      FROM votes 
      WHERE election_id = $1 AND student_id = $2
      LIMIT 1
    `;
    
    const result = await pool.query(query, [electionId, studentId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No vote found for this student in this election"
      });
    }
    
    return res.status(200).json({
      success: true,
      voteToken: result.rows[0].vote_token
    });
  } catch (error) {
    console.error("Error fetching vote token:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching vote token: " + error.message
    });
  }
};

exports.getElectionEligibilityCriteria = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid election ID" 
      });
    }

    const electionCheck = await pool.query(
      `SELECT id FROM elections WHERE id = $1`,
      [id]
    );

    if (electionCheck.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: "Election not found" 
      });
    }

    const criteriaQuery = `
      SELECT 
        ARRAY_AGG(DISTINCT ev.course_name) FILTER (WHERE ev.course_name IS NOT NULL) AS courses,
        ARRAY_AGG(DISTINCT ev.year_level) FILTER (WHERE ev.year_level IS NOT NULL) AS year_levels,
        ARRAY_AGG(DISTINCT ev.gender) FILTER (WHERE ev.gender IS NOT NULL) AS genders,
        ARRAY_AGG(DISTINCT ev.semester) FILTER (WHERE ev.semester IS NOT NULL) AS semesters,
        ARRAY_AGG(DISTINCT ev.precinct) FILTER (WHERE ev.precinct IS NOT NULL) AS precincts
      FROM eligible_voters ev
      WHERE ev.election_id = $1
    `;
    
    const criteriaResult = await pool.query(criteriaQuery, [id]);
    const criteria = criteriaResult.rows[0] || {
      courses: [],
      year_levels: [],
      genders: [],
      semesters: [],
      precincts: []
    };
    
    return res.status(200).json({
      success: true,
      criteria
    });
  } catch (error) {
    console.error('Error fetching election eligibility criteria:', error);
    return res.status(500).json({ 
      success: false,
      message: error.message || 'Failed to fetch election eligibility criteria'
    });
  }
};

exports.approveElection = async (req, res) => {
  try {
    const { id } = req.params;

    const electionBefore = await getElectionById(id);
    if (!electionBefore) {
      return res.status(404).json({ message: "Election not found" });
    }

    const approved = await approveElection(id, req.user.id);

    try {
      if (!electionBefore.created_by) {
        console.warn(`Cannot send notification: Election ${id} has no created_by field`);
      } else {
        const { rows: adminRows } = await pool.query(`
          SELECT id, role_id FROM users 
          WHERE id = $1
        `, [electionBefore.created_by]);
        
        if (adminRows.length === 0) {
          console.warn(`Admin user ID ${electionBefore.created_by} not found in users table`);

          const { rows: adminInfoRows } = await pool.query(`
            SELECT a.id, a.email, u.id as user_id
            FROM admins a
            LEFT JOIN users u ON a.email = u.email
            WHERE a.id = $1
          `, [electionBefore.created_by]);
          
          if (adminInfoRows.length > 0 && adminInfoRows[0].user_id) {
            await notificationService.notifyElectionApproved(approved, adminInfoRows[0].user_id);
          } else {
            console.error(`Could not find a valid user ID for admin ${electionBefore.created_by}`);
          }
        } else {
          await notificationService.notifyElectionApproved(approved, electionBefore.created_by);
        }
      }

      await notificationService.notifyStudentsAboutElection(approved);
    } catch (notifError) {
      console.error('Error sending approval notifications:', notifError);
      console.error(notifError.stack);

    }
    
    res.status(200).json({ 
      message: "Election approved successfully", 
      election: approved 
    });
  } catch (error) {
    console.error('Error approving election:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.rejectElection = async (req, res) => {
  try {
    const { id } = req.params;

    const electionBefore = await getElectionById(id);
    if (!electionBefore) {
      return res.status(404).json({ message: "Election not found" });
    }

    try {
      await notificationService.notifyElectionRejected(electionBefore, electionBefore.created_by, req.user.id);
    } catch (notifError) {
      console.error('Error sending rejection notification:', notifError);

    }
    
    await rejectElection(id);
    
    res.status(200).json({ message: "Election rejected successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getPendingApprovalElections = async (req, res) => {
  try {
    let elections;

    if (req.user.role === 'Admin') {
      elections = await getPendingApprovalElections(req.user.id);
    } else {
      elections = await getPendingApprovalElections();
    }
    
    return res.status(200).json(elections);
  } catch (error) {
    console.error('Error fetching pending approval elections:', error);
    return res.status(500).json({ 
      success: false,
      message: error.message || 'Failed to fetch pending approval elections'
    });
  }
};

exports.sendResultNotifications = async (req, res) => {
  try {
    const { id } = req.params;

    const election = await getElectionById(id);
    if (!election) {
      return res.status(404).json({
        success: false,
        message: "Election not found"
      });
    }

    if (election.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: `Cannot send result notifications for an election with status "${election.status}". Only completed elections are eligible.`
      });
    }

    const notifications = await notificationService.notifyStudentsAboutElectionResults(election);
    
    return res.status(200).json({
      success: true,
      message: `Successfully sent ${notifications.length} result notifications to students who voted`,
      sentCount: notifications.length
    });
  } catch (error) {
    console.error("Error sending result notifications:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send result notifications: " + error.message
    });
  }
};

exports.getStudentElectionStatus = async (req, res) => {
  try {
    const { id: electionId } = req.params;
    const studentId = req.user.studentId;
    
    if (!studentId) {
      return res.status(401).json({ 
        success: false,
        message: "Authentication required. Student ID not found in token."
      });
    }

    const electionCheck = await pool.query(
      `SELECT id, status, needs_approval FROM elections WHERE id = $1`,
      [electionId]
    );

    if (electionCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Election not found"
      });
    }
    
    const election = electionCheck.rows[0];

    const eligibilityCheck = await pool.query(
      `SELECT id, has_voted FROM eligible_voters
       WHERE election_id = $1 AND student_id = $2`,
      [electionId, studentId]
    );
    
    const isEligible = eligibilityCheck.rows.length > 0;
    const hasVoted = isEligible && eligibilityCheck.rows[0].has_voted;
    
    const response = {
      success: true,
      election_id: electionId,
      election_status: election.status,
      needs_approval: election.needs_approval,
      student_status: {
        is_eligible: isEligible,
        has_voted: hasVoted,
      },
      recommended_action: null
    };

    if (hasVoted) {
      const tokenResult = await pool.query(
        `SELECT DISTINCT vote_token FROM votes 
         WHERE election_id = $1 AND student_id = $2 
         LIMIT 1`,
        [electionId, studentId]
      );
      
      if (tokenResult.rows.length > 0) {
        response.student_status.vote_token = tokenResult.rows[0].vote_token;
      }
    }
    
    if (election.needs_approval) {
      response.recommended_action = "view_details";
      response.message = "This election is pending approval and not yet available for voting.";
    } else if (!isEligible) {
      response.recommended_action = "view_details";
      response.message = "You are not eligible to vote in this election.";
    } else if (hasVoted) {
      if (election.status === 'completed') {
        response.recommended_action = "view_results";
        response.message = "You've already voted in this election. Results are now available.";
      } else {
        response.recommended_action = "view_receipt";
        response.message = "You've already voted in this election. View your vote receipt.";
      }
    } else if (election.status === 'ongoing') {
      response.recommended_action = "vote_now";
      response.message = "This election is ongoing. You can cast your vote now.";
    } else if (election.status === 'upcoming') {
      response.recommended_action = "view_details";
      response.message = "This election is upcoming. You will be able to vote when it begins.";
    } else if (election.status === 'completed') {
      response.recommended_action = "view_results";
      response.message = "This election has completed. You did not cast a vote.";
    } else {
      response.recommended_action = "view_details";
      response.message = "View election details.";
    }
    
    return res.status(200).json(response);
  } catch (error) {
    console.error("Error checking student election status:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get election status: " + error.message
    });
  }
};

/**
 * Update eligibility criteria for an election
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
exports.updateElectionCriteria = async (req, res) => {
  try {
    const { id } = req.params;
    const { eligibility } = req.body;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Election ID is required"
      });
    }
    
    if (!eligibility) {
      return res.status(400).json({
        success: false,
        message: "Eligibility criteria are required"
      });
    }
    
    const election = await electionModel.getElectionById(id);
    
    if (!election) {
      return res.status(404).json({
        success: false,
        message: "Election not found"
      });
    }
    
    // Allow updating eligibility criteria for all election statuses
    // Previously this was restricted to only upcoming elections

    const eligibleStudents = await electionModel.getEligibleStudentsForCriteria(eligibility);
    
    if (eligibleStudents.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No eligible voters found with the selected criteria"
      });
    }

    await electionModel.updateEligibleVoters(id, eligibleStudents, eligibility);
    
    res.status(200).json({
      success: true,
      message: "Eligibility criteria updated successfully",
      voterCount: eligibleStudents.length
    });
    
  } catch (error) {
    console.error("Error updating eligibility criteria:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update eligibility criteria"
    });
  }
};

exports.getCompletedElectionResults = async (req, res) => {
  try {
    const { id } = req.params;

    // Get election details with actual total votes
    const election = await pool.query(`
      SELECT 
        e.*,
        COUNT(DISTINCT ev.id) as total_eligible_voters,
        COUNT(DISTINCT CASE WHEN ev.has_voted THEN ev.student_id END) as total_votes,
        CASE 
          WHEN COUNT(DISTINCT ev.id) = 0 THEN 0 
          ELSE ROUND(COUNT(DISTINCT CASE WHEN ev.has_voted THEN ev.student_id END)::NUMERIC * 100 / COUNT(DISTINCT ev.id), 2)
        END as voter_turnout_percentage
      FROM elections e
      LEFT JOIN eligible_voters ev ON e.id = ev.election_id
      WHERE e.id = $1 AND e.status = 'completed'
      GROUP BY e.id
    `, [id]);

    if (!election.rows[0]) {
      return res.status(404).json({
        success: false,
        message: "Election not found or not completed"
      });
    }

    // Get positions with candidates and vote counts
    const results = await pool.query(`
      WITH vote_counts AS (
        SELECT 
          v.position_id,
          v.candidate_id,
          COUNT(DISTINCT v.student_id) as vote_count
        FROM votes v
        WHERE v.election_id = $1
        GROUP BY v.position_id, v.candidate_id
      ),
      position_totals AS (
        SELECT 
          position_id,
          SUM(vote_count) as total_position_votes,
          MAX(vote_count) as max_votes
        FROM vote_counts
        GROUP BY position_id
      )
      SELECT 
        p.id as position_id,
        p.name as position_name,
        p.max_choices,
        c.id as candidate_id,
        c.first_name,
        c.last_name,
        c.image_url,
        c.party as partylist_name,
        COALESCE(vc.vote_count, 0) as vote_count,
        CASE 
          WHEN pt.total_position_votes = 0 THEN 0
          ELSE ROUND(COALESCE(vc.vote_count, 0)::NUMERIC * 100 / NULLIF(pt.total_position_votes, 0), 2)
        END as vote_percentage,
        CASE 
          WHEN COALESCE(vc.vote_count, 0) = pt.max_votes AND pt.max_votes > 0 THEN true
          ELSE false
        END as is_winner,
        COALESCE(pt.total_position_votes, 0) as total_position_votes
      FROM positions p
      JOIN candidates c ON c.position_id = p.id
      LEFT JOIN vote_counts vc ON vc.candidate_id = c.id
      LEFT JOIN position_totals pt ON pt.position_id = p.id
      WHERE p.ballot_id = (
        SELECT id FROM ballots WHERE election_id = $1 LIMIT 1
      )
      ORDER BY p.name, vote_count DESC NULLS LAST, c.last_name, c.first_name
    `, [id]);

    // Format the results by position
    const formattedResults = {};
    results.rows.forEach(row => {
      if (!formattedResults[row.position_id]) {
        formattedResults[row.position_id] = {
          position_id: row.position_id,
          position_name: row.position_name,
          max_choices: row.max_choices,
          total_votes: parseInt(row.total_position_votes) || 0,
          candidates: []
        };
      }
      formattedResults[row.position_id].candidates.push({
        id: row.candidate_id,
        first_name: row.first_name,
        last_name: row.last_name,
        image_url: row.image_url,
        partylist_name: row.partylist_name,
        vote_count: parseInt(row.vote_count),
        vote_percentage: parseFloat(row.vote_percentage) || 0,
        is_winner: row.is_winner
      });
    });

    res.status(200).json({
      success: true,
      data: {
        election: {
          ...election.rows[0],
          total_eligible_voters: parseInt(election.rows[0].total_eligible_voters) || 0,
          total_votes: parseInt(election.rows[0].total_votes) || 0,
          voter_turnout_percentage: parseFloat(election.rows[0].voter_turnout_percentage) || 0
        },
        positions: Object.values(formattedResults)
      }
    });

  } catch (error) {
    console.error('Error getting election results:', error);
    res.status(500).json({
      success: false,
      message: "Failed to get election results"
    });
  }
};

// Function to generate unique 6-character code from receipt ID (same as frontend)
function generateUniqueCode(receiptId) {
  if (!receiptId) return 'N/A';
  
  // Create a hash from the receipt ID using a more robust hashing algorithm
  let hash = 0;
  for (let i = 0; i < receiptId.length; i++) {
    const char = receiptId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Use absolute value and convert to base36 for alphanumeric characters
  const absHash = Math.abs(hash);
  const base36 = absHash.toString(36).toUpperCase();
  
  // Take first 6 characters and pad if necessary
  let code = base36.substring(0, 6);
  if (code.length < 6) {
    // Pad with additional characters from the hash
    const padded = (absHash * 31).toString(36).toUpperCase();
    code = (code + padded).substring(0, 6);
  }
  
  // Ensure we have exactly 6 alphanumeric characters
  const alphanumeric = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  while (code.length < 6) {
    const randomIndex = Math.abs(hash + code.length) % alphanumeric.length;
    code += alphanumeric[randomIndex];
  }
  
  return code.substring(0, 6);
}

exports.getVoterVerificationCodes = async (req, res) => {
  try {
    const { id: electionId } = req.params;
    
    if (!electionId || isNaN(parseInt(electionId))) {
      return res.status(400).json({
        success: false,
        message: "Invalid election ID"
      });
    }

    // Check if election exists
    const electionCheck = await pool.query(
      'SELECT id, title, status FROM elections WHERE id = $1',
      [electionId]
    );

    if (electionCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Election not found"
      });
    }

    // Get all voters who have voted in this election with their vote tokens
    const votersQuery = `
      SELECT DISTINCT ON (v.vote_token)
        v.vote_token,
        v.created_at as vote_date,
        s.student_number,
        s.first_name,
        s.last_name,
        s.course_name,
        s.year_level
      FROM votes v
      JOIN students s ON v.student_id = s.id
      WHERE v.election_id = $1
      ORDER BY v.vote_token, v.created_at DESC
    `;

    const votersResult = await pool.query(votersQuery, [electionId]);

    // Generate verification codes for each voter
    const voterCodes = votersResult.rows.map(voter => ({
      voteToken: voter.vote_token,
      verificationCode: generateUniqueCode(voter.vote_token),
      voteDate: voter.vote_date,
      studentNumber: voter.student_number,
      firstName: voter.first_name,
      lastName: voter.last_name,
      courseName: voter.course_name,
      yearLevel: voter.year_level
    }));

    // Sort by vote date (most recent first)
    voterCodes.sort((a, b) => new Date(b.voteDate) - new Date(a.voteDate));

    res.json({
      success: true,
      data: {
        election: {
          id: electionCheck.rows[0].id,
          title: electionCheck.rows[0].title,
          status: electionCheck.rows[0].status
        },
        voterCodes,
        totalVoters: voterCodes.length
      }
    });

  } catch (error) {
    console.error('Error fetching voter verification codes:', error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch voter verification codes"
    });
  }
};