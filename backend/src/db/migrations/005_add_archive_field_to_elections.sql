-- Add is_archived column to elections table
ALTER TABLE elections ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;

-- Create index for faster querying of archived elections
CREATE INDEX IF NOT EXISTS idx_elections_archived ON elections(is_archived);

-- Add archived_at timestamp to elections table
ALTER TABLE elections ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP;

-- Comment to explain future implementation
COMMENT ON COLUMN elections.is_archived IS 'Indicates if the election has been archived';
COMMENT ON COLUMN elections.archived_at IS 'Timestamp when the election was archived'; 