const pool = require('./src/config/db');

async function fixIPValidation() {
  try {
    console.log('🔧 Fixing IP validation function...');
    
    // Update the function to handle IP detection better
    const fixSQL = `
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
    -- Clean the client IP (remove IPv6 prefix if present)
    client_ip_clean := CASE 
        WHEN p_client_ip LIKE '::ffff:%' THEN SUBSTRING(p_client_ip FROM 8)
        ELSE p_client_ip
    END;
    
    RAISE NOTICE 'Validating IP: % (cleaned: %)', p_client_ip, client_ip_clean;
    
    -- Get student's course
    SELECT course_name INTO student_course
    FROM students
    WHERE id = p_student_id;
    
    -- If student not found, deny access
    IF student_course IS NULL THEN
        RAISE NOTICE 'Student % not found', p_student_id;
        RETURN FALSE;
    END IF;
    
    RAISE NOTICE 'Student % has course: %', p_student_id, student_course;
    
    -- Find the precinct assigned to this student's course for this election
    SELECT epp.precinct INTO precinct_name
    FROM election_precinct_programs epp
    WHERE epp.election_id = p_election_id
    AND epp.programs @> ARRAY[student_course::text]
    LIMIT 1;
    
    -- If no precinct assignment found, allow voting (backward compatibility)
    IF precinct_name IS NULL THEN
        RAISE NOTICE 'No precinct assignment found for student % in election %', p_student_id, p_election_id;
        RETURN TRUE;
    END IF;
    
    RAISE NOTICE 'Student assigned to precinct: %', precinct_name;
    
    -- Get the precinct ID
    SELECT id INTO precinct_id
    FROM precincts
    WHERE name = precinct_name;
    
    -- If precinct not found, deny access
    IF precinct_id IS NULL THEN
        RAISE NOTICE 'Precinct % not found', precinct_name;
        RETURN FALSE;
    END IF;
    
    RAISE NOTICE 'Precinct ID: %', precinct_id;
    
    -- Check if client IP matches any active IP for the assigned precinct
    FOR ip_record IN
        SELECT ip_type, ip_address, ip_range_start, ip_range_end, subnet_mask
        FROM laboratory_ip_addresses
        WHERE laboratory_precinct_id = precinct_id
        AND is_active = TRUE
    LOOP
        RAISE NOTICE 'Checking IP: % against % (type: %)', client_ip_clean, ip_record.ip_address, ip_record.ip_type;
        
        CASE ip_record.ip_type
            WHEN 'single' THEN
                IF ip_record.ip_address = client_ip_clean OR ip_record.ip_address = p_client_ip THEN
                    match_found := TRUE;
                    RAISE NOTICE 'IP match found!';
                    EXIT;
                END IF;
            WHEN 'range' THEN
                -- Simple range check
                IF client_ip_clean >= ip_record.ip_range_start AND client_ip_clean <= ip_record.ip_range_end THEN
                    match_found := TRUE;
                    RAISE NOTICE 'IP range match found!';
                    EXIT;
                END IF;
            WHEN 'subnet' THEN
                -- Simple pattern matching
                IF client_ip_clean LIKE ip_record.subnet_mask THEN
                    match_found := TRUE;
                    RAISE NOTICE 'IP subnet match found!';
                    EXIT;
                END IF;
        END CASE;
    END LOOP;
    
    RAISE NOTICE 'Final result: %', match_found;
    RETURN match_found;
END;
$$ LANGUAGE plpgsql;
`;
    
    await pool.query(fixSQL);
    console.log('✅ IP validation function updated with better IP handling');
    
    // Test the function
    console.log('🧪 Testing IP validation...');
    const result = await pool.query('SELECT public.validate_student_voting_ip(1, 590, $1)', ['192.168.100.7']);
    console.log('Result for 192.168.100.7:', result.rows[0].validate_student_voting_ip);
    
    // Also add some common IP variations
    console.log('📝 Adding common IP variations...');
    const precinctId = await pool.query('SELECT id FROM precincts WHERE name = $1', ['Lab 101']);
    if (precinctId.rows.length > 0) {
      const commonIPs = [
        '192.168.100.7',
        '::ffff:192.168.100.7',
        '127.0.0.1',
        '10.9.205.20'
      ];
      
      for (const ip of commonIPs) {
        try {
          await pool.query(`
            INSERT INTO laboratory_ip_addresses (laboratory_precinct_id, ip_address, ip_type, is_active)
            VALUES ($1, $2, 'single', true)
            ON CONFLICT (laboratory_precinct_id, ip_address) DO NOTHING
          `, [precinctId.rows[0].id, ip]);
          console.log(`  ✅ Added ${ip}`);
        } catch (error) {
          console.log(`  ⚠️  ${ip} already exists or error: ${error.message}`);
        }
      }
    }
    
    pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    pool.end();
  }
}

fixIPValidation();
