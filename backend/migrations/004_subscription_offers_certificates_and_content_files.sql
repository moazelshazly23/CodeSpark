-- Migration 004: Subscription Offers, Certificates and Generic Content Files

-- 1. Subscription Offers Table
CREATE TABLE IF NOT EXISTS subscription_offers (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255),
    title VARCHAR(255) NOT NULL,
    duration_type VARCHAR(32) NOT NULL DEFAULT '1_month',
    duration_days INTEGER NOT NULL DEFAULT 30,
    price REAL NOT NULL DEFAULT 99.0,
    currency VARCHAR(16) NOT NULL DEFAULT 'EGP',
    description TEXT,
    badge VARCHAR(64),
    features_json TEXT,
    image_url TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at VARCHAR(64) NOT NULL,
    updated_at VARCHAR(64) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sub_offers_active ON subscription_offers(is_active);
CREATE INDEX IF NOT EXISTS idx_sub_offers_order ON subscription_offers(display_order);

-- 2. Certificates Table
CREATE TABLE IF NOT EXISTS certificates (
    id VARCHAR(64) PRIMARY KEY,
    certificate_code VARCHAR(64) UNIQUE NOT NULL,
    student_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_name VARCHAR(255) NOT NULL,
    course_name VARCHAR(255) NOT NULL,
    completion_percentage INTEGER NOT NULL DEFAULT 100,
    grade VARCHAR(64) DEFAULT 'ممتاز',
    issue_date VARCHAR(64) NOT NULL,
    qr_data TEXT,
    created_at VARCHAR(64) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cert_student ON certificates(student_id);
CREATE INDEX IF NOT EXISTS idx_cert_code ON certificates(certificate_code);

-- 3. Content Files Table (Generic Source Support: UPLOAD, GOOGLE_DRIVE, EXTERNAL_URL)
CREATE TABLE IF NOT EXISTS content_files (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    title VARCHAR(255),
    source_type VARCHAR(32) NOT NULL DEFAULT 'UPLOAD',
    file_url TEXT,
    storage_path VARCHAR(512),
    mime_type VARCHAR(64),
    file_size INTEGER,
    file_type VARCHAR(32) DEFAULT 'file',
    category VARCHAR(100),
    unit_id VARCHAR(64) REFERENCES units(id) ON DELETE SET NULL,
    lesson_id VARCHAR(64) REFERENCES lessons(id) ON DELETE SET NULL,
    is_paid INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    display_order INTEGER DEFAULT 0,
    views_count INTEGER DEFAULT 0,
    downloads_count INTEGER DEFAULT 0,
    uploaded_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    uploaded_by_name VARCHAR(255),
    created_at VARCHAR(64) NOT NULL,
    updated_at VARCHAR(64) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_content_files_active ON content_files(is_active);
CREATE INDEX IF NOT EXISTS idx_content_files_unit ON content_files(unit_id);
CREATE INDEX IF NOT EXISTS idx_content_files_lesson ON content_files(lesson_id);
CREATE INDEX IF NOT EXISTS idx_content_files_order ON content_files(display_order);
