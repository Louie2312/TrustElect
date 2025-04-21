-- Create tables for landing page content management

-- Create landing content table for storing flexible content sections
CREATE TABLE IF NOT EXISTS landing_content (
    id SERIAL PRIMARY KEY,
    section_key VARCHAR(50) NOT NULL, -- 'hero', 'features', 'callToAction'
    content_data JSONB NOT NULL, -- Flexible JSON content structure
    section_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create media table for uploaded files
CREATE TABLE IF NOT EXISTS media (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL, 
    file_type VARCHAR(50) NOT NULL, -- 'image', 'video'
    mime_type VARCHAR(100) NOT NULL,
    file_size INTEGER NOT NULL,
    path VARCHAR(255) NOT NULL, -- Storage path
    url VARCHAR(255) NOT NULL, -- Public URL
    alt_text VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create theme table for site styling
CREATE TABLE IF NOT EXISTS themes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    colors JSONB NOT NULL, -- Color palette as JSON
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_landing_content_section ON landing_content(section_key);
CREATE INDEX IF NOT EXISTS idx_media_file_type ON media(file_type);
CREATE INDEX IF NOT EXISTS idx_themes_active ON themes(is_active);

-- Insert default landing content
INSERT INTO landing_content (section_key, content_data, section_order) 
VALUES 
('hero', '{"title": "Secure Digital Voting Platform", "subtitle": "Empower your educational institution with reliable election technology", "videoUrl": null, "posterImage": null}', 1),
('features', '{"columns": [{"title": "Easy Setup", "description": "Simple election configuration process", "imageUrl": null}, {"title": "Secure Voting", "description": "End-to-end encrypted ballot submission", "imageUrl": null}, {"title": "Real-time Results", "description": "Instant counting and visualization", "imageUrl": null}]}', 2),
('callToAction', '{"title": "Ready to modernize your election process?", "subtitle": "Join thousands of educational institutions using TrustElect", "buttonText": "Contact Us", "enabled": true}', 3)
ON CONFLICT DO NOTHING;

-- Insert default theme
INSERT INTO themes (name, is_active, colors) 
VALUES 
('Default', TRUE, '{"primary": "#3B82F6", "secondary": "#1E40AF", "accent": "#DBEAFE", "background": "#FFFFFF", "text": "#111827"}')
ON CONFLICT DO NOTHING; 