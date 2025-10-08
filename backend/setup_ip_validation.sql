-- Create laboratory IP addresses table
CREATE TABLE IF NOT EXISTS public.laboratory_ip_addresses (
    id SERIAL PRIMARY KEY,
    laboratory_precinct_id INTEGER NOT NULL REFERENCES public.precincts(id) ON DELETE CASCADE,
    ip_address VARCHAR(45),
    ip_type VARCHAR(20) NOT NULL CHECK (ip_type IN ('single', 'range', 'subnet')),
    ip_range_start VARCHAR(45),
    ip_range_end VARCHAR(45),
    subnet_mask VARCHAR(45),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create election laboratory precincts table
CREATE TABLE IF NOT EXISTS public.election_laboratory_precincts (
    id SERIAL PRIMARY KEY,
    election_id INTEGER NOT NULL REFERENCES public.elections(id) ON DELETE CASCADE,
    laboratory_precinct_id INTEGER NOT NULL REFERENCES public.precincts(id) ON DELETE CASCADE,
    assigned_courses TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(election_id, laboratory_precinct_id)
);

-- Add election_laboratory_precinct_id column to eligible_voters if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'eligible_voters' 
        AND column_name = 'election_laboratory_precinct_id'
    ) THEN
        ALTER TABLE public.eligible_voters 
        ADD COLUMN election_laboratory_precinct_id INTEGER REFERENCES public.election_laboratory_precincts(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create IP validation function (updated to work with existing election_precinct_programs table)
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
BEGIN
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
    AND epp.programs @> ARRAY[student_course]
    LIMIT 1;
    
    -- If no precinct assignment found, allow voting (backward compatibility)
    IF precinct_name IS NULL THEN
        RAISE NOTICE 'No precinct assignment found for student % in election %', p_student_id, p_election_id;
        RETURN TRUE;
    END IF;
    
    RAISE NOTICE 'Student % assigned to precinct: %', p_student_id, precinct_name;
    
    -- Get the precinct ID
    SELECT id INTO precinct_id
    FROM precincts 
    WHERE name = precinct_name;
    
    -- If precinct not found, deny access
    IF precinct_id IS NULL THEN
        RAISE NOTICE 'Precinct % not found in precincts table', precinct_name;
        RETURN FALSE;
    END IF;
    
    RAISE NOTICE 'Precinct % has ID: %', precinct_name, precinct_id;
    
    -- Check if client IP matches any active IP for the assigned precinct
    FOR ip_record IN
        SELECT ip_type, ip_address, ip_range_start, ip_range_end, subnet_mask
        FROM laboratory_ip_addresses
        WHERE laboratory_precinct_id = precinct_id 
        AND is_active = TRUE
    LOOP
        RAISE NOTICE 'Checking IP: % against record: type=%, address=%, range_start=%, range_end=%, subnet=%', 
            p_client_ip, ip_record.ip_type, ip_record.ip_address, ip_record.ip_range_start, ip_record.ip_range_end, ip_record.subnet_mask;
            
        CASE ip_record.ip_type
            WHEN 'single' THEN
                IF ip_record.ip_address = p_client_ip THEN
                    RAISE NOTICE 'IP % matches single address %', p_client_ip, ip_record.ip_address;
                    RETURN TRUE;
                END IF;
            WHEN 'range' THEN
                -- Check if IP is within range (simplified - you may need more sophisticated range checking)
                IF p_client_ip >= ip_record.ip_range_start AND p_client_ip <= ip_record.ip_range_end THEN
                    RAISE NOTICE 'IP % is within range % to %', p_client_ip, ip_record.ip_range_start, ip_record.ip_range_end;
                    RETURN TRUE;
                END IF;
            WHEN 'subnet' THEN
                -- Check if IP is within subnet (simplified - you may need proper subnet calculation)
                IF p_client_ip LIKE ip_record.subnet_mask THEN
                    RAISE NOTICE 'IP % matches subnet pattern %', p_client_ip, ip_record.subnet_mask;
                    RETURN TRUE;
                END IF;
        END CASE;
    END LOOP;
    
    -- No matching IP found
    RAISE NOTICE 'No matching IP found for % in precinct %', p_client_ip, precinct_name;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_laboratory_ip_addresses_precinct ON public.laboratory_ip_addresses(laboratory_precinct_id);
CREATE INDEX IF NOT EXISTS idx_laboratory_ip_addresses_active ON public.laboratory_ip_addresses(is_active);
CREATE INDEX IF NOT EXISTS idx_election_laboratory_precincts_election ON public.election_laboratory_precincts(election_id);
CREATE INDEX IF NOT EXISTS idx_eligible_voters_lab_precinct ON public.eligible_voters(election_laboratory_precinct_id);
