const pool = require('./src/config/db');

async function testMiddleware() {
  try {
    console.log('🧪 Testing IP validation middleware...\n');
    
    // 1. Check if middleware is being called
    console.log('1. Check if you see "🚨 [IP Validation] Middleware called!" in your server logs when accessing the ballot');
    
    // 2. Check database setup
    console.log('\n2. Checking database setup...');
    
    // Check tables
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'election_precinct_programs'
      ) as table_exists
    `);
    
    console.log(`   Tables exist: ${tableCheck.rows[0].table_exists ? '✅' : '❌'}`);
    
    if (!tableCheck.rows[0].table_exists) {
      console.log('   ❌ IP validation tables not found!');
      return;
    }
    
    // Check assignments
    const assignments = await pool.query('SELECT COUNT(*) as count FROM election_precinct_programs');
    console.log(`   Election assignments: ${assignments.rows[0].count}`);
    
    // Check IP addresses
    const ips = await pool.query('SELECT COUNT(*) as count FROM laboratory_ip_addresses WHERE is_active = true');
    console.log(`   Active IP addresses: ${ips.rows[0].count}`);
    
    // 3. Test with a real student and election
    console.log('\n3. Testing with real data...');
    
    const student = await pool.query('SELECT id, student_number, course_name FROM students LIMIT 1');
    if (student.rows.length === 0) {
      console.log('   ❌ No students found!');
      return;
    }
    
    const election = await pool.query('SELECT id, title FROM elections WHERE status = $1 LIMIT 1', ['active']);
    if (election.rows.length === 0) {
      console.log('   ❌ No active elections found!');
      return;
    }
    
    console.log(`   Student: ${student.rows[0].student_number} (${student.rows[0].course_name})`);
    console.log(`   Election: ${election.rows[0].title} (ID: ${election.rows[0].id})`);
    
    // Check if student is assigned
    const assignment = await pool.query(`
      SELECT epp.precinct, p.name as precinct_name
      FROM election_precinct_programs epp
      JOIN precincts p ON p.name = epp.precinct
      WHERE epp.election_id = $1
      AND epp.programs @> ARRAY[$2::text]
    `, [election.rows[0].id, student.rows[0].course_name]);
    
    if (assignment.rows.length === 0) {
      console.log('   ❌ Student not assigned to any precinct for this election!');
      console.log('   💡 You need to create election-precinct assignments.');
      return;
    }
    
    console.log(`   ✅ Student assigned to: ${assignment.rows[0].precinct_name}`);
    
    // Check IP addresses for the precinct
    const precinctId = await pool.query('SELECT id FROM precincts WHERE name = $1', [assignment.rows[0].precinct]);
    const precinctIPs = await pool.query(`
      SELECT ip_address FROM laboratory_ip_addresses 
      WHERE laboratory_precinct_id = $1 AND is_active = true
    `, [precinctId.rows[0].id]);
    
    console.log(`   Registered IPs: ${precinctIPs.rows.map(r => r.ip_address).join(', ')}`);
    
    // 4. Test the database function
    console.log('\n4. Testing database function...');
    
    const testIPs = ['127.0.0.1', '::1', '192.168.1.100', '192.168.1.200'];
    
    for (const testIP of testIPs) {
      try {
        const result = await pool.query(
          'SELECT public.validate_student_voting_ip($1, $2, $3) as is_valid',
          [student.rows[0].id, election.rows[0].id, testIP]
        );
        
        const isValid = result.rows[0].is_valid;
        const status = isValid ? '✅ ALLOWED' : '❌ BLOCKED';
        console.log(`   ${testIP}: ${status}`);
        
      } catch (error) {
        console.log(`   ${testIP}: ❌ ERROR - ${error.message}`);
      }
    }
    
    console.log('\n✅ Test completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Check your server logs when accessing the ballot');
    console.log('2. Look for "🚨 [IP Validation] Middleware called!" message');
    console.log('3. If you don\'t see it, the middleware is not being called');
    console.log('4. If you see it, check the detailed logs to see what\'s happening');
    
  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    await pool.end();
  }
}

testMiddleware();
