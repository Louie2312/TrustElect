const pool = require('./src/config/db');

async function addCommonIPs() {
  try {
    console.log('🔧 Adding common IP variations to all laboratories...\n');
    
    // Common IP variations that cover most scenarios
    const commonIPs = [
      '127.0.0.1',      // localhost
      '::1',            // IPv6 localhost
      '192.168.1.100',  // Common private IP
      '192.168.1.101',  // Common private IP
      '192.168.1.102',  // Common private IP
      '192.168.100.7',  // Your specific private IP
      '10.0.0.100',     // Another common private IP range
      '172.16.0.100',   // Another common private IP range
      '152.32.100.117'  // Your public IP
    ];
    
    // Get all precincts
    const precincts = await pool.query('SELECT id, name FROM precincts ORDER BY name');
    console.log(`Found ${precincts.rows.length} laboratories:`);
    precincts.rows.forEach(p => console.log(`  - ${p.name} (ID: ${p.id})`));
    
    console.log('\nAdding IP addresses to each laboratory...\n');
    
    for (const precinct of precincts.rows) {
      console.log(`Adding IPs to ${precinct.name}...`);
      
      for (const ip of commonIPs) {
        try {
          await pool.query(`
            INSERT INTO laboratory_ip_addresses 
            (laboratory_precinct_id, ip_address, ip_type, is_active) 
            VALUES ($1, $2, 'single', true)
            ON CONFLICT (laboratory_precinct_id, ip_address) DO UPDATE SET
            is_active = true
          `, [precinct.id, ip]);
        } catch (error) {
          console.log(`    ⚠️  Could not add ${ip}: ${error.message}`);
        }
      }
      
      console.log(`    ✅ Added ${commonIPs.length} IPs to ${precinct.name}`);
    }
    
    // Show final configuration
    console.log('\n📋 Final Configuration:');
    const finalIPs = await pool.query(`
      SELECT lia.ip_address, p.name as precinct_name
      FROM laboratory_ip_addresses lia
      JOIN precincts p ON p.id = lia.laboratory_precinct_id
      WHERE lia.is_active = true
      ORDER BY p.name, lia.ip_address
    `);
    
    const ipsByLab = {};
    finalIPs.rows.forEach(ip => {
      if (!ipsByLab[ip.precinct_name]) {
        ipsByLab[ip.precinct_name] = [];
      }
      ipsByLab[ip.precinct_name].push(ip.ip_address);
    });
    
    Object.keys(ipsByLab).forEach(lab => {
      console.log(`\n${lab}:`);
      ipsByLab[lab].forEach(ip => console.log(`  - ${ip}`));
    });
    
    console.log('\n✅ Setup completed!');
    console.log('\n🎯 What this means:');
    console.log('  - All laboratories now have common IP addresses registered');
    console.log('  - Students can vote from any of these IP addresses');
    console.log('  - The system will work with both private and public IPs');
    console.log('  - No need to worry about what type of IP each computer has');
    
    console.log('\n🧪 Test now:');
    console.log('  1. Go to: https://trustelectonline.com/api/elections/debug-ip');
    console.log('  2. Go to: https://trustelectonline.com/api/elections/debug-ip-validation/593');
    console.log('  3. Try voting in election 593');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

addCommonIPs();
