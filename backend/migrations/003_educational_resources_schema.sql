-- Migration 003: Educational Resources and PDF Management
CREATE TABLE IF NOT EXISTS educational_resources (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_url TEXT NOT NULL,
    preview_url TEXT,
    download_url TEXT,
    file_type VARCHAR(32) DEFAULT 'pdf',
    file_size_label VARCHAR(64),
    category VARCHAR(100) DEFAULT 'مذكرات شرح',
    unit_id VARCHAR(64) REFERENCES units(id) ON DELETE SET NULL,
    lesson_id VARCHAR(64) REFERENCES lessons(id) ON DELETE SET NULL,
    is_active INTEGER DEFAULT 1,
    status VARCHAR(32) DEFAULT 'active',
    display_order INTEGER DEFAULT 0,
    views_count INTEGER DEFAULT 0,
    downloads_count INTEGER DEFAULT 0,
    created_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    created_by_name VARCHAR(255),
    created_at VARCHAR(64) NOT NULL,
    updated_at VARCHAR(64) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_resources_active ON educational_resources(is_active);
CREATE INDEX IF NOT EXISTS idx_resources_unit ON educational_resources(unit_id);
CREATE INDEX IF NOT EXISTS idx_resources_lesson ON educational_resources(lesson_id);
CREATE INDEX IF NOT EXISTS idx_resources_order ON educational_resources(display_order);

CREATE INDEX IF NOT EXISTS idx_resources_category ON educational_resources(category);
