-- Add forwarding_email column to admins table
ALTER TABLE admins ADD COLUMN IF NOT EXISTS forwarding_email VARCHAR(255);

-- Add comment to explain the purpose
COMMENT ON COLUMN admins.forwarding_email IS 'Alternative email address for OTP and notification forwarding';

-- Update any existing admin records with null forwarding_email
UPDATE admins SET forwarding_email = NULL WHERE forwarding_email IS NULL; 