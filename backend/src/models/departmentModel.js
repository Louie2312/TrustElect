const pool = require("../config/db");

class Department {
  static async create({ department_name, department_type, admin_id, created_by }) {
    // Check if admin is already assigned to another department
    if (admin_id) {
      const checkQuery = `
        SELECT id, department_name FROM departments 
        WHERE admin_id = $1 AND is_active = TRUE`;
      const checkResult = await pool.query(checkQuery, [admin_id]);
      
      if (checkResult.rows.length > 0) {
        const error = new Error(`Admin is already assigned to the ${checkResult.rows[0].department_name} department`);
        error.status = 400;
        throw error;
      }
    }
    
    const query = `
      INSERT INTO departments (department_name, department_type, admin_id, created_by)
      VALUES ($1, $2, $3, $4)
      RETURNING *`;
    const values = [department_name, department_type, admin_id, created_by];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  static async findAll() {
    const query = `
      SELECT 
        d.*,
        CONCAT(u.first_name, ' ', u.last_name) as admin_name,
        a.employee_number as admin_employee_number
      FROM departments d
      LEFT JOIN users u ON d.admin_id = u.id
      LEFT JOIN admins a ON u.id = a.user_id
      WHERE d.is_active = true
      ORDER BY d.department_name ASC`;
    const { rows } = await pool.query(query);
    return rows;
  }

  static async findById(id) {
    const query = `
      SELECT 
        d.*,
        CONCAT(u.first_name, ' ', u.last_name) as admin_name,
        a.employee_number as admin_employee_number
      FROM departments d
      LEFT JOIN users u ON d.admin_id = u.id
      LEFT JOIN admins a ON u.id = a.user_id
      WHERE d.id = $1 AND d.is_active = TRUE`;
    const { rows } = await pool.query(query, [id]);
    return rows[0];
  }

  static async update(id, { department_name, department_type, admin_id }) {
    const query = `
      UPDATE departments
      SET 
        department_name = COALESCE($1, department_name),
        department_type = COALESCE($2, department_type),
        admin_id = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *`;
    const values = [department_name, department_type, admin_id, id];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  static async delete(id) {
    const query = `
      UPDATE departments
      SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *`;
    const { rows } = await pool.query(query, [id]);
    return rows[0];
  }

  static async restore(id) {
    const query = `
      UPDATE departments
      SET is_active = TRUE, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *`;
    const { rows } = await pool.query(query, [id]);
    return rows[0];
  }

  static async findArchived() {
    const query = `
      SELECT 
        d.*,
        CONCAT(u.first_name, ' ', u.last_name) as admin_name,
        a.employee_number as admin_employee_number
      FROM departments d
      LEFT JOIN users u ON d.admin_id = u.id
      LEFT JOIN admins a ON u.id = a.user_id
      WHERE d.is_active = FALSE
      ORDER BY d.department_name ASC`;
    const { rows } = await pool.query(query);
    return rows;
  }

  static async getAllDepartmentNames() {
    const query = `
      SELECT department_name
      FROM departments
      WHERE is_active = TRUE
      ORDER BY department_name ASC`;
    const { rows } = await pool.query(query);
    return rows.map(row => row.department_name);
  }

  static async getAdminsByDepartment(departmentId) {
    const query = `
      SELECT 
        u.id, 
        CONCAT(u.first_name, ' ', u.last_name) as name,
        a.employee_number,
        u.email
      FROM users u
      JOIN admins a ON u.id = a.user_id
      JOIN departments d ON a.department = d.department_name
      WHERE d.id = $1 AND u.is_active = TRUE`;
    const { rows } = await pool.query(query, [departmentId]);
    return rows;
  }
}

module.exports = Department;
