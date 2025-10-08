const pool = require('./src/config/db');

async function testIPValidation() {
  try {
    console.log('🔍 Testing IP Validation System...\n');
    
    // Test 1: Check if tables exist
    console.log('1. Checking table existence...');
    const tables = ['laboratory_precincts', 'election_laboratory_precincts', 'laboratory_ip_addresses', 'eligible_voters'];
    
    for (const table of tables) {
      try {
        const result = await pool.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`   ✅ ${table}: ${result.rows[0].count} records`);
      } catch (error) {
        console.log(`   ❌ ${table}: ${error.message}`);
      }
    }
    
    // Test 2: Check if function exists
    console.log('\n2. Checking function existence...');
    try {
      const result = await pool.query(`
        SELECT routine_name, routine_type 
        FROM information_schema.routines 
        WHERE routine_name = 'validate_student_voting_ip'
      `);
      console.log(`   ✅ Function exists: ${result.rows.length > 0 ? 'Yes' : 'No'}`);
      if (result.rows.length > 0) {
        console.log(`   📋 Function type: ${result.rows[0].routine_type}`);
      }
    } catch (error) {
      console.log(`   ❌ Function check failed: ${error.message}`);
    }
    
    // Test 3: Test with sample data
    console.log('\n3. Testing with sample data...');
    const testStudentId = 1; // Replace with actual student ID
    const testElectionId = 589; // Replace with actual election ID
    const testIP = '192.168.1.100'; // Replace with actual IP
    
    try {
      const result = await pool.query(`
        SELECT public.validate_student_voting_ip($1, $2, $3::INET) as is_valid
      `, [testStudentId, testElectionId, testIP]);
      console.log(`   ✅ Function executed successfully: ${result.rows[0].is_valid}`);
    } catch (error) {
      console.log(`   ❌ Function execution failed: ${error.message}`);
    }
    
    // Test 4: Check student assignment
    console.log('\n4. Checking student assignment...');
    try {
      const result = await pool.query(`
        SELECT 
          lp.id as laboratory_precinct_id,
          lp.name as laboratory_name,
          elp.assigned_courses
        FROM students s
        JOIN eligible_voters ev ON ev.student_id = s.id
        JOIN election_laboratory_precincts elp ON ev.election_laboratory_precinct_id = elp.id
        JOIN laboratory_precincts lp ON elp.laboratory_precinct_id = lp.id
        WHERE s.id = $1 AND ev.election_id = $2
        LIMIT 1
      `, [testStudentId, testElectionId]);
      
      if (result.rows.length > 0) {
        console.log(`   ✅ Student assignment found:`, result.rows[0]);
      } else {
        console.log(`   ⚠️  No student assignment found for student ${testStudentId} in election ${testElectionId}`);
      }
    } catch (error) {
      console.log(`   ❌ Student assignment check failed: ${error.message}`);
    }
    
    // Test 5: Check IP addresses for laboratory
    console.log('\n5. Checking IP addresses...');
    try {
      const result = await pool.query(`
        SELECT lia.*, lp.name as laboratory_name
        FROM laboratory_ip_addresses lia
        JOIN laboratory_precincts lp ON lia.laboratory_precinct_id = lp.id
        WHERE lia.is_active = TRUE
        ORDER BY lp.name, lia.ip_address
      `);
      
      console.log(`   📋 Found ${result.rows.length} active IP addresses:`);
      result.rows.forEach(row => {
        console.log(`      - ${row.laboratory_name}: ${row.ip_address} (${row.ip_type})`);
      });
    } catch (error) {
      console.log(`   ❌ IP addresses check failed: ${error.message}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await pool.end();
  }
}

testIPValidation();