-- Database Performance Optimization Script
-- Run this script in your PostgreSQL database to improve query performance

-- Indexes for elections table
CREATE INDEX IF NOT EXISTS idx_elections_status 
ON elections (status) 
WHERE needs_approval = FALSE OR needs_approval IS NULL;

CREATE INDEX IF NOT EXISTS idx_elections_created_by 
ON elections (created_by);

CREATE INDEX IF NOT EXISTS idx_elections_date_from 
ON elections (date_from DESC);

CREATE INDEX IF NOT EXISTS idx_elections_status_approval_created_by 
ON elections (status, needs_approval, created_by);

CREATE INDEX IF NOT EXISTS idx_elections_date_status 
ON elections (date_from, status);

-- Indexes for votes table
CREATE INDEX IF NOT EXISTS idx_votes_election_id 
ON votes (election_id);

CREATE INDEX IF NOT EXISTS idx_votes_student_id 
ON votes (student_id);

CREATE INDEX IF NOT EXISTS idx_votes_election_student 
ON votes (election_id, student_id);

CREATE INDEX IF NOT EXISTS idx_votes_candidate_id 
ON votes (candidate_id);

CREATE INDEX IF NOT EXISTS idx_votes_position_id 
ON votes (position_id);

CREATE INDEX IF NOT EXISTS idx_votes_created_at 
ON votes (created_at DESC);

-- Indexes for eligible_voters table
CREATE INDEX IF NOT EXISTS idx_eligible_voters_election_id 
ON eligible_voters (election_id);

CREATE INDEX IF NOT EXISTS idx_eligible_voters_student_id 
ON eligible_voters (student_id);

CREATE INDEX IF NOT EXISTS idx_eligible_voters_has_voted 
ON eligible_voters (has_voted) 
WHERE has_voted = TRUE;

CREATE INDEX IF NOT EXISTS idx_eligible_voters_election_has_voted 
ON eligible_voters (election_id, has_voted);

-- Indexes for ballots table
CREATE INDEX IF NOT EXISTS idx_ballots_election_id 
ON ballots (election_id);

-- Indexes for positions table
CREATE INDEX IF NOT EXISTS idx_positions_ballot_id 
ON positions (ballot_id);

-- Indexes for candidates table
CREATE INDEX IF NOT EXISTS idx_candidates_position_id 
ON candidates (position_id);

CREATE INDEX IF NOT EXISTS idx_candidates_partylist_id 
ON candidates (partylist_id);

-- Indexes for partylists table
CREATE INDEX IF NOT EXISTS idx_partylists_election_id 
ON partylists (election_id);

-- Composite indexes for complex queries
CREATE INDEX IF NOT EXISTS idx_votes_election_position_candidate 
ON votes (election_id, position_id, candidate_id);

CREATE INDEX IF NOT EXISTS idx_votes_election_student_position 
ON votes (election_id, student_id, position_id);

-- Analyze tables to update statistics
ANALYZE elections;
ANALYZE votes;
ANALYZE eligible_voters;
ANALYZE ballots;
ANALYZE positions;
ANALYZE candidates;
ANALYZE partylists;

-- Show index usage statistics (optional)
-- SELECT schemaname, tablename, indexname, idx_tup_read, idx_tup_fetch 
-- FROM pg_stat_user_indexes 
-- ORDER BY idx_tup_read DESC;
