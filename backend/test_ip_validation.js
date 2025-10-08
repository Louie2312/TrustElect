const pool = require('./src/config/db');

async function testIPValidation() {
  try {
    console.log('🧪 Testing IP Validation System...\n');
    
    // Test 1: Check if function exists
    console.log('1. Testing function existence...');
    const functionExists = await pool.query(`
      SELECT EXISTS(
        SELECT 1 FROM pg_proc 
        WHERE proname = 'validate_student_voting_ip'
      ) as exists
    `);
    console.log('✅ Function exists:', functionExists.rows[0].exists);
    
    // Test 2: Test with a sample student and election
    console.log('\n2. Testing with sample data...');
    
    // Get a sample student
    const student = await pool.query('SELECT id, course_name FROM students LIMIT 1');
    if (student.rows.length === 0) {
      console.log('❌ No students found in database');
      return;
    }
    const studentId = student.rows[0].id;
    const studentCourse = student.rows[0].course_name;
    console.log(`   Student: ID ${studentId}, Course: ${studentCourse}`);
    
    // Get a sample election
    const election = await pool.query('SELECT id FROM elections LIMIT 1');
    if (election.rows.length === 0) {
      console.log('❌ No elections found in database');
      return;
    }
    const electionId = election.rows[0].id;
    console.log(`   Election: ID ${electionId}`);
    
    // Test 3: Check student's precinct assignment
    console.log('\n3. Checking student precinct assignment...');
    const assignment = await pool.query(`
      SELECT 
        p.id as laboratory_precinct_id,
        p.name as laboratory_name,
        epp.programs as assigned_courses
      FROM students s
      JOIN election_precinct_programs epp ON epp.programs @> ARRAY[s.course_name]
      JOIN precincts p ON p.name = epp.precinct
      WHERE s.id = $1 AND epp.election_id = $2
      LIMIT 1
    `, [studentId, electionId]);
    
    if (assignment.rows.length === 0) {
      console.log('⚠️  No precinct assignment found for this student/election');
      console.log('   This means IP validation will be bypassed (backward compatibility)');
    } else {
      console.log(`✅ Student assigned to: ${assignment.rows[0].laboratory_name}`);
      
      // Test 4: Check IP addresses for this precinct
      console.log('\n4. Checking IP addresses for assigned precinct...');
      const ipAddresses = await pool.query(`
        SELECT ip_address, ip_type, is_active
        FROM laboratory_ip_addresses
        WHERE laboratory_precinct_id = $1 AND is_active = true
      `, [assignment.rows[0].laboratory_precinct_id]);
      
      if (ipAddresses.rows.length === 0) {
        console.log('⚠️  No IP addresses registered for this precinct');
      } else {
        console.log('✅ Registered IP addresses:');
        ipAddresses.rows.forEach(ip => {
          console.log(`   - ${ip.ip_address} (${ip.ip_type})`);
        });
      }
    }
    
    // Test 5: Test IP validation function
    console.log('\n5. Testing IP validation function...');
    const testIPs = ['127.0.0.1', '192.168.1.100', '10.0.0.1'];
    
    for (const testIP of testIPs) {
      try {
        const result = await pool.query(
          'SELECT public.validate_student_voting_ip($1, $2, $3) as is_valid',
          [studentId, electionId, testIP]
        );
        console.log(`   IP ${testIP}: ${result.rows[0].is_valid ? '✅ ALLOWED' : '❌ BLOCKED'}`);
      } catch (error) {
        console.log(`   IP ${testIP}: ❌ ERROR - ${error.message}`);
      }
    }
    
    console.log('\n🎯 Test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    pool.end();
  }
}

testIPValidation();
