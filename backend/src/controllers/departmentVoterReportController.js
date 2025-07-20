const pool = require('../config/db');

exports.getDepartmentVoterReport = async (req, res) => {
  try {
    const { page = 1, limit = 10, department = '', search = '' } = req.query;
    const offset = (page - 1) * limit;

    // Build the WHERE clause and parameters
    let whereClause = 'WHERE s.is_active = TRUE';
    const queryParams = [];
    
    if (department) {
      queryParams.push(department);
      whereClause += ` AND s.course_name = $${queryParams.length}`;
    }
    
    if (search) {
      queryParams.push(`%${search}%`);
      whereClause += ` AND (LOWER(s.first_name) LIKE LOWER($${queryParams.length}) OR LOWER(s.last_name) LIKE LOWER($${queryParams.length}) OR s.student_number LIKE $${queryParams.length})`;
    }

    // Base query for students with voting status
    const baseQuery = `
      WITH student_voting AS (
        SELECT 
          s.id,
          s.student_number,
          s.first_name,
          s.last_name,
          s.email,
          s.course_name as department,
          s.year_level,
          COALESCE(
            (SELECT TRUE FROM votes v 
             WHERE v.student_id = s.id 
             LIMIT 1), 
            FALSE
          ) as has_voted,
          (SELECT MAX(v.created_at) 
           FROM votes v 
           WHERE v.student_id = s.id) as vote_timestamp
        FROM students s
        ${whereClause}
      )
    `;

    // Get total count
    const countQuery = `
      SELECT COUNT(*) FROM student_voting
    `;

    // Get department statistics
    const statsQuery = `
      SELECT 
        department,
        COUNT(*) as total_students,
        SUM(CASE WHEN has_voted THEN 1 ELSE 0 END) as voted_count
      FROM student_voting
      GROUP BY department
    `;

    // Get paginated student data
    const studentsQuery = `
      SELECT *
      FROM student_voting
      ORDER BY last_name, first_name
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;

    // Add pagination parameters
    const paginationParams = [...queryParams, limit, offset];

    // Execute queries
    const [totalResult, statsResult, studentsResult] = await Promise.all([
      pool.query(baseQuery + countQuery, queryParams),
      pool.query(baseQuery + statsQuery, queryParams),
      pool.query(baseQuery + studentsQuery, paginationParams)
    ]);

    // Get unique departments for the filter dropdown
    const departmentsQuery = `
      SELECT DISTINCT course_name as department
      FROM students
      WHERE is_active = TRUE
      ORDER BY course_name
    `;
    const departmentsResult = await pool.query(departmentsQuery);

    const total = parseInt(totalResult.rows[0].count);
    const total_pages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        students: studentsResult.rows,
        departmentStats: statsResult.rows,
        departments: departmentsResult.rows.map(row => row.department),
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          total_pages
        }
      }
    });

  } catch (error) {
    console.error('Error in getDepartmentVoterReport:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch voter report data',
      details: error.message
    });
  }
}; 