# Code Spark — Relational Database Specification

## 1. Relational Schema Architecture
The database schema consists of 26 interconnected tables with foreign key constraints, cascading deletions, and B-tree indexes:

```text
users
  ├── assistant_permissions (1:N)
  ├── subscription_codes (Created / Used)
  ├── subscriptions (1:N)
  ├── lesson_progress (1:N)
  ├── exercise_submissions (1:N)
  ├── quiz_attempts (1:N)
  ├── exam_attempts (1:N)
  ├── bookmarks (1:N)
  ├── notifications (1:N)
  ├── support_tickets (1:N)
  │     └── support_messages (1:N)
  ├── student_stats (1:1)
  └── activity_logs (1:N)

courses
  └── units (1:N)
        └── lessons (1:N)
              ├── educational_resources (1:N)
              ├── exercises (1:N)
              │     └── exercise_submissions (1:N)
              └── quizzes (1:N)
                    ├── quiz_questions (N:M with question_bank)
                    └── quiz_attempts (1:N)

question_bank
  ├── quiz_questions (1:N)
  └── exam_questions (1:N)

exams
  ├── exam_questions (N:M with question_bank)
  └── exam_attempts (1:N)

announcements
platform_settings
```

## 2. Referential Integrity & Deletion Safety
- Cascading deletions are strictly enforced for dependent records (e.g., deleting a Course cascades to Units and Lessons; deleting an Exam cascades to Attempts and Question links).
- Important entities support soft deletion or archiving flags (`is_published`, `is_active`, `status`) to avoid accidental loss of educational progression or audit logs.
