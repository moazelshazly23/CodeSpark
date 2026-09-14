# Code Spark — System Architecture & Design Document

## 1. Architectural Philosophy
Code Spark is built around an enterprise-grade, decoupled, multi-tier architecture:
```
[ Browser / Client ] (Arabic-First RTL Responsive SPA, Vanilla JS, Modular ES Modules)
        │
        ▼  (Hash-based SPA Router with Role & Subscription Guards)
[ Centralized API Client ] (Fetch API, Bearer Token Injection, Debounced Requests, Error Translation)
        │
        ▼  (RESTful JSON over HTTP)
[ FastAPI Backend Gateway ] (Uvicorn, CORS Middleware, Error Handlers, Static Storage)
        │
        ▼  (API Router Layer)
[ Domain Routers (19 Modules) ] (/api/auth, /api/subscriptions, /api/courses, /api/lessons, etc.)
        │
        ▼  (Dependency Injection / Security Interceptors)
[ Core Services Layer ] (AuthService, SubscriptionService, AccessControlService, CurriculumService, AssessmentService, CodeRunnerService)
        │
        ▼  (Data Access Layer)
[ Relational Repositories ] (UserRepository, SubscriptionRepository, CurriculumRepository, AssessmentRepository, ExerciseRepository, SupportRepository, AuditRepository)
        │
        ▼  (Relational Storage Engine with ACID Transactions & Foreign Keys)
[ Database Layer ] (PostgreSQL for Production / High-Performance SQLite for Development)
```

---

## 2. Component Decoupling & Separation of Concerns

### A. Frontend Tier (No Heavy Frameworks)
- **Vanilla JavaScript with Native ES Modules**: Pure web standards (HTML5, CSS3, ES6+ modules), zero bloated bundle size, instant first render (< 100ms).
- **Custom Client-Side SPA Router**: Hash-based routing (`#/student/...`, `#/admin/...`) supporting parameter extraction (`:id`), history navigation, and role-based guards.
- **Centralized API Client**: Handles authentication headers, token expiration intercepts, unified error formatting into clear Arabic messages, and request debouncing.
- **Arabic-First Design Tokens**: RTL layout, responsive mobile drawer, Cairo typography, and official Electric Blue / Vibrant Cyan brand identity.

### B. Backend Services Tier (Business Logic Isolation)
- **FastAPI Framework**: High-throughput asynchronous routing with automatic OpenAPI schema generation.
- **Route Handlers are Thin**: No business logic or SQL queries inside route controllers. Routers only validate inputs and delegate to Service classes.
- **Service Layer**: Handles domain rules, such as:
  - Atomic code redemption and duration calculation.
  - Public vs. Subscriber-only content filtering.
  - Server-side exam timer expiration and automated answer scoring.
  - Sandboxed execution of Python and JavaScript student code.
- **Repository Layer**: Encapsulates raw database queries and mutations, ensuring referential integrity and safe transactions.

### C. Sandboxed Code Playground Isolation
Student code is never executed inside the main application process. When a user runs code:
1. The code is written to an isolated temporary file in an ephemeral location.
2. A separate `subprocess` is spawned with resource limits (5-second execution timeout, restricted environment variables, output truncation).
3. Any infinite loop or heavy allocation triggers `TimeoutExpired` or OS termination, protecting backend server stability.
