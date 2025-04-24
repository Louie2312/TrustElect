const pool = require('../config/db');

async function updateSuperAdminEmail() {
  const client = await pool.connect();
  
  try {
    console.log('Starting superadmin email update...');
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Check if the old superadmin email exists
    const checkResult = await client.query(
      "SELECT id FROM users WHERE email = $1 AND role_id = 1",
      ['superadmin.00000@novaliches.sti.edu.ph']
    );
    
    if (checkResult.rows.length > 0) {
      console.log('Found superadmin with old email address. Updating...');
      
      // Update the email in users table
      const updateResult = await client.query(
        "UPDATE users SET email = $1, username = $1 WHERE email = $2 AND role_id = 1 RETURNING id",
        ['systemadmin.00000@novaliches.sti.edu.ph', 'superadmin.00000@novaliches.sti.edu.ph']
      );
      
      console.log(`Updated ${updateResult.rowCount} superadmin record(s)`);
      
      // Check if there's a corresponding entry in the admins table
      const adminCheckResult = await client.query(
        "SELECT id FROM admins WHERE email = $1",
        ['superadmin.00000@novaliches.sti.edu.ph']
      );
      
      if (adminCheckResult.rows.length > 0) {
        console.log('Updating email in admins table...');
        
        // Update the email in admins table
        const adminUpdateResult = await client.query(
          "UPDATE admins SET email = $1 WHERE email = $2 RETURNING id",
          ['systemadmin.00000@novaliches.sti.edu.ph', 'superadmin.00000@novaliches.sti.edu.ph']
        );
        
        console.log(`Updated ${adminUpdateResult.rowCount} admin record(s)`);
      }
      
      // Commit transaction
      await client.query('COMMIT');
      console.log('Successfully updated superadmin email to systemadmin.00000@novaliches.sti.edu.ph');
    } else {
      console.log('No superadmin with the old email address found. No updates needed.');
      await client.query('COMMIT');
    }
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating superadmin email:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Execute the function if this script is run directly
if (require.main === module) {
  updateSuperAdminEmail()
    .then(() => {
      console.log('Update script completed.');
      process.exit(0);
    })
    .catch(err => {
      console.error('Update script failed:', err);
      process.exit(1);
    });
}

module.exports = { updateSuperAdminEmail }; 