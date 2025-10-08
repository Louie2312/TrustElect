const pool = require('./src/config/db');

async function testIPFinal() {
  try {
    console.log('🧪 Testing IP Validation System...\n');
    
    // Test 1: Check registered IPs for Lab 101
    console.log('1. Checking registered IPs for Lab 101:');
    const registeredIPs = await pool.query(`
      SELECT lia.ip_address, lia.ip_type, p.name as precinct_name
      FROM laboratory_ip_addresses lia 
      JOIN precincts p ON p.id = lia.laboratory_precinct_id 
      WHERE p.name = 'Lab 101'
    `);
    
    if (registeredIPs.rows.length === 0) {
      console.log('❌ No IPs registered for Lab 101!');
    } else {
      console.log('✅ Registered IPs for Lab 101:');
      registeredIPs.rows.forEach(row => {
        console.log(`   - ${row.ip_address} (type: ${row.ip_type})`);
      });
    }
    
    // Test 2: Test IP validation function
    console.log('\n2. Testing IP validation function:');
    const testIPs = [
      '192.168.100.7',      // Your IP
      '::ffff:192.168.100.7', // IPv6-mapped version
      '127.0.0.1',          // Localhost
      '10.9.205.20',        // Lab IP
      '192.168.1.100'       // Unauthorized IP
    ];
    
    for (const testIP of testIPs) {
      try {
        const result = await pool.query('SELECT public.validate_student_voting_ip(1, 590, $1)', [testIP]);
        const isValid = result.rows[0].validate_student_voting_ip;
        console.log(`   ${testIP}: ${isValid ? '✅ VALID' : '❌ INVALID'}`);
      } catch (error) {
        console.log(`   ${testIP}: ❌ ERROR - ${error.message}`);
      }
    }
    
    console.log('\n🎯 Test completed!');
    console.log('💡 If your IP shows as VALID, try voting now!');
    
    pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    pool.end();
  }
}

testIPFinal();
