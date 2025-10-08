-- Test IP validation function
SELECT 'Testing IP validation function...' as test;

-- Test with registered IP
SELECT '192.168.100.7' as test_ip, public.validate_student_voting_ip(1, 590, '192.168.100.7') as is_valid;

-- Test with unauthorized IP
SELECT '192.168.1.100' as test_ip, public.validate_student_voting_ip(1, 590, '192.168.1.100') as is_valid;

-- Check registered IPs for Lab 101
SELECT 'Registered IPs for Lab 101:' as info;
SELECT lia.ip_address, lia.ip_type, p.name as precinct_name
FROM laboratory_ip_addresses lia 
JOIN precincts p ON p.id = lia.laboratory_precinct_id 
WHERE p.name = 'Lab 101';

-- Check student assignment
SELECT 'Student assignment:' as info;
SELECT s.id, s.course_name, epp.precinct, epp.election_id
FROM students s 
JOIN election_precinct_programs epp ON epp.programs @> ARRAY[s.course_name::text] 
WHERE s.id = 1 AND epp.election_id = 590;
