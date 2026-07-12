# Node.js Backend Documentation

This document outlines everything we used and everything we implemented in the Node.js backend application.

## 1. Architecture & Core Technologies
- **Runtime & Framework**: Node.js 20+ with Express.js (`express`).
- **Language**: Strictly typed **TypeScript**.
- **Architecture**: **Layered Architecture / MVC**. The codebase is modularized into `Controllers` (handling request/response logic), `Services` (encapsulating core business logic), and `Middlewares` (handling cross-cutting concerns like validation and authentication).

```mermaid
flowchart TD
    Client["Client Request"]
    Middlewares["Middlewares (RateLimit, Auth, CSRF)"]
    Controllers["Controllers (Request/Response Handling)"]
    Services["Services (Business Logic)"]
    Prisma["Prisma ORM (@prisma/client)"]
    DB[(MySQL / Redis)]

    Client --> Middlewares
    Middlewares --> Controllers
    Controllers --> Services
    Services --> Prisma
    Prisma --> DB
```

- **Database**: MySQL integrated using **Prisma ORM** (`@prisma/client`, `prisma`) for type-safe queries and schema migrations.
- **Caching**: **Redis** (`ioredis`) for storing rate limit data and fast temporary access.

## 2. Security & Hardening Libraries
- **Rate Limiting**: `express-rate-limit` and `rate-limit-redis` (distributed rate limiting).
- **Payload & HTTP Security**: `helmet` (security headers), `xss` (payload sanitization to prevent Cross-Site Scripting), and `csrf-csrf` (Double-Submit Cookie pattern).
- **Validation**: `zod` for rigorous runtime schema validation and end-to-end type safety.
- **Password Hashing**: `argon2` for memory-hard GPU-resistant hashing.

## 3. Authentication & Communication Libraries
- **JWT**: `jsonwebtoken` for stateless access tokens.
- **OAuth**: `passport`, `passport-google-oauth20`, `passport-github2`, `passport-linkedin-oauth2`.
- **2FA**: `speakeasy` (TOTP generation/validation) and `qrcode` (image generation).
- **Messaging**: `nodemailer` (emails), `twilio` & `africastalking` (SMS).

## 4. Features & Flows Implemented

### Registration & Validation
- Zod schemas validate all inputs.
- Passwords hashed via Argon2id.
- Issues secure email verification links.

### Secure Session Management
- **Short-lived Access Tokens** (15m, stateless JWTs) and **Long-lived Refresh Tokens** (7d, stateful, stored as SHA-256 hashes in the DB).
- **Theft Detection & Token Families**: Implemented token family tracking. If an attacker reuses a revoked refresh token, the system detects the theft and instantly invalidates the entire session family for that user.
- **Distributed Rate Limiting**: Specific, strict rate limits for login attempts (by IP and Email) to prevent brute-force attacks.

### Two-Factor Authentication (2FA)
- Generates TOTP secrets and QR codes.
- Login flow is intercepted if 2FA is active; requires the user to input their authenticator code before issuing the final access/refresh tokens.

### Password Management
- Forgot password endpoint generates secure reset links.
- Password reset endpoint requires the token, hashes the new password, and invalidates all existing sessions.
- Strict rate limits applied specifically to password reset endpoints to prevent spam.

### OAuth Integrations
- Full callback handling for Google, GitHub, and LinkedIn.
- Automatically creates accounts or links social profiles to existing accounts.

### Audit Logging
- Immutable, append-only logs for all major security events (logins, password resets, token revocations).

## 4. Sequence Diagrams

### Login Flow (with Rate Limiting & optional 2FA)

```mermaid
sequenceDiagram
    actor User
    participant MW as Middleware (RateLimit + Sanitize)
    participant C as AuthController
    participant S as AuthService
    participant Redis as Redis (rate store)
    participant DB as MySQL (Prisma)
    participant Log as AuditLog

    User->>MW: POST /auth/login {email, password}
    MW->>Redis: Check login rate limit (IP + Email)
    MW->>C: Passes Zod validation
    C->>S: login(data, ip)
    S->>DB: prisma.user.findUnique(email)
    S->>S: argon2.verify(hash, password)
    S->>Log: auditLog.create (success/fail)
    alt 2FA Enabled
        S->>DB: Create temp token entry
        S-->>C: { requiresTwoFactor, tempToken }
        C-->>User: 200 { tempToken }
        User->>C: POST /auth/2fa/verify {tempToken, code}
        C->>S: verifyTwoFactor(tempToken, code)
        S->>S: speakeasy.totp.verify(code, secret)
        S->>DB: prisma.refreshToken.create (SHA-256 hash)
        S-->>C: { accessToken, refreshToken }
    else No 2FA
        S->>DB: prisma.refreshToken.create (SHA-256 hash)
        S-->>C: { accessToken, refreshToken }
    end
    C-->>User: 200 accessToken + Set-Cookie: refreshToken (HttpOnly)
```

### Token Family Tracking & Theft Detection

```mermaid
sequenceDiagram
    actor User
    participant C as AuthController
    participant S as AuthService
    participant DB as MySQL (Prisma)
    participant Log as AuditLog

    User->>C: POST /auth/refresh (cookie: refreshToken)
    C->>S: refreshToken(raw)
    S->>S: jwt.verify(raw) → get familyId
    S->>DB: prisma.refreshToken.findUnique(SHA256 hash)
    alt Not found in DB
        S->>DB: Revoke all tokens in family
        S->>Log: CRITICAL - Token theft detected
        S-->>C: 401 Session invalidated
    else Token already revoked
        S->>DB: Revoke all tokens in family (compromise)
        S->>Log: CRITICAL - Reuse of revoked token
        S-->>C: 401 All sessions revoked
    else Token valid & not revoked
        S->>DB: Mark current token revoked
        S->>DB: Create new token (same family)
        S-->>C: { newAccessToken, newRefreshToken }
    end
    C-->>User: Response
```

### OAuth Flow (Passport.js)

```mermaid
sequenceDiagram
    actor User
    participant C as OAuthController
    participant P as Passport.js Strategy
    participant Provider as Google/GitHub/LinkedIn
    participant S as AuthService
    participant DB as MySQL (Prisma)

    User->>C: GET /auth/google
    C->>P: passport.authenticate('google')
    P->>Provider: Redirect to OAuth consent screen
    Provider-->>P: Authorization code callback
    P->>Provider: Exchange code for profile
    Provider-->>P: User profile & email
    P->>S: findOrCreateOAuthUser(profile)
    S->>DB: prisma.user.upsert(email)
    S->>DB: prisma.refreshToken.create
    S-->>C: { accessToken, refreshToken }
    C-->>User: Redirect to frontend with token
```

## 5. Use Case Diagram

The following diagram illustrates the primary use cases and actors interacting with the Node.js backend.

```mermaid
flowchart LR
    %% Actors
    U([Client Application])
    OAuth([Passport Providers])
    SmsEmail([Nodemailer / Twilio])

    %% Use Cases
    subgraph Node.js Auth Backend
        Reg(Register & Validate Schema)
        Log(Login with Rate Limiting)
        Tfa(Speakeasy TOTP 2FA)
        Ref(Refresh Token Rotation)
        Res(Password Reset)
        Social(Passport.js Social Login)
        Audit(Security Audit Logging)
    end

    %% Relationships
    U --> Reg
    U --> Log
    U --> Tfa
    U --> Ref
    U --> Res
    U --> Social

    Social -.->|Tokens| OAuth
    Reg -.->|Notifications| SmsEmail
    Res -.->|Notifications| SmsEmail
```
