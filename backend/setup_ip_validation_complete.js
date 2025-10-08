const pool = require('./src/config/db');

async function setupIPValidationComplete() {
  try {
    console.log('🔧 Setting up complete IP validation system...\n');
    
    // 1. Update the IP validation function
    console.log('1. Updating IP validation function...');
    const updateFunction = `
CREATE OR REPLACE FUNCTION public.validate_student_voting_ip(
    p_student_id INTEGER,
    p_election_id INTEGER,
    p_client_ip VARCHAR(45)
) RETURNS BOOLEAN AS $$
DECLARE
    student_course TEXT;
    precinct_name TEXT;
    precinct_id INTEGER;
    ip_record RECORD;
    match_found BOOLEAN := FALSE;
    client_ip_clean TEXT;
BEGIN
    -- Clean the client IP (handle IPv6-mapped IPv4)
    client_ip_clean := CASE 
        WHEN p_client_ip LIKE '::ffff:%' THEN SUBSTRING(p_client_ip FROM 8)
        WHEN p_client_ip = '::1' THEN '127.0.0.1'
        ELSE p_client_ip
    END;
    
    -- Get student's course
    SELECT course_name INTO student_course
    FROM students
    WHERE id = p_student_id;
    
    -- If student not found, deny access
    IF student_course IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Find the precinct assigned to this student's course for this election
    SELECT epp.precinct INTO precinct_name
    FROM election_precinct_programs epp
    WHERE epp.election_id = p_election_id
    AND epp.programs @> ARRAY[student_course::text]
    LIMIT 1;
    
    -- If no precinct assignment found, deny access (strict mode)
    IF precinct_name IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Get the precinct ID
    SELECT id INTO precinct_id
    FROM precincts
    WHERE name = precinct_name;
    
    -- If precinct not found, deny access
    IF precinct_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check if client IP matches any active IP for the assigned precinct
    FOR ip_record IN
        SELECT ip_type, ip_address, ip_range_start, ip_range_end, subnet_mask
        FROM laboratory_ip_addresses
        WHERE laboratory_precinct_id = precinct_id
        AND is_active = TRUE
    LOOP
        CASE ip_record.ip_type
            WHEN 'single' THEN
                -- Check multiple IP formats
                IF ip_record.ip_address = client_ip_clean 
                   OR ip_record.ip_address = p_client_ip
                   OR (p_client_ip LIKE '::ffff:%' AND ip_record.ip_address = SUBSTRING(p_client_ip FROM 8))
                   OR (client_ip_clean LIKE '::ffff:%' AND ip_record.ip_address = SUBSTRING(client_ip_clean FROM 8)) THEN
                    match_found := TRUE;
                    EXIT;
                END IF;
            WHEN 'range' THEN
                IF client_ip_clean >= ip_record.ip_range_start AND client_ip_clean <= ip_record.ip_range_end THEN
                    match_found := TRUE;
                    EXIT;
                END IF;
            WHEN 'subnet' THEN
                IF client_ip_clean LIKE ip_record.subnet_mask THEN
                    match_found := TRUE;
                    EXIT;
                END IF;
        END CASE;
    END LOOP;
    
    RETURN match_found;
END;
$$ LANGUAGE plpgsql;
`;
    
    await pool.query(updateFunction);
    console.log('   ✅ Function updated');
    
    // 2. Ensure Lab 101 exists and get its ID
    console.log('\n2. Setting up Lab 101...');
    let lab101 = await pool.query('SELECT id FROM precincts WHERE name = $1', ['Lab 101']);
    if (lab101.rows.length === 0) {
      await pool.query('INSERT INTO precincts (name) VALUES ($1)', ['Lab 101']);
      lab101 = await pool.query('SELECT id FROM precincts WHERE name = $1', ['Lab 101']);
    }
    const lab101Id = lab101.rows[0].id;
    console.log(`   ✅ Lab 101 ID: ${lab101Id}`);
    
    // 3. Add your IP addresses to Lab 101
    console.log('\n3. Adding IP addresses to Lab 101...');
    const yourIPs = [
      '192.168.100.7',           // Your laptop IP
      '::ffff:192.168.100.7',    // IPv6-mapped version
      '127.0.0.1',               // Localhost
      '10.9.205.20'              // Lab IP
    ];
    
    for (const ip of yourIPs) {
      try {
        await pool.query(`
          INSERT INTO laboratory_ip_addresses (laboratory_precinct_id, ip_address, ip_type, is_active)
          VALUES ($1, $2, 'single', true)
          ON CONFLICT (laboratory_precinct_id, ip_address) DO NOTHING
        `, [lab101Id, ip]);
        console.log(`   ✅ Added ${ip}`);
      } catch (error) {
        console.log(`   ⚠️  ${ip} already exists`);
      }
    }
    
    // 4. Test the system
    console.log('\n4. Testing IP validation system...');
    
    // Test with your IP
    const testResult1 = await pool.query('SELECT public.validate_student_voting_ip(1, 590, $1)', ['192.168.100.7']);
    console.log(`   Your IP (192.168.100.7): ${testResult1.rows[0].validate_student_voting_ip ? '✅ VALID' : '❌ INVALID'}`);
    
    // Test with IPv6-mapped version
    const testResult2 = await pool.query('SELECT public.validate_student_voting_ip(1, 590, $1)', ['::ffff:192.168.100.7']);
    console.log(`   IPv6-mapped (::ffff:192.168.100.7): ${testResult2.rows[0].validate_student_voting_ip ? '✅ VALID' : '❌ INVALID'}`);
    
    // Test with unauthorized IP
    const testResult3 = await pool.query('SELECT public.validate_student_voting_ip(1, 590, $1)', ['192.168.1.100']);
    console.log(`   Unauthorized IP (192.168.1.100): ${testResult3.rows[0].validate_student_voting_ip ? '❌ SHOULD BE BLOCKED' : '✅ CORRECTLY BLOCKED'}`);
    
    // 5. Show all registered IPs
    console.log('\n5. Registered IPs for Lab 101:');
    const allIPs = await pool.query(`
      SELECT lia.ip_address, lia.ip_type, lia.is_active
      FROM laboratory_ip_addresses lia 
      WHERE lia.laboratory_precinct_id = $1
    `, [lab101Id]);
    
    allIPs.rows.forEach(row => {
      console.log(`   - ${row.ip_address} (${row.ip_type}) - ${row.is_active ? 'Active' : 'Inactive'}`);
    });
    
    console.log('\n🎯 IP validation system setup complete!');
    console.log('💡 Your IP 192.168.100.7 should now work for Lab 101');
    console.log('🔒 Unauthorized IPs will be blocked');
    
    pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    pool.end();
  }
}

setupIPValidationComplete();
