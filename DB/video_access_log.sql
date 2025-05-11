-- Create a table to log video access for security and analytics
CREATE TABLE IF NOT EXISTS video_access_log (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    module_id INTEGER NOT NULL,
    ip_address VARCHAR(45), -- Support for IPv6 addresses
    access_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_agent TEXT,
    referrer TEXT,
    session_id TEXT
);

-- Add indexes for faster querying
CREATE INDEX IF NOT EXISTS idx_video_access_email ON video_access_log(email);
CREATE INDEX IF NOT EXISTS idx_video_access_module ON video_access_log(module_id);
CREATE INDEX IF NOT EXISTS idx_video_access_time ON video_access_log(access_time);

-- Add foreign key constraint if necessary
-- ALTER TABLE video_access_log 
--     ADD CONSTRAINT fk_video_access_module
--     FOREIGN KEY (module_id) REFERENCES modules(id);

-- Add comment for documentation
COMMENT ON TABLE video_access_log IS 'Records all attempts to access video content for security monitoring and analytics'; 