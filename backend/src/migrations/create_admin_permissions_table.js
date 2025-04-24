const pool = require("../config/db");

/**
 * Create admin_permissions table to store permissions for admins
 */
async function createAdminPermissionsTable() {
  const client = await pool.connect();
  
  try {
    console.log('Creating admin_permissions table...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_permissions (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER NOT NULL,
        module VARCHAR(50) NOT NULL,
        can_view BOOLEAN DEFAULT FALSE,
        can_create BOOLEAN DEFAULT FALSE,
        can_edit BOOLEAN DEFAULT FALSE,
        can_delete BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(admin_id, module),
        CONSTRAINT fk_admin
          FOREIGN KEY(admin_id) 
          REFERENCES users(id)
          ON DELETE CASCADE
      );
    `);
    
    console.log('admin_permissions table created successfully.');
  } catch (error) {
    console.error('Error creating admin_permissions table:', error);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { createAdminPermissionsTable }; 