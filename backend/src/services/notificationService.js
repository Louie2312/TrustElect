const {
  createNotification,
  createNotificationForUsers,
} = require('../models/notificationModel');
const pool = require('../config/db');

/**
 * Normalize role format - helps with inconsistent role naming throughout the application
 * @param {string} role - The role to normalize
 * @returns {string} The normalized role
 */
const normalizeRole = (role) => {
  if (!role) return '';
  
  const lowerRole = role.toLowerCase();
  
  if (lowerRole === 'superadmin' || lowerRole === 'super admin' || lowerRole === 'super_admin') {
    return 'Super Admin'; 
  }
  
  if (lowerRole === 'admin') {
    return 'Admin';
  }
  
  if (lowerRole === 'student') {
    return 'Student';
  }

  return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
};


const NOTIFICATION_TYPES = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
};


const RELATED_ENTITIES = {
  ELECTION: 'election',
  BALLOT: 'ballot',
  VOTE: 'vote',
  RESULT: 'result',
};

/**
 * Notify superadmins that an election needs approval
 * @param {Object} election - The election object
 * @returns {Promise<Array>} The created notifications
 */
const notifyElectionNeedsApproval = async (election) => {
  try {
    if (!election.created_by) {
      return [];
    }
    
 
    const { rows: superadminUsers } = await pool.query(`
      SELECT id FROM users 
      WHERE role_id = 1
      AND active = true
    `);
    
    let superadminIds = superadminUsers.map(user => user.id);
    
    if (superadminIds.length === 0) {
      const { rows: inactiveUsers } = await pool.query(`
        SELECT id FROM users 
        WHERE role_id = 1
      `);
      superadminIds = inactiveUsers.map(user => user.id);
    }
    
    if (superadminIds.length === 0) {
      const { rows: joinedUsers } = await pool.query(`
        SELECT u.id 
        FROM users u
        JOIN superadmins s ON u.email = s.email
        WHERE u.active = true OR u.active IS NULL
      `);
      superadminIds = joinedUsers.map(user => user.id);
    }
    
    if (superadminIds.length === 0) {
      return [];
    }
    
    let adminName = 'An admin';
    if (election.created_by) {
      const { rows: userRows } = await pool.query(`
        SELECT name FROM users WHERE id = $1
      `, [election.created_by]);
      
      if (userRows.length > 0 && userRows[0].name) {
        adminName = userRows[0].name;
      }
    }

    const result = await createNotificationForUsers(
      superadminIds,
      'Super Admin',
      'Election Needs Approval',
      `${adminName} created "${election.title}" that needs approval.`,
      NOTIFICATION_TYPES.INFO,
      RELATED_ENTITIES.ELECTION,
      election.id
    );
    
    return result;
  } catch (error) {

    try {
      const { rows } = await pool.query(`SELECT id FROM users WHERE role_id = 1 LIMIT 10`);
      const superIds = rows.map(row => row.id);
      
      if (superIds.length > 0) {
        return await createNotificationForUsers(
          superIds,
          'Super Admin',
          'Election Needs Approval',
          `An election "${election.title}" needs your approval.`,
          NOTIFICATION_TYPES.INFO,
          RELATED_ENTITIES.ELECTION,
          election.id
        );
      }
    } catch (fallbackError) {
      return [];
    }
    return [];
  }
};

/**
 * Notify the admin that their election has been approved
 * @param {Object} election - The election object
 * @param {string} adminId - The ID of the admin who created the election
 * @returns {Promise<Array>} The created notifications
 */
const notifyElectionApproved = async (election, adminId) => {
  try {
    if (!adminId) {
      return [];
    }
    
    let userRole = 'Admin'; 
    try {
      const { rows } = await pool.query(`
        SELECT role_id FROM users WHERE id = $1
      `, [adminId]);
      
      if (rows.length > 0) {
        const user = rows[0];
        if (user.role_id === 1) {
          userRole = 'Super Admin';
        }
      }
    } catch (roleError) {
      console.error(`Error checking role for user ${adminId}:`, roleError.message);

    }
    
    return createNotificationForUsers(
      [adminId],
      normalizeRole(userRole),
      'Election Approved',
      `Your election "${election.title}" has been approved.`,
      NOTIFICATION_TYPES.SUCCESS,
      RELATED_ENTITIES.ELECTION,
      election.id
    );
  } catch (error) {
    console.error('Error creating election approval notification:', error);
    throw error;
  }
};

/**
 * Send a notification about an election being rejected
 * @param {Object} election - The election object
 * @param {string} adminId - The ID of the admin who created the election
 * @param {string} rejectedById - The ID of the superadmin who rejected the election
 * @returns {Promise<Array>} The created notifications
 */
const notifyElectionRejected = async (election, adminId, rejectedById) => {
  try {
    const promises = [];

    if (adminId) {
      promises.push(
        createNotification({
          user_id: adminId,
          role: normalizeRole('Admin'),
          title: 'Election Rejected',
          message: `Your election "${election.title}" has been rejected.`,
          type: NOTIFICATION_TYPES.ERROR,
          related_entity: RELATED_ENTITIES.ELECTION,
          entity_id: election.id
        })
      );
    }
    
    if (rejectedById) {
      const { rows: superadmins } = await pool.query(`
        SELECT id FROM superadmins WHERE id != $1
      `, [rejectedById]);
      
      if (superadmins.length > 0) {
        const superadminIds = superadmins.map(row => row.id);
        promises.push(
          createNotificationForUsers(
            superadminIds,
            normalizeRole('Super Admin'),
            'Election Rejected',
            `Election "${election.title}" was rejected.`,
            NOTIFICATION_TYPES.INFO,
            RELATED_ENTITIES.ELECTION,
            election.id
          )
        );
      }
    }
    
  
    const results = await Promise.all(promises);
    return results.flat();
  } catch (error) {
    console.error('Error creating election rejection notification:', error);
    return [];
  }
};

/**
 * Send a notification about a ballot being created
 * @param {string} adminId - The ID of the admin who created the ballot
 * @param {Object} election - The election object
 * @returns {Promise<Array>} The created notifications
 */
const notifyBallotCreated = async (adminId, election) => {
  try {
    const promises = [];

    if (election.created_by && election.created_by !== adminId) {
      promises.push(
        createNotification({
          user_id: election.created_by,
          role: normalizeRole('Admin'),
          title: 'Ballot Created',
          message: `A ballot has been created for your election "${election.title}".`,
          type: NOTIFICATION_TYPES.INFO,
          related_entity: RELATED_ENTITIES.BALLOT,
          entity_id: election.id
        })
      );
    }

    const { rows: admins } = await pool.query(`
      SELECT id FROM admins WHERE id != $1 AND id != $2
    `, [adminId || 0, election.created_by || 0]);
    
    if (admins.length > 0) {
      const adminIds = admins.map(row => row.id);
      promises.push(
        createNotificationForUsers(
          adminIds,
          normalizeRole('Admin'),
          'Ballot Created',
          `A ballot has been created for election "${election.title}".`,
          NOTIFICATION_TYPES.INFO,
          RELATED_ENTITIES.BALLOT,
          election.id
        )
      );
    }

    const { rows: superadmins } = await pool.query(`
      SELECT id FROM superadmins
    `);
    
    if (superadmins.length > 0) {
      const superadminIds = superadmins.map(row => row.id);
      promises.push(
        createNotificationForUsers(
          superadminIds,
          normalizeRole('Super Admin'),
          'Ballot Created',
          `A ballot has been created for election "${election.title}" by an admin.`,
          NOTIFICATION_TYPES.INFO,
          RELATED_ENTITIES.BALLOT,
          election.id
        )
      );
    }

    const results = await Promise.all(promises);
    return results.flat();
  } catch (error) {
    return [];
  }
};

/**
 * Get student IDs eligible for this election
 * @param {Object} election - The election object
 * @returns {Promise<Array>} Array of student IDs
 */
const getEligibleStudentIds = async (election) => {
  try {
    const { rows } = await pool.query(`
      SELECT DISTINCT student_id 
      FROM eligible_voters
      WHERE election_id = $1
    `, [election.id]);
    
    return rows.map(row => row.student_id);
  } catch (error) {
    return [];
  }
};

/**
 * Send a notification to eligible students about an election
 * @param {Object} election - The election object
 * @returns {Promise<Array>} The created notifications
 */
const notifyStudentsAboutElection = async (election) => {
  try {
    if (election.needs_approval) {
      return [];
    }

    const studentIds = await getEligibleStudentIds(election);
    
    if (studentIds.length === 0) {
      return [];
    }

    const studentUserIds = [];
    const studentRoleMappings = [];

    const batchSize = 50;
    for (let i = 0; i < studentIds.length; i += batchSize) {
      const batch = studentIds.slice(i, i + batchSize);

      const { rows } = await pool.query(`
        SELECT s.id as student_id, u.id as user_id
        FROM students s
        JOIN users u ON s.email = u.email
        WHERE s.id = ANY($1)
      `, [batch]);

      rows.forEach(row => {
        studentUserIds.push(row.user_id);
  
        studentRoleMappings.push({
          userId: row.user_id,
          studentId: row.student_id
        });
      });
    }
    
    if (studentUserIds.length === 0) {
      return [];
    }

    const normalizedRole = normalizeRole('Student');
    
    const notifications = await createNotificationForUsers(
      studentUserIds,
      normalizedRole,
      'New Election Available',
      `A new election "${election.title}" is now available for you to vote in.`,
      NOTIFICATION_TYPES.INFO,
      RELATED_ENTITIES.ELECTION,
      election.id
    );
    
    return notifications;
  } catch (error) {
    return [];
  }
};

/**
 * Send notifications about election status changes
 * @param {Object} election - The election object with updated status
 * @param {string} previousStatus - The previous status of the election
 * @returns {Promise<Array>} The created notifications
 */
const notifyElectionStatusChange = async (election, previousStatus) => {
  try {
    const promises = [];

    const { rows: admins } = await pool.query(`
      SELECT id FROM admins
    `);

    if (admins.length > 0) {
      const adminIds = admins.map(row => row.id);
      let message = '';

      switch (election.status) {
        case 'ongoing':
          message = `Election "${election.title}" is now open for voting!`;
          break;
        case 'completed': 
          message = `Election "${election.title}" has ended. Results are now available.`;
          break;
        case 'upcoming':
          message = `Election "${election.title}" has been scheduled to start on ${new Date(election.start_date).toLocaleString()}.`;
          break;
        case 'draft':
          message = `Election "${election.title}" has been changed to draft status.`;
          break;
        default:
          message = `Election "${election.title}" status has changed to ${election.status}.`;
      }
      
      promises.push(
        createNotificationForUsers(
          adminIds,
          normalizeRole('Admin'),
          'Election Status Change',
          message,
          NOTIFICATION_TYPES.INFO,
          RELATED_ENTITIES.ELECTION,
          election.id
        )
      );
    }

    const { rows: superadmins } = await pool.query(`
      SELECT id FROM superadmins
    `);
    
    if (superadmins.length > 0) {
      const superadminIds = superadmins.map(row => row.id);
      let message = '';
      
      switch (election.status) {
        case 'ongoing':
          message = `Election "${election.title}" is now open for voting.`;
          break;
        case 'completed':
          message = `Election "${election.title}" has completed. Results are now available.`;
          break;
        default:
          message = `Election "${election.title}" status has changed from ${previousStatus} to ${election.status}.`;
      }
      
      promises.push(
        createNotificationForUsers(
          superadminIds,
          normalizeRole('Super Admin'),
          'Election Status Change',
          message,
          NOTIFICATION_TYPES.INFO,
          RELATED_ENTITIES.ELECTION,
          election.id
        )
      );
    }

    if (election.status === 'ongoing') {
      promises.push(notifyStudentsAboutElection(election));
    }

    if (election.status === 'completed') {
      promises.push(notifyStudentsAboutElectionResults(election));
    }

    const results = await Promise.all(promises);
    return results.flat();
    
  } catch (error) {
    return [];
  }
};

/**
 * Send a notification to students about election results
 * @param {Object} election - The election object
 * @returns {Promise<Array>} The created notifications
 */
const notifyStudentsAboutElectionResults = async (election) => {
  try {
    const studentIds = await getEligibleStudentIds(election);
    
    if (studentIds.length === 0) {
      return [];
    }

    const { rows: votes } = await pool.query(`
      SELECT DISTINCT student_id 
      FROM votes 
      WHERE election_id = $1
    `, [election.id]);
    
    const votedStudentIds = votes.map(vote => vote.student_id);
    const nonVotedStudentIds = studentIds.filter(id => !votedStudentIds.includes(id));
    
    const promises = [];

    if (votedStudentIds.length > 0) {
      const { rows: votedUsers } = await pool.query(`
        SELECT s.id as student_id, u.id as user_id
        FROM students s
        JOIN users u ON s.email = u.email
        WHERE s.id = ANY($1)
      `, [votedStudentIds]);
      
      const votedUserIds = votedUsers.map(row => row.user_id);
      
      if (votedUserIds.length > 0) {
        promises.push(
          createNotificationForUsers(
            votedUserIds,
            normalizeRole('Student'),
            'Election Results Available',
            `The results for "${election.title}" are now available. Thank you for voting!`,
            NOTIFICATION_TYPES.SUCCESS,
            RELATED_ENTITIES.RESULT,
            election.id
          )
        );
      }
    }

    if (nonVotedStudentIds.length > 0) {
      const { rows: nonVotedUsers } = await pool.query(`
        SELECT s.id as student_id, u.id as user_id
        FROM students s
        JOIN users u ON s.email = u.email
        WHERE s.id = ANY($1)
      `, [nonVotedStudentIds]);
      
      const nonVotedUserIds = nonVotedUsers.map(row => row.user_id);
      
      if (nonVotedUserIds.length > 0) {
        promises.push(
          createNotificationForUsers(
            nonVotedUserIds,
            normalizeRole('Student'),
            'Election Results Available',
            `The results for "${election.title}" are now available. You did not cast a vote in this election.`,
            NOTIFICATION_TYPES.WARNING,
            RELATED_ENTITIES.RESULT,
            election.id
          )
        );
      }
    }

    const results = await Promise.all(promises);
    return results.flat();
    
  } catch (error) {
    return [];
  }
};

/**
 * Debug function to send a test notification to all superadmins
 * @returns {Promise<Array>} The created test notifications
 */
const debugSendTestToSuperadmins = async () => {
  try {
    const { rows: superadmins } = await pool.query(`
      SELECT id FROM users WHERE role_id = 1
    `);
    
    if (superadmins.length === 0) {
      console.warn('No superadmins found to send test notification');
      const { rows: directSuperadmins } = await pool.query(`
        SELECT id FROM superadmins
      `);
      
      if (directSuperadmins.length > 0) {
        const superadminIds = directSuperadmins.map(admin => admin.id);
        
        const result = await createNotificationForUsers(
          superadminIds,
          normalizeRole('SuperAdmin'),
          'Test Notification',
          'This is a test notification to verify superadmin notifications are working.',
          NOTIFICATION_TYPES.INFO,
          null,
          null
        );
        
        return result;
      }
      
      return [];
    }
    
    const superadminIds = superadmins.map(admin => admin.id);
    
    const result = await createNotificationForUsers(
      superadminIds,
      normalizeRole('SuperAdmin'),
      'Test Notification',
      'This is a test notification to verify superadmin notifications are working.',
      NOTIFICATION_TYPES.INFO,
      null,
      null
    );
    
    return result;
  } catch (error) {
    console.error('Error sending test notification to superadmins:', error);
    console.error(error.stack);
    throw error;
  }
};

module.exports = {
  NOTIFICATION_TYPES,
  RELATED_ENTITIES,
  normalizeRole,
  notifyElectionNeedsApproval,
  notifyElectionApproved,
  notifyElectionRejected,
  notifyBallotCreated,
  notifyStudentsAboutElection,
  notifyElectionStatusChange,
  notifyStudentsAboutElectionResults,
  debugSendTestToSuperadmins
};