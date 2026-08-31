"""001_initial_schema

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-08-27 20:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. Users
    op.create_table(
        'users',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('email', sa.String(255), unique=True, nullable=True),
        sa.Column('phone', sa.String(64), unique=True, nullable=True),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('role', sa.String(32), server_default='student', nullable=False),
        sa.Column('avatar', sa.String(255), nullable=True),
        sa.Column('is_active', sa.Integer(), server_default='1', nullable=False),
        sa.Column('status', sa.String(32), server_default='active', nullable=False),
        sa.Column('created_at', sa.String(64), nullable=False),
        sa.Column('updated_at', sa.String(64), nullable=False)
    )
    op.create_index('idx_users_email', 'users', ['email'])
    op.create_index('idx_users_phone', 'users', ['phone'])
    op.create_index('idx_users_role', 'users', ['role'])

    # 2. Student Profiles
    op.create_table(
        'student_profiles',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('user_id', sa.String(64), sa.ForeignKey('users.id', ondelete='CASCADE'), unique=True, nullable=False),
        sa.Column('grade', sa.String(128), nullable=True),
        sa.Column('class_name', sa.String(128), nullable=True),
        sa.Column('section', sa.String(128), nullable=True),
        sa.Column('parent_phone', sa.String(64), nullable=True),
        sa.Column('subscription_code', sa.String(64), nullable=True),
        sa.Column('streak', sa.Integer(), server_default='1'),
        sa.Column('xp', sa.Integer(), server_default='100'),
        sa.Column('learning_hours', sa.Float(), server_default='0.0'),
        sa.Column('last_activity', sa.String(64), nullable=True),
        sa.Column('last_lesson_id', sa.String(64), nullable=True),
        sa.Column('last_lesson_position', sa.Integer(), server_default='0'),
        sa.Column('created_at', sa.String(64), nullable=True),
        sa.Column('updated_at', sa.String(64), nullable=False)
    )
    op.create_index('idx_student_profiles_user', 'student_profiles', ['user_id'])

    # 3. Units
    op.create_table(
        'units',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('number', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('icon', sa.String(64), server_default='code'),
        sa.Column('total_lessons', sa.Integer(), server_default='0'),
        sa.Column('total_exams', sa.Integer(), server_default='0'),
        sa.Column('status', sa.String(32), server_default='not-started'),
        sa.Column('published', sa.Integer(), server_default='1'),
        sa.Column('is_published', sa.Integer(), server_default='1'),
        sa.Column('order_index', sa.Integer(), server_default='0'),
        sa.Column('created_at', sa.String(64), nullable=False),
        sa.Column('updated_at', sa.String(64), nullable=False)
    )

    # 4. Lessons
    op.create_table(
        'lessons',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('unit_id', sa.String(64), sa.ForeignKey('units.id', ondelete='CASCADE'), nullable=False),
        sa.Column('number', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('duration', sa.String(64), server_default='20 دقيقة'),
        sa.Column('type', sa.String(32), server_default='video'),
        sa.Column('video_url', sa.Text(), nullable=True),
        sa.Column('content', sa.Text(), nullable=True),
        sa.Column('content_html', sa.Text(), nullable=True),
        sa.Column('code_example', sa.Text(), nullable=True),
        sa.Column('code_solution', sa.Text(), nullable=True),
        sa.Column('exercise_title', sa.String(255), nullable=True),
        sa.Column('exercise_description', sa.Text(), nullable=True),
        sa.Column('exercise_starter_code', sa.Text(), nullable=True),
        sa.Column('exercise_solution_code', sa.Text(), nullable=True),
        sa.Column('exercise_test_cases', sa.Text(), nullable=True),
        sa.Column('published', sa.Integer(), server_default='1'),
        sa.Column('is_published', sa.Integer(), server_default='1'),
        sa.Column('order_index', sa.Integer(), server_default='0'),
        sa.Column('created_at', sa.String(64), nullable=False),
        sa.Column('updated_at', sa.String(64), nullable=False)
    )
    op.create_index('idx_lessons_unit', 'lessons', ['unit_id'])

    # 5. Lesson Progress
    op.create_table(
        'lesson_progress',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('student_id', sa.String(64), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('lesson_id', sa.String(64), sa.ForeignKey('lessons.id', ondelete='CASCADE'), nullable=False),
        sa.Column('progress', sa.Integer(), server_default='0'),
        sa.Column('completed', sa.Integer(), server_default='0'),
        sa.Column('last_position', sa.Integer(), server_default='0'),
        sa.Column('started_at', sa.String(64), nullable=True),
        sa.Column('completed_at', sa.String(64), nullable=True),
        sa.Column('updated_at', sa.String(64), nullable=False),
        sa.UniqueConstraint('student_id', 'lesson_id', name='uq_student_lesson_progress')
    )
    op.create_index('idx_lesson_progress_student', 'lesson_progress', ['student_id'])
    op.create_index('idx_lesson_progress_lesson', 'lesson_progress', ['lesson_id'])

    # 6. Exercises
    op.create_table(
        'exercises',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('lesson_id', sa.String(64), sa.ForeignKey('lessons.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('type', sa.String(32), server_default='code'),
        sa.Column('difficulty', sa.String(32), server_default='medium'),
        sa.Column('content', sa.Text(), nullable=True),
        sa.Column('solution', sa.Text(), nullable=True),
        sa.Column('starter_code', sa.Text(), nullable=True),
        sa.Column('solution_code', sa.Text(), nullable=True),
        sa.Column('test_cases', sa.Text(), nullable=True),
        sa.Column('published', sa.Integer(), server_default='1'),
        sa.Column('is_published', sa.Integer(), server_default='1'),
        sa.Column('created_at', sa.String(64), nullable=False),
        sa.Column('updated_at', sa.String(64), nullable=True)
    )

    # 7. Questions
    op.create_table(
        'questions',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('unit_id', sa.String(64), sa.ForeignKey('units.id', ondelete='SET NULL'), nullable=True),
        sa.Column('lesson_id', sa.String(64), sa.ForeignKey('lessons.id', ondelete='SET NULL'), nullable=True),
        sa.Column('question_text', sa.Text(), nullable=True),
        sa.Column('question', sa.Text(), nullable=False),
        sa.Column('type', sa.String(32), server_default='mcq', nullable=False),
        sa.Column('difficulty', sa.String(32), server_default='medium'),
        sa.Column('score', sa.Integer(), server_default='10'),
        sa.Column('explanation', sa.Text(), nullable=True),
        sa.Column('correct_answer', sa.Text(), nullable=True),
        sa.Column('code_snippet', sa.Text(), nullable=True),
        sa.Column('published', sa.Integer(), server_default='1'),
        sa.Column('is_published', sa.Integer(), server_default='1'),
        sa.Column('created_at', sa.String(64), nullable=False),
        sa.Column('updated_at', sa.String(64), nullable=True)
    )
    op.create_index('idx_questions_unit', 'questions', ['unit_id'])
    op.create_index('idx_questions_lesson', 'questions', ['lesson_id'])

    # 8. Question Options
    op.create_table(
        'question_options',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('question_id', sa.String(64), sa.ForeignKey('questions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('option_key', sa.String(32), nullable=False),
        sa.Column('option_text', sa.Text(), nullable=False),
        sa.Column('is_correct', sa.Integer(), server_default='0'),
        sa.Column('order_index', sa.Integer(), server_default='0')
    )
    op.create_index('idx_question_options_q', 'question_options', ['question_id'])

    # 9. Quizzes
    op.create_table(
        'quizzes',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('lesson_id', sa.String(64), sa.ForeignKey('lessons.id', ondelete='CASCADE'), nullable=True),
        sa.Column('unit_id', sa.String(64), sa.ForeignKey('units.id', ondelete='SET NULL'), nullable=True),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('duration', sa.Integer(), server_default='10'),
        sa.Column('duration_minutes', sa.Integer(), server_default='10'),
        sa.Column('passing_score', sa.Integer(), server_default='60'),
        sa.Column('published', sa.Integer(), server_default='1'),
        sa.Column('is_published', sa.Integer(), server_default='1'),
        sa.Column('created_at', sa.String(64), nullable=True),
        sa.Column('updated_at', sa.String(64), nullable=True)
    )

    # 10. Quiz Questions
    op.create_table(
        'quiz_questions',
        sa.Column('quiz_id', sa.String(64), sa.ForeignKey('quizzes.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('question_id', sa.String(64), sa.ForeignKey('questions.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('order_index', sa.Integer(), server_default='0')
    )

    # 11. Quiz Attempts
    op.create_table(
        'quiz_attempts',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('quiz_id', sa.String(64), sa.ForeignKey('quizzes.id', ondelete='CASCADE'), nullable=False),
        sa.Column('student_id', sa.String(64), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('score', sa.Integer(), server_default='0'),
        sa.Column('percentage', sa.Float(), server_default='0.0'),
        sa.Column('passed', sa.Integer(), server_default='0'),
        sa.Column('started_at', sa.String(64), nullable=False),
        sa.Column('completed_at', sa.String(64), nullable=True)
    )

    # 12. Quiz Answers
    op.create_table(
        'quiz_answers',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('attempt_id', sa.String(64), sa.ForeignKey('quiz_attempts.id', ondelete='CASCADE'), nullable=False),
        sa.Column('question_id', sa.String(64), sa.ForeignKey('questions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('selected_option', sa.String(64), nullable=True),
        sa.Column('is_correct', sa.Integer(), server_default='0')
    )

    # 13. Exams
    op.create_table(
        'exams',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('unit_id', sa.String(64), sa.ForeignKey('units.id', ondelete='SET NULL'), nullable=True),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('duration', sa.Integer(), server_default='30'),
        sa.Column('duration_minutes', sa.Integer(), server_default='30'),
        sa.Column('total_questions', sa.Integer(), server_default='10'),
        sa.Column('passing_score', sa.Integer(), server_default='60'),
        sa.Column('attempts_allowed', sa.Integer(), server_default='3'),
        sa.Column('random_questions', sa.Integer(), server_default='0'),
        sa.Column('randomize_questions', sa.Integer(), server_default='0'),
        sa.Column('published', sa.Integer(), server_default='1'),
        sa.Column('is_published', sa.Integer(), server_default='1'),
        sa.Column('created_at', sa.String(64), nullable=False),
        sa.Column('updated_at', sa.String(64), nullable=False)
    )
    op.create_index('idx_exams_unit', 'exams', ['unit_id'])

    # 14. Exam Questions
    op.create_table(
        'exam_questions',
        sa.Column('id', sa.String(64), nullable=True),
        sa.Column('exam_id', sa.String(64), sa.ForeignKey('exams.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('question_id', sa.String(64), sa.ForeignKey('questions.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('order_index', sa.Integer(), server_default='0')
    )

    # 15. Exam Attempts
    op.create_table(
        'exam_attempts',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('exam_id', sa.String(64), sa.ForeignKey('exams.id', ondelete='CASCADE'), nullable=False),
        sa.Column('student_id', sa.String(64), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('score', sa.Integer(), server_default='0'),
        sa.Column('total_score', sa.Integer(), server_default='100'),
        sa.Column('percentage', sa.Integer(), server_default='0'),
        sa.Column('correct_count', sa.Integer(), server_default='0'),
        sa.Column('total_count', sa.Integer(), server_default='0'),
        sa.Column('time_spent_seconds', sa.Integer(), server_default='0'),
        sa.Column('strengths_json', sa.Text(), nullable=True),
        sa.Column('weaknesses_json', sa.Text(), nullable=True),
        sa.Column('passed', sa.Integer(), server_default='0'),
        sa.Column('started_at', sa.String(64), nullable=False),
        sa.Column('completed_at', sa.String(64), nullable=True)
    )
    op.create_index('idx_exam_attempts_student', 'exam_attempts', ['student_id'])
    op.create_index('idx_exam_attempts_exam', 'exam_attempts', ['exam_id'])

    # 16. Exam Answers
    op.create_table(
        'exam_answers',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('attempt_id', sa.String(64), sa.ForeignKey('exam_attempts.id', ondelete='CASCADE'), nullable=False),
        sa.Column('question_id', sa.String(64), sa.ForeignKey('questions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('answer', sa.Text(), nullable=True),
        sa.Column('selected_option', sa.String(64), nullable=True),
        sa.Column('is_correct', sa.Integer(), server_default='0')
    )

    # 17. Notifications
    op.create_table(
        'notifications',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('user_id', sa.String(64), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=True),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('type', sa.String(32), server_default='info'),
        sa.Column('is_read', sa.Integer(), server_default='0'),
        sa.Column('link', sa.String(255), nullable=True),
        sa.Column('created_at', sa.String(64), nullable=False)
    )
    op.create_index('idx_notifications_user', 'notifications', ['user_id'])
    op.create_index('idx_notifications_read', 'notifications', ['is_read'])

    # 18. Announcements
    op.create_table(
        'announcements',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('badge', sa.String(64), server_default='جديد'),
        sa.Column('date_str', sa.String(64), nullable=True),
        sa.Column('published', sa.Integer(), server_default='1'),
        sa.Column('is_published', sa.Integer(), server_default='1'),
        sa.Column('created_at', sa.String(64), nullable=False)
    )

    # 19. Support Tickets
    op.create_table(
        'support_tickets',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('user_id', sa.String(64), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=True),
        sa.Column('student_name', sa.String(255), nullable=True),
        sa.Column('student_phone', sa.String(64), nullable=True),
        sa.Column('subject', sa.String(255), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('status', sa.String(32), server_default='open'),
        sa.Column('reply', sa.Text(), nullable=True),
        sa.Column('created_at', sa.String(64), nullable=False),
        sa.Column('updated_at', sa.String(64), nullable=False)
    )
    op.create_index('idx_support_tickets_user', 'support_tickets', ['user_id'])

    # 20. System Settings
    op.create_table(
        'system_settings',
        sa.Column('key', sa.String(128), primary_key=True),
        sa.Column('value', sa.Text(), nullable=False),
        sa.Column('updated_at', sa.String(64), nullable=False)
    )

def downgrade() -> None:
    for table in reversed([
        'system_settings', 'support_tickets', 'announcements', 'notifications',
        'exam_answers', 'exam_attempts', 'exam_questions', 'exams',
        'quiz_answers', 'quiz_attempts', 'quiz_questions', 'quizzes',
        'question_options', 'questions', 'exercises', 'lesson_progress',
        'lessons', 'units', 'student_profiles', 'users'
    ]):
        op.drop_table(table)
