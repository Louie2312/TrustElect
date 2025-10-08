const pool = require('./src/config/db');
const { validateStudentVotingIP, getStudentLaboratoryAssignment } = require('./src/models/laboratoryPrecinctModel');

async function testIPValidationSystem() {
  try {
    console.log('🧪 Testing IP Validation System...\n');

    // Test 1: Check if tables exist
    console.log('1. Checking database tables...');
    
    const ipTable = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'laboratory_ip_addresses'
      )
    `);
    console.log(`   - laboratory_ip_addresses table: ${ipTable.rows[0].exists ? '✅ EXISTS' : '❌ MISSING'}`);

    const elpTable = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'election_laboratory_precincts'
      )
    `);
    console.log(`   - election_laboratory_precincts table: ${elpTable.rows[0].exists ? '✅ EXISTS' : '❌ MISSING'}`);

    const func = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.routines 
        WHERE routine_schema = 'public' 
        AND routine_name = 'validate_student_voting_ip'
      )
    `);
    console.log(`   - validate_student_voting_ip function: ${func.rows[0].exists ? '✅ EXISTS' : '❌ MISSING'}\n`);

    // Test 2: Check if eligible_voters has the required column
    console.log('2. Checking eligible_voters table structure...');
    const columnCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'eligible_voters' 
        AND column_name = 'election_laboratory_precinct_id'
      )
    `);
    console.log(`   - election_laboratory_precinct_id column: ${columnCheck.rows[0].exists ? '✅ EXISTS' : '❌ MISSING'}\n`);

    // Test 3: Check for existing data
    console.log('3. Checking existing data...');
    
    const precincts = await pool.query('SELECT COUNT(*) as count FROM precincts');
    console.log(`   - Total precincts: ${precincts.rows[0].count}`);

    const elections = await pool.query('SELECT COUNT(*) as count FROM elections');
    console.log(`   - Total elections: ${elections.rows[0].count}`);

    const eligibleVoters = await pool.query('SELECT COUNT(*) as count FROM eligible_voters');
    console.log(`   - Total eligible voters: ${eligibleVoters.rows[0].count}\n`);

    // Test 4: Test the validation function with sample data
    console.log('4. Testing validation function...');
    
    try {
      // This will test the function exists and can be called
      const testResult = await pool.query('SELECT public.validate_student_voting_ip($1, $2, $3) as is_valid', [1, 1, '127.0.0.1']);
      console.log(`   - Function call test: ✅ SUCCESS (returned: ${testResult.rows[0].is_valid})`);
    } catch (error) {
      console.log(`   - Function call test: ❌ FAILED (${error.message})`);
    }

    console.log('\n🎉 IP Validation System Test Complete!');
    console.log('\n📋 Next Steps:');
    console.log('1. Create laboratory precincts in the admin panel');
    console.log('2. Add IP addresses to each laboratory precinct');
    console.log('3. Assign students to laboratory precincts for elections');
    console.log('4. Test voting from different IP addresses');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await pool.end();
  }
}

testIPValidationSystem();
