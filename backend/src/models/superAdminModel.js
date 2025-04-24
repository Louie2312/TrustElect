const pool = require("../config/db");


const checkSuperAdminExists = async () => {
  try {
    const result = await pool.query("SELECT COUNT(*) FROM users WHERE role_id = 1");
    return parseInt(result.rows[0].count, 10) > 0;
  } catch (error) {
    console.error("Error checking Super Admin:", error);
    throw error;
  }
};

const createSuperAdmin = async (firstName, lastName, hashedPassword) => {
  if (await checkSuperAdminExists()) {
    throw new Error("A Super Admin already exists.");
  }

  const email = "systemadmin.00000@novaliches.sti.edu.ph";
  const username = email;

  const query = `
    INSERT INTO users (first_name, last_name, email, username, password_hash, role_id, is_email_verified)
    VALUES ($1, $2, $3, $4, $5, 1, TRUE) RETURNING *;
  `;
  const values = [firstName, lastName, email, username, hashedPassword];
  const result = await pool.query(query, values);
  return result.rows[0];
};


const getSuperAdminByEmail = async (email) => {
  const query = "SELECT * FROM users WHERE email = $1 AND role_id = 1";
  const result = await pool.query(query, [email]);
  return result.rows[0] || null;
};

const updateSuperAdmin = async (email, updates) => {
  try {
    if (updates.name) {
      const [firstName, lastName] = updates.name.split(" ");
      updates.first_name = firstName;
      updates.last_name = lastName;
      delete updates.name;
    }

    const fields = Object.keys(updates);
    const values = Object.values(updates);

    if (fields.length === 0) return null;

    const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(", ");
    const query = `UPDATE users SET ${setClause} WHERE email = $${fields.length + 1} AND role_id = 1 RETURNING *`;

    const { rows } = await pool.query(query, [...values, email]);
    return rows[0];
  } catch (error) {
    console.error("Error updating Super Admin:", error);
    throw error;
  }
};

module.exports = { checkSuperAdminExists, createSuperAdmin, getSuperAdminByEmail, updateSuperAdmin };
