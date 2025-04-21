-- Drop the existing unique constraint on vote_token if it exists
ALTER TABLE votes DROP CONSTRAINT IF EXISTS votes_vote_token_key;

-- Add a composite unique constraint on election_id and student_id
ALTER TABLE votes ADD CONSTRAINT votes_election_student_unique UNIQUE (election_id, student_id);

-- Add an index on vote_token for faster lookups
CREATE INDEX IF NOT EXISTS idx_votes_vote_token ON votes(vote_token); 