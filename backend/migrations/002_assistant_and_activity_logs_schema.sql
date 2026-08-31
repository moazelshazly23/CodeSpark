-- ==============================================================================
-- Code Spark - Schema Migration: Assistant System & Activity Logs
-- Version: 2.1.0 (Phase 5)
-- Purpose: Complete Assistant Role, Soft Deletion, and Activity Logging System
-- ==============================================================================

BEGIN;

-- 1. Create Activity Logs Table
CREATE TABLE IF NOT EXISTS activity_logs (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    user_name VARCHAR(255),
    user_role VARCHAR(32),
    action VARCHAR(64) NOT NULL,
    target_type VARCHAR(64),
    target_id VARCHAR(64),
    target_name VARCHAR(255),
    details TEXT,
    ip_address VARCHAR(64),
    created_at VARCHAR(64) NOT NULL
);

-- Performance Indexes for Activity Logs
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_target ON activity_logs(target_type);

COMMIT;
