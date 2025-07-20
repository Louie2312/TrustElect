const RoleBasedUserReport = require('../models/roleBasedUserReportModel');

const getRoleBasedUserSummary = async (req, res) => {
  try {
    const summary = await RoleBasedUserReport.getRoleBasedUserSummary();
    
    // Flatten the users array from all roles
    const allUsers = summary.reduce((acc, role) => {
      if (role.users) {
        acc.push(...role.users);
      }
      return acc;
    }, []);

    res.json({
      success: true,
      data: {
        summary: summary[0].overall_stats,
        role_distribution: summary.map(role => ({
          role_name: role.role_name,
          total_users: role.total_users,
          active_users: role.active_users,
          inactive_users: role.inactive_users
        })),
        users: allUsers
      }
    });
  } catch (error) {
    console.error('Error in getRoleBasedUserSummary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch role-based user summary'
    });
  }
};

const getRoleBasedUserDetails = async (req, res) => {
  try {
    const { roleId } = req.params;
    const details = await RoleBasedUserReport.getRoleBasedUserDetails(roleId);
    
    if (!details) {
      return res.status(404).json({
        success: false,
        message: 'Role-based user details not found'
      });
    }

    res.json({
      success: true,
      data: details
    });
  } catch (error) {
    console.error('Error getting role-based user details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get role-based user details',
      error: error.message
    });
  }
};

module.exports = {
  getRoleBasedUserSummary,
  getRoleBasedUserDetails
}; 