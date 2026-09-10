-- Code Spark - Migration 005: Code Playground Examples & Safe Database Persistence
CREATE TABLE IF NOT EXISTS playground_examples (
    id VARCHAR(64) PRIMARY KEY,
    type VARCHAR(32) NOT NULL,
    category VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    difficulty VARCHAR(32) NOT NULL DEFAULT 'beginner',
    instructions TEXT,
    initial_code TEXT NOT NULL,
    expected_output TEXT,
    is_published INTEGER NOT NULL DEFAULT 1,
    order_index INTEGER NOT NULL DEFAULT 1,
    created_at VARCHAR(64) NOT NULL,
    updated_at VARCHAR(64) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_playground_examples_type_pub ON playground_examples (type, is_published, order_index);
