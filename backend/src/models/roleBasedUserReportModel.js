const pool = require("../config/db");

const getRoleBasedUserSummary = async () => {
  const result = await pool.query(`
    WITH user_stats AS (
      SELECT 
        u.role_id,
        CASE u.role_id
          WHEN 1 THEN 'Super Admin'
          WHEN 2 THEN 'Admin'
          WHEN 3 THEN 'Student'
          ELSE 'Unknown'
        END as role_name,
        COUNT(u.id) as total_users,
        COUNT(CASE WHEN u.is_active = true THEN 1 END) as active_users,
        COUNT(CASE WHEN u.is_active = false THEN 1 END) as inactive_users,
        json_agg(
          json_build_object(
            'id', u.id,
            'name', CONCAT(u.first_name, ' ', u.last_name),
            'email', u.email,
            'role', CASE u.role_id
                      WHEN 1 THEN 'Super Admin'
                      WHEN 2 THEN 'Admin'
                      WHEN 3 THEN 'Student'
                      ELSE 'Unknown'
                    END,
            'department', CASE 
                          WHEN u.role_id = 2 THEN a.department
                          WHEN u.role_id = 3 THEN s.course_name
                          ELSE NULL
                        END,
            'status', CASE WHEN u.is_active THEN 'active' ELSE 'inactive' END
          )
        ) as users
      FROM users u
      LEFT JOIN admins a ON u.id = a.user_id
      LEFT JOIN students s ON u.id = s.user_id
      GROUP BY u.role_id
    )
    SELECT 
      us.*,
      (
        SELECT json_build_object(
          'total_users', SUM(total_users),
          'active_users', SUM(active_users),
          'inactive_users', SUM(inactive_users)
        )
        FROM user_stats
      ) as overall_stats
    FROM user_stats us
    ORDER BY 
      CASE us.role_name 
        WHEN 'Super Admin' THEN 1 
        WHEN 'Admin' THEN 2 
        WHEN 'Student' THEN 3 
        ELSE 4 
      END;
  `);
  
  return result.rows;
};

const getRoleBasedUserDetails = async (roleId) => {
  const result = await pool.query(`
    WITH user_details AS (
      SELECT 
        u.id,
        u.username,
        u.email,
        u.first_name || ' ' || u.last_name as full_name,
        u.is_active,
        u.created_at,
        u.updated_at,
        CASE 
          WHEN u.role_id = 2 THEN a.department
          WHEN u.role_id = 3 THEN s.course_name
          ELSE NULL
        END as department_name,
        CASE u.role_id
          WHEN 1 THEN 'Super Admin'
          WHEN 2 THEN 'Admin'
          WHEN 3 THEN 'Student'
          ELSE 'Unknown'
        END as role_name
      FROM users u
      LEFT JOIN admins a ON u.id = a.user_id
      LEFT JOIN students s ON u.id = s.user_id
      WHERE u.role_id = $1
    )
    SELECT 
      CASE $1
        WHEN 1 THEN 'Super Admin'
        WHEN 2 THEN 'Admin'
        WHEN 3 THEN 'Student'
        ELSE 'Unknown'
      END as role_name,
      COUNT(ud.*) as total_users,
      COUNT(CASE WHEN ud.is_active = true THEN 1 END) as active_users,
      COUNT(CASE WHEN ud.is_active = false THEN 1 END) as inactive_users,
      json_agg(
        json_build_object(
          'id', ud.id,
          'username', ud.username,
          'email', ud.email,
          'full_name', ud.full_name,
          'is_active', ud.is_active,
          'department', ud.department_name,
          'role', ud.role_name,
          'created_at', ud.created_at,
          'updated_at', ud.updated_at
        )
      ) as users
    FROM user_details ud
    GROUP BY ud.role_name;
  `, [roleId]);
  
  return result.rows[0];
};

module.exports = {
  getRoleBasedUserSummary,
  getRoleBasedUserDetails
}; 