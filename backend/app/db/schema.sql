-- ==============================================================================
-- Code Spark - Production PostgreSQL DDL Schema
-- Comprehensive Relational Database Design with Constraints & B-Tree Indexes
-- ==============================================================================

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    username VARCHAR(64) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL CHECK (role IN ('student', 'assistant', 'admin')),
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT TRUE,
    phone VARCHAR(32),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 2. Assistant Permissions Table
CREATE TABLE IF NOT EXISTS assistant_permissions (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission VARCHAR(64) NOT NULL,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_assistant_permission UNIQUE (user_id, permission)
);

-- 3. Subscription Codes Table
CREATE TABLE IF NOT EXISTS subscription_codes (
    id VARCHAR(64) PRIMARY KEY,
    code VARCHAR(64) UNIQUE NOT NULL,
    code_hash VARCHAR(128) NOT NULL,
    duration_type VARCHAR(32) NOT NULL CHECK (duration_type IN ('1_MONTH', '3_MONTHS', '6_MONTHS', '12_MONTHS', 'LIFETIME', 'CUSTOM')),
    duration_days INTEGER NOT NULL,
    status VARCHAR(32) NOT NULL CHECK (status IN ('ACTIVE', 'USED', 'EXPIRED', 'DISABLED')),
    created_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    used_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    disabled BOOLEAN DEFAULT FALSE,
    metadata_json TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    activated_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- 4. Subscriptions Table
CREATE TABLE IF NOT EXISTS subscriptions (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_id VARCHAR(64) REFERENCES subscription_codes(id) ON DELETE SET NULL,
    status VARCHAR(32) NOT NULL CHECK (status IN ('ACTIVE', 'EXPIRED', 'DISABLED')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_lifetime BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 5. Courses Table
CREATE TABLE IF NOT EXISTS courses (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    order_index INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT TRUE,
    access_type VARCHAR(32) NOT NULL CHECK (access_type IN ('PUBLIC', 'SUBSCRIBERS_ONLY')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 6. Units Table
CREATE TABLE IF NOT EXISTS units (
    id VARCHAR(64) PRIMARY KEY,
    course_id VARCHAR(64) NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT TRUE,
    access_type VARCHAR(32) NOT NULL CHECK (access_type IN ('PUBLIC', 'SUBSCRIBERS_ONLY')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 7. Lessons Table
CREATE TABLE IF NOT EXISTS lessons (
    id VARCHAR(64) PRIMARY KEY,
    unit_id VARCHAR(64) NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT,
    content_markdown TEXT,
    video_type VARCHAR(32) NOT NULL CHECK (video_type IN ('youtube', 'uploaded', 'none')),
    video_url TEXT,
    video_id VARCHAR(128),
    duration_seconds REAL DEFAULT 0,
    order_index INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT TRUE,
    access_type VARCHAR(32) NOT NULL CHECK (access_type IN ('PUBLIC', 'SUBSCRIBERS_ONLY')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 8. Lesson Progress Table
CREATE TABLE IF NOT EXISTS lesson_progress (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lesson_id VARCHAR(64) NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    last_video_position_seconds REAL DEFAULT 0,
    watch_percentage REAL DEFAULT 0,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_user_lesson_progress UNIQUE (user_id, lesson_id)
);

-- 9. Educational Resources Table
CREATE TABLE IF NOT EXISTS educational_resources (
    id VARCHAR(64) PRIMARY KEY,
    unit_id VARCHAR(64) REFERENCES units(id) ON DELETE SET NULL,
    lesson_id VARCHAR(64) REFERENCES lessons(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    resource_type VARCHAR(32) NOT NULL CHECK (resource_type IN ('drive_link', 'uploaded_file')),
    file_url TEXT NOT NULL,
    file_size_bytes BIGINT DEFAULT 0,
    file_format VARCHAR(32),
    access_type VARCHAR(32) NOT NULL CHECK (access_type IN ('PUBLIC', 'SUBSCRIBERS_ONLY')),
    is_published BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 10. Exercises Table
CREATE TABLE IF NOT EXISTS exercises (
    id VARCHAR(64) PRIMARY KEY,
    unit_id VARCHAR(64) REFERENCES units(id) ON DELETE SET NULL,
    lesson_id VARCHAR(64) REFERENCES lessons(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    instructions TEXT,
    starter_code TEXT,
    expected_output TEXT,
    test_cases_json TEXT,
    language VARCHAR(32) NOT NULL CHECK (language IN ('python', 'javascript', 'html', 'css')),
    difficulty VARCHAR(32) NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    solution_code TEXT,
    access_type VARCHAR(32) NOT NULL CHECK (access_type IN ('PUBLIC', 'SUBSCRIBERS_ONLY')),
    is_published BOOLEAN DEFAULT TRUE,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 11. Exercise Submissions Table
CREATE TABLE IF NOT EXISTS exercise_submissions (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exercise_id VARCHAR(64) NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    submitted_code TEXT NOT NULL,
    status VARCHAR(32) NOT NULL CHECK (status IN ('PASSED', 'FAILED', 'ERROR')),
    output TEXT,
    tests_passed INTEGER DEFAULT 0,
    tests_total INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 12. Question Bank Table
CREATE TABLE IF NOT EXISTS question_bank (
    id VARCHAR(64) PRIMARY KEY,
    question_text TEXT NOT NULL,
    question_type VARCHAR(32) NOT NULL CHECK (question_type IN ('multiple_choice', 'true_false', 'code', 'essay')),
    options_json TEXT,
    correct_answer TEXT NOT NULL,
    explanation TEXT,
    difficulty VARCHAR(32) NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    topic VARCHAR(128),
    unit_id VARCHAR(64) REFERENCES units(id) ON DELETE SET NULL,
    lesson_id VARCHAR(64) REFERENCES lessons(id) ON DELETE SET NULL,
    tags_json TEXT,
    status VARCHAR(32) DEFAULT 'active',
    created_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 13. Quizzes Table
CREATE TABLE IF NOT EXISTS quizzes (
    id VARCHAR(64) PRIMARY KEY,
    lesson_id VARCHAR(64) REFERENCES lessons(id) ON DELETE SET NULL,
    unit_id VARCHAR(64) REFERENCES units(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    passing_score REAL DEFAULT 70.0,
    time_limit_minutes INTEGER DEFAULT 15,
    access_type VARCHAR(32) NOT NULL CHECK (access_type IN ('PUBLIC', 'SUBSCRIBERS_ONLY')),
    is_published BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 14. Quiz Questions Table
CREATE TABLE IF NOT EXISTS quiz_questions (
    id VARCHAR(64) PRIMARY KEY,
    quiz_id VARCHAR(64) NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    question_id VARCHAR(64) NOT NULL REFERENCES question_bank(id) ON DELETE CASCADE,
    points REAL DEFAULT 1.0,
    order_index INTEGER DEFAULT 0,
    CONSTRAINT uq_quiz_question UNIQUE (quiz_id, question_id)
);

-- 15. Quiz Attempts Table
CREATE TABLE IF NOT EXISTS quiz_attempts (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    quiz_id VARCHAR(64) NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    answers_json TEXT,
    score REAL DEFAULT 0,
    total_possible REAL DEFAULT 0,
    percentage REAL DEFAULT 0,
    is_passed BOOLEAN DEFAULT FALSE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 16. Exams Table
CREATE TABLE IF NOT EXISTS exams (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL DEFAULT 45,
    passing_score REAL DEFAULT 75.0,
    max_attempts INTEGER DEFAULT 1,
    is_randomized BOOLEAN DEFAULT FALSE,
    start_window TIMESTAMP WITH TIME ZONE,
    end_window TIMESTAMP WITH TIME ZONE,
    access_type VARCHAR(32) NOT NULL CHECK (access_type IN ('PUBLIC', 'SUBSCRIBERS_ONLY')),
    is_published BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 17. Exam Questions Table
CREATE TABLE IF NOT EXISTS exam_questions (
    id VARCHAR(64) PRIMARY KEY,
    exam_id VARCHAR(64) NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    question_id VARCHAR(64) NOT NULL REFERENCES question_bank(id) ON DELETE CASCADE,
    points REAL DEFAULT 1.0,
    order_index INTEGER DEFAULT 0,
    CONSTRAINT uq_exam_question UNIQUE (exam_id, question_id)
);

-- 18. Exam Attempts Table
CREATE TABLE IF NOT EXISTS exam_attempts (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exam_id VARCHAR(64) NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    attempt_number INTEGER DEFAULT 1,
    answers_json TEXT,
    score REAL DEFAULT 0,
    total_possible REAL DEFAULT 0,
    percentage REAL DEFAULT 0,
    is_passed BOOLEAN DEFAULT FALSE,
    status VARCHAR(32) NOT NULL CHECK (status IN ('IN_PROGRESS', 'SUBMITTED', 'GRADED')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    feedback TEXT
);

-- 19. Bookmarks Table
CREATE TABLE IF NOT EXISTS bookmarks (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_type VARCHAR(32) NOT NULL CHECK (item_type IN ('lesson', 'resource', 'exercise')),
    item_id VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_user_bookmark UNIQUE (user_id, item_type, item_id)
);

-- 20. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(32) NOT NULL CHECK (notification_type IN ('system', 'exam', 'lesson', 'subscription', 'support')),
    link_url TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 21. Announcements Table
CREATE TABLE IF NOT EXISTS announcements (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    target_audience VARCHAR(32) NOT NULL CHECK (target_audience IN ('ALL', 'STUDENTS', 'SUBSCRIBERS', 'ASSISTANTS')),
    is_published BOOLEAN DEFAULT TRUE,
    publish_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expiration_date TIMESTAMP WITH TIME ZONE,
    created_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 22. Support Tickets Table
CREATE TABLE IF NOT EXISTS support_tickets (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject VARCHAR(255) NOT NULL,
    category VARCHAR(64) NOT NULL,
    priority VARCHAR(32) NOT NULL CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    status VARCHAR(32) NOT NULL CHECK (status IN ('OPEN', 'IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 23. Support Messages Table
CREATE TABLE IF NOT EXISTS support_messages (
    id VARCHAR(64) PRIMARY KEY,
    ticket_id VARCHAR(64) NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_staff_reply BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 24. Activity Logs Table
CREATE TABLE IF NOT EXISTS activity_logs (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(64) NOT NULL,
    entity_type VARCHAR(64) NOT NULL,
    entity_id VARCHAR(64),
    details_json TEXT,
    ip_address VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 25. Student Stats Table
CREATE TABLE IF NOT EXISTS student_stats (
    user_id VARCHAR(64) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    xp INTEGER DEFAULT 0,
    streak_days INTEGER DEFAULT 1,
    last_active_date VARCHAR(32),
    study_time_minutes REAL DEFAULT 0
);

-- 26. Platform Settings Table
CREATE TABLE IF NOT EXISTS platform_settings (
    key VARCHAR(64) PRIMARY KEY,
    value_json TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- B-Tree Performance Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_sub_codes_code ON subscription_codes(code);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_units_course ON units(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_unit ON lessons(unit_id);
CREATE INDEX IF NOT EXISTS idx_progress_user ON lesson_progress(user_id, lesson_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_user ON exam_attempts(user_id, exam_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_logs(created_at);
