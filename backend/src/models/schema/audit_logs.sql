CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    user_email VARCHAR(255),
    user_role VARCHAR(20) NOT NULL,
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INTEGER,
    details JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster searches
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON audit_logs(entity_id);

COMMENT ON TABLE audit_logs IS 'Tracks all user activities in the system';
COMMENT ON COLUMN audit_logs.user_id IS 'Reference to users table';
COMMENT ON COLUMN audit_logs.user_email IS 'Email of the user for easier reference';
COMMENT ON COLUMN audit_logs.user_role IS 'Role of the user at the time of the action';
COMMENT ON COLUMN audit_logs.action IS 'The action performed (create, update, delete, login, etc.)';
COMMENT ON COLUMN audit_logs.entity_type IS 'Type of entity affected (admin, student, election, ballot, etc.)';
COMMENT ON COLUMN audit_logs.entity_id IS 'ID of the affected entity';
COMMENT ON COLUMN audit_logs.details IS 'JSON containing additional details about the action';
COMMENT ON COLUMN audit_logs.ip_address IS 'IP address from which the action was performed';
COMMENT ON COLUMN audit_logs.user_agent IS 'Browser/client information'; 