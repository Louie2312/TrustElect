-- Add purpose column to otps table to track the OTP's intended use
ALTER TABLE otps ADD COLUMN IF NOT EXISTS purpose VARCHAR(20) DEFAULT 'login';

-- Add comment to explain the purpose column
COMMENT ON COLUMN otps.purpose IS 'Purpose of the OTP - login, reset, etc.';

-- Update existing records to have the default purpose
UPDATE otps SET purpose = 'login' WHERE purpose IS NULL; 