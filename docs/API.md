# Code Spark — REST API Reference Manual

The platform exposes 85+ RESTful endpoints organized across 19 domain modules under `/api`:

## 1. Authentication (`/api/auth`)
- `POST /api/auth/register`: Create student account (NO subscription code required).
- `POST /api/auth/login`: Authenticate credentials, returns JWT access and refresh tokens.
- `GET /api/auth/me`: Retrieve current authenticated profile, role, permissions, and subscription status.
- `POST /api/auth/logout`: Log activity and terminate session.

## 2. Subscriptions & Codes (`/api/subscriptions`)
- `POST /api/subscriptions/codes/generate`: (Admin / Assistant with `subscriptions.generate`) Create subscription code (`CS-XXXX-XXXX`).
- `GET /api/subscriptions/codes`: (Admin / Assistant with `subscriptions.view`) List all generated codes with statuses.
- `POST /api/subscriptions/validate`: Public/Student endpoint to check code validity and duration without activating.
- `POST /api/subscriptions/activate`: (Student) Transactionally redeem code, unlock subscriber content, award XP.
- `GET /api/subscriptions/my-status`: (Student) Return active subscription record or null.

## 3. Curriculum (`/api/courses`, `/api/units`, `/api/lessons`)
- `GET /api/courses`: List available courses (supports public view).
- `GET /api/courses/{id}`: Retrieve course hierarchy (units and lessons with lock status).
- `POST /api/courses`, `PUT /api/courses/{id}`, `DELETE /api/courses/{id}`: Admin CRUD.
- `GET /api/units?course_id={id}`: List units for a course.
- `GET /api/lessons?unit_id={id}`: List lessons in a unit.
- `GET /api/lessons/{id}`: Retrieve lesson content, video embed/source, attachments, and exercises (enforces PUBLIC vs SUBSCRIBERS_ONLY).
- `PUT /api/lessons/{id}/progress`: (Student) Save video playback timestamp, watch percentage, and completion.

## 4. Educational Resources (`/api/resources`)
- `GET /api/resources`: List resources (filtered by lesson or unit).
- `POST /api/resources`: (Admin / Assistant with `resources.manage`) Add Google Drive link or uploaded file resource.
- `POST /api/resources/upload`: Direct secure file upload (PDF, DOCX, PPTX, MP4, etc.).
- `DELETE /api/resources/{id}`: Remove resource.

## 5. Exercises & Playground (`/api/exercises`)
- `GET /api/exercises`: List practice exercises.
- `GET /api/exercises/{id}`: Exercise instructions, starter code, test cases.
- `POST /api/exercises/{id}/submit`: Execute student code against test cases in isolated sandbox, return results.
- `POST /api/exercises/playground/run`: Run arbitrary Python/JavaScript code in sandbox with 5s timeout.

## 6. Centralized Question Bank (`/api/questions`)
- `GET /api/questions`: (Admin / Assistant with `questions.read`) Search and filter questions by topic, difficulty, type.
- `POST /api/questions`, `PUT /api/questions/{id}`, `DELETE /api/questions/{id}`: Question CRUD.

## 7. Quizzes & Exams (`/api/quizzes`, `/api/exams`)
- `GET /api/quizzes`, `POST /api/quizzes`: Quizzes management.
- `POST /api/quizzes/{id}/submit`: Submit quiz answers, auto-grade, return explanations.
- `GET /api/exams`: List exams.
- `POST /api/exams/{id}/start`: Start exam attempt, create server timer (`expires_at`).
- `PUT /api/exams/attempts/{id}/autosave`: Autosave student answers during exam.
- `POST /api/exams/attempts/{id}/submit`: Submit exam, calculate server-side grade and percentage.
- `GET /api/exams/attempts/{id}/result`: View detailed student results.

## 8. Support & Feedback (`/api/support`)
- `GET /api/support/tickets`: List user or all tickets.
- `POST /api/support/tickets`: Create new support ticket.
- `GET /api/support/tickets/{id}`: Ticket details and message history.
- `POST /api/support/tickets/{id}/messages`: Send message or staff reply.

## 9. Assistant Management (`/api/assistants`)
- `GET /api/assistants`: (Admin) List all assistants and their assigned permissions.
- `POST /api/assistants`: (Admin) Create assistant account.
- `PUT /api/assistants/{id}/permissions`: (Admin) Set assistant permission toggles.

## 10. Admin Console & Audit Logs (`/api/admin`, `/api/activity`)
- `GET /api/admin/dashboard`: Real aggregated KPI metrics.
- `GET /api/admin/settings`, `PUT /api/admin/settings`: Platform configurations.
- `GET /api/activity`: Query audit logs.
