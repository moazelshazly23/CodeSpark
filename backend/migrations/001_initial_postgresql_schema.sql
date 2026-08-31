-- ==============================================================================
-- Code Spark - Production PostgreSQL Schema Migration
-- Version: 2.0.0-production (Phase 4)
-- Purpose: Complete Relational Schema for High School Programming Education Platform
-- ==============================================================================

BEGIN;

-- 1. Users Table (Core identity and authentication)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(64) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'student',
    avatar VARCHAR(255),
    is_active INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    created_at VARCHAR(64) NOT NULL,
    updated_at VARCHAR(64) NOT NULL
);

-- 2. Student Profiles Table (Academic profiles, gamification, and metadata)
CREATE TABLE IF NOT EXISTS student_profiles (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    grade VARCHAR(128),
    class_name VARCHAR(128),
    section VARCHAR(128),
    parent_phone VARCHAR(64),
    subscription_code VARCHAR(64),
    streak INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 100,
    learning_hours DOUBLE PRECISION DEFAULT 0.0,
    last_activity VARCHAR(64),
    last_lesson_id VARCHAR(64),
    last_lesson_position INTEGER DEFAULT 0,
    created_at VARCHAR(64),
    updated_at VARCHAR(64) NOT NULL
);

-- 3. Units Table (Curriculum organizational units)
CREATE TABLE IF NOT EXISTS units (
    id VARCHAR(64) PRIMARY KEY,
    number INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(64) DEFAULT 'code',
    total_lessons INTEGER DEFAULT 0,
    total_exams INTEGER DEFAULT 0,
    status VARCHAR(32) DEFAULT 'not-started',
    published INTEGER DEFAULT 1,
    is_published INTEGER DEFAULT 1,
    order_index INTEGER DEFAULT 0,
    created_at VARCHAR(64) NOT NULL,
    updated_at VARCHAR(64) NOT NULL
);

-- 4. Lessons Table (Educational units with content, video, and code exercises)
CREATE TABLE IF NOT EXISTS lessons (
    id VARCHAR(64) PRIMARY KEY,
    unit_id VARCHAR(64) NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    number INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    duration VARCHAR(64) DEFAULT '20 دقيقة',
    type VARCHAR(32) DEFAULT 'video',
    video_source VARCHAR(32) DEFAULT 'youtube',
    video_provider VARCHAR(32) DEFAULT 'youtube',
    video_id VARCHAR(128),
    video_url TEXT,
    storage_path VARCHAR(512),
    thumbnail_url TEXT,
    file_size INTEGER,
    mime_type VARCHAR(64),
    content TEXT,
    content_html TEXT,
    code_example TEXT,
    code_solution TEXT,
    exercise_title VARCHAR(255),
    exercise_description TEXT,
    exercise_starter_code TEXT,
    exercise_solution_code TEXT,
    exercise_test_cases TEXT,
    published INTEGER DEFAULT 1,
    is_published INTEGER DEFAULT 1,
    order_index INTEGER DEFAULT 0,
    created_at VARCHAR(64) NOT NULL,
    updated_at VARCHAR(64) NOT NULL
);

-- 5. Lesson Progress Table (Student progression and video bookmarks)
CREATE TABLE IF NOT EXISTS lesson_progress (
    id VARCHAR(64) PRIMARY KEY,
    student_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lesson_id VARCHAR(64) NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    progress INTEGER DEFAULT 0,
    completed INTEGER DEFAULT 0,
    last_position INTEGER DEFAULT 0,
    started_at VARCHAR(64),
    completed_at VARCHAR(64),
    updated_at VARCHAR(64) NOT NULL,
    CONSTRAINT uq_student_lesson_progress UNIQUE (student_id, lesson_id)
);

-- 6. Exercises Table (Coding exercises associated with lessons)
CREATE TABLE IF NOT EXISTS exercises (
    id VARCHAR(64) PRIMARY KEY,
    lesson_id VARCHAR(64) NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(32) DEFAULT 'code',
    difficulty VARCHAR(32) DEFAULT 'medium',
    content TEXT,
    solution TEXT,
    starter_code TEXT,
    solution_code TEXT,
    test_cases TEXT,
    published INTEGER DEFAULT 1,
    is_published INTEGER DEFAULT 1,
    created_at VARCHAR(64) NOT NULL,
    updated_at VARCHAR(64)
);

-- 7. Questions Table (Question bank: MCQ, True/False, Code Output, Code Completion)
CREATE TABLE IF NOT EXISTS questions (
    id VARCHAR(64) PRIMARY KEY,
    unit_id VARCHAR(64) REFERENCES units(id) ON DELETE SET NULL,
    lesson_id VARCHAR(64) REFERENCES lessons(id) ON DELETE SET NULL,
    question_text TEXT,
    question TEXT NOT NULL,
    type VARCHAR(32) NOT NULL DEFAULT 'mcq',
    difficulty VARCHAR(32) DEFAULT 'medium',
    score INTEGER DEFAULT 10,
    explanation TEXT,
    correct_answer TEXT,
    code_snippet TEXT,
    published INTEGER DEFAULT 1,
    is_published INTEGER DEFAULT 1,
    created_at VARCHAR(64) NOT NULL,
    updated_at VARCHAR(64)
);

-- 8. Question Options Table (Multiple choice options for questions)
CREATE TABLE IF NOT EXISTS question_options (
    id VARCHAR(64) PRIMARY KEY,
    question_id VARCHAR(64) NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    option_key VARCHAR(32) NOT NULL,
    option_text TEXT NOT NULL,
    is_correct INTEGER DEFAULT 0,
    order_index INTEGER DEFAULT 0
);

-- 9. Quizzes Table (Short lesson-level assessments)
CREATE TABLE IF NOT EXISTS quizzes (
    id VARCHAR(64) PRIMARY KEY,
    lesson_id VARCHAR(64) REFERENCES lessons(id) ON DELETE CASCADE,
    unit_id VARCHAR(64) REFERENCES units(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    duration INTEGER DEFAULT 10,
    duration_minutes INTEGER DEFAULT 10,
    passing_score INTEGER DEFAULT 60,
    published INTEGER DEFAULT 1,
    is_published INTEGER DEFAULT 1,
    created_at VARCHAR(64),
    updated_at VARCHAR(64)
);

-- 10. Quiz Questions Association Table
CREATE TABLE IF NOT EXISTS quiz_questions (
    quiz_id VARCHAR(64) NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    question_id VARCHAR(64) NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    order_index INTEGER DEFAULT 0,
    PRIMARY KEY (quiz_id, question_id)
);

-- 11. Quiz Attempts Table
CREATE TABLE IF NOT EXISTS quiz_attempts (
    id VARCHAR(64) PRIMARY KEY,
    quiz_id VARCHAR(64) NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    student_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score INTEGER DEFAULT 0,
    percentage DOUBLE PRECISION DEFAULT 0.0,
    passed INTEGER DEFAULT 0,
    started_at VARCHAR(64) NOT NULL,
    completed_at VARCHAR(64)
);

-- 12. Quiz Answers Table
CREATE TABLE IF NOT EXISTS quiz_answers (
    id VARCHAR(64) PRIMARY KEY,
    attempt_id VARCHAR(64) NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
    question_id VARCHAR(64) NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    selected_option VARCHAR(64),
    is_correct INTEGER DEFAULT 0
);

-- 13. Exams Table (Comprehensive unit and term exams)
CREATE TABLE IF NOT EXISTS exams (
    id VARCHAR(64) PRIMARY KEY,
    unit_id VARCHAR(64) REFERENCES units(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    duration INTEGER DEFAULT 30,
    duration_minutes INTEGER DEFAULT 30,
    total_questions INTEGER DEFAULT 10,
    passing_score INTEGER DEFAULT 60,
    attempts_allowed INTEGER DEFAULT 3,
    random_questions INTEGER DEFAULT 0,
    randomize_questions INTEGER DEFAULT 0,
    published INTEGER DEFAULT 1,
    is_published INTEGER DEFAULT 1,
    created_at VARCHAR(64) NOT NULL,
    updated_at VARCHAR(64) NOT NULL
);

-- 14. Exam Questions Association Table
CREATE TABLE IF NOT EXISTS exam_questions (
    id VARCHAR(64),
    exam_id VARCHAR(64) NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    question_id VARCHAR(64) NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    order_index INTEGER DEFAULT 0,
    PRIMARY KEY (exam_id, question_id)
);

-- 15. Exam Attempts Table (Student submissions and server-graded results)
CREATE TABLE IF NOT EXISTS exam_attempts (
    id VARCHAR(64) PRIMARY KEY,
    exam_id VARCHAR(64) NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    student_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score INTEGER DEFAULT 0,
    total_score INTEGER DEFAULT 100,
    percentage INTEGER DEFAULT 0,
    correct_count INTEGER DEFAULT 0,
    total_count INTEGER DEFAULT 0,
    time_spent_seconds INTEGER DEFAULT 0,
    strengths_json TEXT,
    weaknesses_json TEXT,
    passed INTEGER DEFAULT 0,
    started_at VARCHAR(64) NOT NULL,
    completed_at VARCHAR(64)
);

-- 16. Exam Answers Table
CREATE TABLE IF NOT EXISTS exam_answers (
    id VARCHAR(64) PRIMARY KEY,
    attempt_id VARCHAR(64) NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
    question_id VARCHAR(64) NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    answer TEXT,
    selected_option VARCHAR(64),
    is_correct INTEGER DEFAULT 0
);

-- 17. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(32) DEFAULT 'info',
    is_read INTEGER DEFAULT 0,
    link VARCHAR(255),
    created_at VARCHAR(64) NOT NULL
);

-- 18. Announcements Table
CREATE TABLE IF NOT EXISTS announcements (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    badge VARCHAR(64) DEFAULT 'جديد',
    date_str VARCHAR(64),
    published INTEGER DEFAULT 1,
    is_published INTEGER DEFAULT 1,
    created_at VARCHAR(64) NOT NULL
);

-- 19. Support Tickets Table
CREATE TABLE IF NOT EXISTS support_tickets (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    student_name VARCHAR(255),
    student_phone VARCHAR(64),
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(32) DEFAULT 'open',
    reply TEXT,
    created_at VARCHAR(64) NOT NULL,
    updated_at VARCHAR(64) NOT NULL
);

-- 20. System Settings Table
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(128) PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at VARCHAR(64) NOT NULL
);

-- Optimized Performance Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_student_profiles_user ON student_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_lessons_unit ON lessons(unit_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_student ON lesson_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson ON lesson_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_questions_unit ON questions(unit_id);
CREATE INDEX IF NOT EXISTS idx_questions_lesson ON questions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_question_options_q ON question_options(question_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_lesson ON quizzes(lesson_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student ON quiz_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_exams_unit ON exams(unit_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_student ON exam_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_exam ON exam_attempts(exam_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);


-- 21. Password Reset Tokens Table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code VARCHAR(64) NOT NULL DEFAULT '',
    token_hash VARCHAR(255) NOT NULL,
    reset_token_hash VARCHAR(255),
    attempts INTEGER NOT NULL DEFAULT 0,
    expires_at VARCHAR(64) NOT NULL,
    reset_token_expires_at VARCHAR(64),
    verified_at VARCHAR(64),
    used INTEGER NOT NULL DEFAULT 0,
    created_at VARCHAR(64) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reset_tokens_user ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_reset_tokens_code ON password_reset_tokens(code);

-- 22. Subscription Codes Table
CREATE TABLE IF NOT EXISTS subscription_codes (
    id VARCHAR(64) PRIMARY KEY,
    code_hash VARCHAR(64) UNIQUE NOT NULL,
    code_prefix VARCHAR(64) NOT NULL,
    masked_code VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    subscription_type VARCHAR(32) NOT NULL DEFAULT '1_month',
    duration_days INTEGER NOT NULL DEFAULT 30,
    max_uses INTEGER NOT NULL DEFAULT 1,
    uses_count INTEGER NOT NULL DEFAULT 0,
    assigned_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at VARCHAR(64) NOT NULL,
    activated_at VARCHAR(64),
    expires_at VARCHAR(64),
    disabled_at VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_sub_codes_hash ON subscription_codes(code_hash);
CREATE INDEX IF NOT EXISTS idx_sub_codes_status ON subscription_codes(status);
CREATE INDEX IF NOT EXISTS idx_sub_codes_user ON subscription_codes(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_sub_codes_created ON subscription_codes(created_at);

COMMIT;
