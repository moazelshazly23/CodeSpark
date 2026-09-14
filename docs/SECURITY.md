# Code Spark — Security & Threat Mitigation Specification

## 1. Authentication & Password Security
- **NIST SP 800-63B Compliance**: Password hashing utilizes PBKDF2-HMAC-SHA256 with 100,000 iterations and a cryptographically secure 128-bit random salt (`os.urandom(16)`).
- **Constant-Time Verification**: All password checks and token signature validations use `hmac.compare_digest` to prevent timing attacks.
- **JWT Architecture**: Access tokens (HS256) expire in 7 days for web sessions; refresh tokens provide long-lived persistent logins with automatic invalidation.

## 2. Authorization & RBAC Boundaries
- **Role Enforcement**: Middleware strictly blocks students from administrative endpoints (`/api/admin/*`, `/api/assistants/*`, `/api/subscriptions/codes/generate`).
- **Assistant Configurable Permissions**: Assistants can only invoke endpoints where their specific permission is present in the `assistant_permissions` database table.
- **Content Access Control**: The server verifies subscription status before delivering subscriber-only content (`SUBSCRIBERS_ONLY`). The client UI state is never trusted as the authority.

## 3. Subscription Code Safety
- **Anti-Collision**: Codes are generated with entropy avoiding ambiguous characters (`CS-XXXX-XXXX`).
- **Atomic Transactions**: Code validation and redemption run within an isolated database transaction with row-level locks, preventing double-redemption race conditions.

## 4. Sandboxed Code Execution
- **Process Isolation**: Code is written to an ephemeral scratch file and executed in an isolated `subprocess`.
- **Resource Constraints**: Strict 5-second timeout, memory restrictions, output truncation, and stripped environment variables.
- **Sanitized Uploads**: Filenames are hashed with unique UUIDs to prevent directory traversal and overwrite attacks.
