-- Create IP validation function for laboratory precincts
CREATE OR REPLACE FUNCTION public.validate_student_voting_ip(
    p_student_id INTEGER,
    p_election_id INTEGER,
    p_client_ip VARCHAR(45)
) RETURNS BOOLEAN AS $$
DECLARE
    lab_precinct_id INTEGER;
    ip_record RECORD;
BEGIN
    -- Get student's assigned laboratory precinct for this election
    SELECT elp.laboratory_precinct_id
    INTO lab_precinct_id
    FROM eligible_voters ev
    JOIN election_laboratory_precincts elp ON ev.election_laboratory_precinct_id = elp.id
    WHERE ev.student_id = p_student_id AND ev.election_id = p_election_id;
    
    -- If no laboratory assignment, allow voting (backward compatibility)
    IF lab_precinct_id IS NULL THEN
        RETURN TRUE;
    END IF;
    
    -- Check if client IP matches any active IP for the assigned laboratory
    FOR ip_record IN
        SELECT ip_type, ip_address, ip_range_start, ip_range_end, subnet_mask
        FROM laboratory_ip_addresses
        WHERE laboratory_precinct_id = lab_precinct_id 
        AND is_active = TRUE
    LOOP
        CASE ip_record.ip_type
            WHEN 'single' THEN
                IF ip_record.ip_address = p_client_ip THEN
                    RETURN TRUE;
                END IF;
            WHEN 'range' THEN
                -- Check if IP is within range (simplified - you may need more sophisticated range checking)
                IF p_client_ip >= ip_record.ip_range_start AND p_client_ip <= ip_record.ip_range_end THEN
                    RETURN TRUE;
                END IF;
            WHEN 'subnet' THEN
                -- Check if IP is within subnet (simplified - you may need proper subnet calculation)
                IF p_client_ip LIKE ip_record.subnet_mask THEN
                    RETURN TRUE;
                END IF;
        END CASE;
    END LOOP;
    
    -- No matching IP found
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;
