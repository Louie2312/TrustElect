const pool = require("../config/db");
const bcrypt = require("bcryptjs"); // Changed from "bcrypt" to "bcryptjs"


const checkEmployeeNumberExists = async (employeeNumber, excludeAdminId = null) => {
  try {
    let query = "SELECT user_id FROM admins WHERE employee_number = $1";
    let values = [employeeNumber];

    if (excludeAdminId) {
      query += " AND user_id != $2"; 
      values.push(excludeAdminId);
    }

    const result = await pool.query(query, values);
    return result.rowCount > 0 ? result.rows[0] : null; 
  } catch (error) {
    console.error("Error checking employee number:", error);
    throw error;
  }
};

const getAdminByEmail = async (email) => {
  const query = "SELECT * FROM users WHERE email = $1 AND role_id = 2"; 
  const result = await pool.query(query, [email]);
  return result.rows[0] || null;
};

const getAdminById = async (id) => {
  try {
    const query = `
      SELECT u.id, u.first_name, u.last_name, u.email, u.role_id, u.is_active, 
             a.employee_number, a.department
      FROM users u
      LEFT JOIN admins a ON u.id = a.user_id
      WHERE u.id = $1 AND (u.role_id = 1 OR u.role_id = 2);
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  } catch (error) {
    console.error("Error fetching admin by ID:", error);
    throw error;
  }
};

const checkAdminEmailExists = async (email, excludeAdminId = null) => {
  try {
    let query = "SELECT user_id FROM admins WHERE email = $1";
    let values = [email];

    if (excludeAdminId) {
      query += " AND user_id != $2"; 
      values.push(excludeAdminId);
    }

    const result = await pool.query(query, values);
    return result.rowCount > 0 ? result.rows[0] : null; 
  } catch (error) {
    console.error("Error checking admin email:", error);
    throw error;
  }
};

const registerAdmin = async (firstName, lastName, email, username, hashedPassword, employeeNumber, department, createdBy) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN"); 

    
    const userQuery = `
      INSERT INTO users (first_name, last_name, email, username, password_hash, role_id, created_by, is_email_verified, is_first_login, is_active)
      VALUES ($1, $2, $3, $4, $5, 2, $6, FALSE, TRUE, TRUE) RETURNING id;
    `;
    const userValues = [firstName, lastName, email, username, hashedPassword, createdBy];
    const userResult = await client.query(userQuery, userValues);
    const userId = userResult.rows[0].id;

    
    const adminQuery = `
      INSERT INTO admins (user_id, first_name, last_name, email, employee_number, department, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7);
    `;
    const adminValues = [userId, firstName, lastName, email, employeeNumber, department, createdBy];
    await client.query(adminQuery, adminValues);

    await client.query("COMMIT"); 
    return { id: userId, firstName, lastName, email, department, employeeNumber };
  } catch (error) {
    await client.query("ROLLBACK"); 
    console.error("Error Registering Admin:", error);
    throw error;
  } finally {
    client.release();
  }
};


const getAllAdmins = async () => {
  try {
    const query = `
      SELECT users.id, users.first_name, users.last_name, users.email, users.is_active, 
             admins.employee_number, admins.department, users.is_locked, users.locked_until
      FROM users
      JOIN admins ON users.id = admins.user_id
      WHERE users.role_id = 2;
    `;
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    console.error("Error fetching admins:", error);
    throw error;
  }
};

const getSuperAdmins = async () => {
  try {
    const query = `
      SELECT id, first_name, last_name, email, is_active, is_locked, locked_until
      FROM users
      WHERE role_id = 1;
    `;
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    console.error("Error fetching super admins:", error);
    throw error;
  }
};

const updateAdmin = async (id, fields) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const updates = [];
    const values = [];
    let index = 1;

    if (fields.firstName) {
      updates.push(`first_name = $${index}`);
      values.push(fields.firstName);
      index++;
    }
    if (fields.lastName) {
      updates.push(`last_name = $${index}`);
      values.push(fields.lastName);
      index++;
    }
    if (fields.email) {
      updates.push(`email = $${index}`);
      values.push(fields.email);
      index++;
    }
    if (fields.employeeNumber) {
      updates.push(`employee_number = $${index}`);
      values.push(fields.employeeNumber);
      index++;
    }
    if (fields.department) {
      updates.push(`department = $${index}`);
      values.push(fields.department);
      index++;
    }

    if (updates.length === 0) {
      return null;
    }

    values.push(id);

    const updateQuery = `
      UPDATE admins
      SET ${updates.join(", ")}, updated_at = NOW()
      WHERE user_id = $${index} RETURNING *;
    `;

    const result = await client.query(updateQuery, values);
    await client.query("COMMIT");
    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};


const softDeleteAdmin = async (id) => {
  try {
    const query = `
      UPDATE users 
      SET is_active = FALSE, updated_at = NOW() 
      WHERE id = $1 AND role_id = 2 RETURNING *;
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  } catch (error) {
    console.error("Error deleting admin:", error);
    throw error;
  }
};

const restoreAdmin = async (id) => {
  try {
    const query = `
      UPDATE users 
      SET is_active = TRUE, updated_at = NOW() 
      WHERE id = $1 AND role_id = 2 RETURNING *;
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  } catch (error) {
    console.error("Error restoring admin:", error);
    throw error;
  }
};

const resetAdminPassword = async (id, newPassword) => {
  try {
    const checkQuery = "SELECT id, first_name, last_name, email FROM users WHERE id = $1 AND role_id = 2";
    const checkResult = await pool.query(checkQuery, [id]);

    if (checkResult.rowCount === 0) {
      console.error(`Admin ID ${id} not found.`);
      return null;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const query = `
      UPDATE users 
      SET password_hash = $1, is_first_login = TRUE, updated_at = NOW()
      WHERE id = $2 AND role_id = 2 
      RETURNING id, first_name, last_name, email, updated_at;
    `;

    const result = await pool.query(query, [hashedPassword, id]);

    if (result.rowCount === 0) {
      console.error(`Failed to update password for Admin ID ${id}.`);
      return null;
    }

    return result.rows[0];
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Database error during password reset.");
  }
};


const deleteAdminPermanently = async (adminId) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const checkAdminQuery = "SELECT * FROM admins WHERE user_id = $1";
    const adminCheck = await client.query(checkAdminQuery, [adminId]);
    
    if (adminCheck.rowCount > 0) {

      await client.query("DELETE FROM admins WHERE user_id = $1", [adminId]);
    }

    const result = await client.query("DELETE FROM users WHERE id = $1 RETURNING *", [adminId]);

    await client.query("COMMIT");
    return result.rows[0] || null;
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Database Error:", error);
    throw error;
  } finally {
    client.release();
  }
};

const unlockAdminAccount = async (adminId) => {
  try {
    const query = `
      UPDATE users
      SET 
        is_locked = FALSE,
        login_attempts = 0,
        locked_until = NULL
      WHERE id = $1 AND role_id = 2
      RETURNING id;
    `;
    const result = await pool.query(query, [adminId]);
    return result.rows[0] || null;
  } catch (error) {
    console.error("Error unlocking admin account:", error);
    throw error;
  }
};

module.exports = {checkAdminEmailExists, checkEmployeeNumberExists, registerAdmin, getAdminByEmail, getAllAdmins, updateAdmin, softDeleteAdmin, restoreAdmin, resetAdminPassword, deleteAdminPermanently, unlockAdminAccount, getSuperAdmins, getAdminById};
