# Recruitment Authentication System

A hardened, production-ready authentication and authorization API built with Node.js, Express, MySQL, Prisma, and Redis.

## Architecture & Security Features
- **Passwords**: Argon2id (memory-hard, resistant to GPU attacks). Constant-time comparisons to prevent user enumeration.
- **Sessions**: Stateless short-lived JWT Access Tokens (15m) + Stateful rotated Refresh Tokens (7d).
- **Token Storage**: Refresh tokens are SHA-256 hashed in the database; original tokens are stored in HttpOnly cookies.
- **Theft Detection**: Token families track session chains. Reusing a revoked token invalidates the entire session family.
- **2FA**: Google Authenticator compatible TOTP (Time-based One-Time Password) using `speakeasy`.
- **Rate Limiting**: Distributed Redis-backed limiters for general API, auth endpoints, login (IP+Email), and password reset.
- **Injection Protection**: End-to-end type safety and schema validation via `zod`. XSS payload sanitization via `xss`. SQL injection prevented via Prisma ORM.
- **CSRF**: Double-Submit Cookie pattern via `csrf-csrf`.
- **Audit Logging**: Immutable, append-only logs for all security events.
- **Recruitment Assessment Module**: Full backend implementation (`src/modules/tests`) covering Recruiter assessment creation/management (`/api/tests/recruiter`), Question management, Candidate test workflows (`/api/tests/candidate`), Subscriptions, Submission saving/finalization with automated QCM scoring, and Admin review/approval workflows (`/api/tests/admin`).

## Prerequisites
- Node.js 20+
- MySQL Server (v8.0+)
- Redis Server

## Setup & Run

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   ```bash
   cp .env.example .env
   # Open .env and replace the placeholder secrets with generated secure strings!
   ```

3. **Start Backing Services (DB + Redis)**
   Ensure that your local MySQL and Redis servers are running and accessible with the credentials provided in your `.env` file.

4. **Initialize Database Schema**
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

## Testing

```bash
npm run test              # Run all tests
npm run test:unit         # Unit tests only
npm run test:integration  # Integration tests only
npm run test:coverage     # Test coverage report
```

## API Testing (Postman)

Import the provided collection `postman/recruitment-auth.postman_collection.json` into Postman to test the endpoints.
