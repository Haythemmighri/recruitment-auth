# Laravel Backend Documentation

This document outlines everything we used and everything we implemented in the Laravel backend API.

## Architecture & Use Case Diagram

![Laravel Architecture & Use Case Diagram](laravel-diagram.png)

## 1. Architecture & Core Technologies
- **Framework**: Laravel 13.x (running on PHP 8.3+).
- **Architecture**: Laravel MVC structure strictly adhering to API best practices (FormRequests for validation, Service classes for business logic).

```mermaid
flowchart TD
    Client["Client (Frontend)"]
    Router["Router (routes/api.php)"]
    Controllers["Controllers (Http/Controllers)"]
    FormRequests["FormRequests (Validation)"]
    Services["Services (Business Logic)"]
    Models["Models (Eloquent ORM)"]
    DB[(MySQL / Redis)]

    Client -->|HTTP Request| Router
    Router --> Middlewares
    Middlewares --> Controllers
    Controllers -->|Validates via| FormRequests
    Controllers -->|Delegates to| Services
    Services -->|Queries/Mutates| Models
    Models --> DB
```

- **Database**: Eloquent ORM with migrations for schema management.
- **Caching & Queues**: `predis/predis` to utilize Redis for high-performance caching and job queuing.
- **Code Quality**: Laravel Pint, Pest/PHPUnit.

## 2. Authentication & Security Libraries
- **JWT**: `tymon/jwt-auth` for creating and verifying JSON Web Tokens.
- **OAuth**: `laravel/socialite` for seamless integration with social providers.
- **2FA**: `pragmarx/google2fa-laravel` for TOTP logic and `bacon/bacon-qr-code` for generating scannable QR codes.
- **Hashing**: Laravel's built-in `Hash::driver('argon2id')` for memory-hard password hashing.

## 3. Features & Flows Implemented

### Registration & Email Verification
- FormRequests handle strict validation (uniqueness, strength).
- Argon2id password hashing.
- Generates a secure token (hashed in DB) and triggers the EmailService to send a verification link.

### Login, Auditing & Session Management
- **Login Auditing**: Every login attempt (success or failure) is logged with the IP address and failure reason (e.g., invalid credentials, suspended).
- **Access & Refresh Tokens**: Issues a JWT access token and a custom refresh token.
- **Token Rotation & Theft Detection**: Refresh tokens are rotated. Reusing a revoked token triggers a "compromise signal," instantly revoking the user's entire token family (invalidating all sessions).

### Two-Factor Authentication (2FA)
- Generates a secret and QR code for Google Authenticator.
- Intercepts login to require a TOTP code if 2FA is enabled.
- Includes endpoints to verify and fully enable/disable 2FA.

### Password Reset Flow
- Generates time-limited reset tokens.
- Securely processes the reset, updates the password, and instantly revokes all active refresh tokens for security.
- Triggers a "Password Changed" confirmation email.

### External Communications
- Dedicated `EmailService` and `SmsService` classes to handle transactional notifications.

## 4. Sequence Diagrams

### Login Flow (with Audit Logging & optional 2FA)

```mermaid
sequenceDiagram
    actor User
    participant R as Router (api.php)
    participant M as Middleware (ThrottleRequests)
    participant C as AuthController
    participant AS as AuthService
    participant DB as MySQL (Eloquent)
    participant Redis as Redis Cache

    User->>R: POST /api/auth/login {email, password}
    R->>M: Rate limit check
    M->>C: Request passes
    C->>AS: login(data, ip, userAgent)
    AS->>DB: Find user by email
    AS->>AS: Hash::argon2id check
    AS->>DB: LoginAttempt::create (audit log)
    alt 2FA Enabled
        AS->>AS: TokenService::signTempToken
        AS-->>C: { requiresTwoFactor, tempToken }
        C-->>User: 200 { requiresTwoFactor, tempToken }
        User->>R: POST /api/auth/2fa/verify {tempToken, code}
        C->>AS: TwoFactorService::verify(code)
        AS->>AS: Google2FA::verifyKey
        AS->>DB: RefreshToken::create (hashed)
        AS-->>C: { accessToken, refreshToken }
    else No 2FA
        AS->>DB: RefreshToken::create (hashed)
        AS-->>C: { accessToken, refreshToken }
    end
    C-->>User: 200 Tokens + HttpOnly cookie
```

### Token Rotation & Compromise Detection

```mermaid
sequenceDiagram
    actor User
    participant C as AuthController
    participant AS as AuthService
    participant TS as TokenService
    participant DB as MySQL

    User->>C: POST /api/auth/refresh (cookie: refreshToken)
    C->>AS: refreshToken(rawToken, ip, ua)
    AS->>TS: verifyRefreshToken(raw)
    AS->>DB: Find by SHA-256 hash
    alt Token not in DB
        AS->>DB: Revoke entire token family
        AS-->>C: 401 Theft detected
    else Token already revoked
        AS->>DB: Revoke entire token family (COMPROMISE)
        AS-->>C: 401 All sessions revoked
    else Token valid
        AS->>DB: Mark revoked = true
        AS->>DB: RefreshToken::create (new family entry)
        AS-->>C: { accessToken, refreshToken }
    end
    C-->>User: New tokens issued
```

### Password Reset Flow

```mermaid
sequenceDiagram
    actor User
    participant C as AuthController
    participant AS as AuthService
    participant DB as MySQL
    participant ES as EmailService
    participant Q as Redis Queue

    User->>C: POST /api/auth/forgot-password {email}
    C->>AS: forgotPassword(email)
    AS->>DB: Expire old tokens for user
    AS->>DB: PasswordResetToken::create (hashed)
    AS->>ES: sendPasswordResetEmail()
    ES->>Q: Dispatch queued mail job
    AS-->>C: 200 Safe ambiguous message
    C-->>User: 200 Check your email

    User->>C: POST /api/auth/reset-password {token, newPassword}
    C->>AS: resetPassword(token, newPassword)
    AS->>DB: Validate token hash + expiry
    AS->>DB: Update password (argon2id)
    AS->>DB: Revoke ALL active refresh tokens
    AS->>ES: sendPasswordChangedEmail()
    AS-->>C: 200 Reset successful
    C-->>User: 200 Log in with new password
```

## 5. Use Case Diagram

The following diagram illustrates the primary use cases and actors interacting with the Laravel backend.

```mermaid
flowchart LR
    %% Actors
    U([User])
    A([Admin])
    Socialite([Socialite Providers])
    Queue([Redis Queue / Mailer])

    %% Use Cases
    subgraph Laravel Auth API
        Reg(Register Account)
        Verify(Verify Email Address)
        Log(Login & Receive JWT)
        TwoF(Manage/Verify Google2FA)
        Reset(Forgot/Reset Password)
        OAuth(Login with OAuth)
        Audit(View Login Audits)
    end

    %% Relationships
    U --> Reg
    U --> Verify
    U --> Log
    U --> TwoF
    U --> Reset
    U --> OAuth
    
    A --> Audit
    A --> Reg

    OAuth -.->|Redirect/Callback| Socialite
    Reg -.->|Dispatch Job| Queue
    Reset -.->|Dispatch Job| Queue
```

## 6. Class Diagram

Based on the actual Eloquent Models and Service classes in the Laravel backend.

![Laravel Class Diagram](laravel-class-diagram.png)

```mermaid
classDiagram
    class User {
        +string id
        +string first_name
        +string last_name
        +string email
        +string? phone
        +string? password_hash
        +string role
        +string status
        +bool is_email_verified
        +bool is_two_factor_enabled
        +string? two_factor_secret
        +string? google_id
        +string? github_id
        +string? linkedin_id
        +string? avatar_url
        +DateTime? last_login_at
        +getJWTIdentifier() mixed
        +getJWTCustomClaims() array
        +refreshTokens() HasMany
        +emailVerificationTokens() HasMany
        +passwordResetTokens() HasMany
        +auditLogs() HasMany
        +loginAttempts() HasMany
    }

    class RefreshToken {
        +string id
        +string user_id
        +string token_hash
        +string family
        +DateTime expires_at
        +bool revoked
        +string? ip_address
        +string? user_agent
        +DateTime created_at
    }

    class EmailVerificationToken {
        +string id
        +string user_id
        +string token_hash
        +DateTime expires_at
        +bool used
        +DateTime created_at
    }

    class PasswordResetToken {
        +string id
        +string user_id
        +string token_hash
        +DateTime expires_at
        +bool used
        +DateTime created_at
    }

    class LoginAttempt {
        +string id
        +string? user_id
        +string email
        +string ip_address
        +bool success
        +string? failure_reason
        +DateTime created_at
    }

    class AuditLog {
        +string id
        +string? user_id
        +string event
        +string? ip_address
        +string? details
        +DateTime created_at
    }

    class AuthService {
        -TokenService tokenService
        -EmailService emailService
        +register(data) array
        +verifyEmail(token) array
        +login(data, ip, ua) array
        +refreshToken(raw, ip, ua) array
        +logout(rawToken) array
        +forgotPassword(email) array
        +resetPassword(token, newPassword) array
    }

    class TokenService {
        +issueTokenPair(userId, email, role, ip, ua, family) array
        +signTempToken(userId) string
        +verifyTempToken(token) object
        +verifyRefreshToken(raw) object
        +revokeTokenFamily(family)
    }

    class TwoFactorService {
        +setup(userId) array
        +enable(userId, code) array
        +disable(userId, password) array
        +verify(userId, code) bool
    }

    User "1" --> "*" RefreshToken : hasMany
    User "1" --> "*" EmailVerificationToken : hasMany
    User "1" --> "*" PasswordResetToken : hasMany
    User "1" --> "*" LoginAttempt : hasMany
    User "1" --> "*" AuditLog : hasMany
    AuthService --> TokenService : uses
    AuthService --> EmailService : uses
    TwoFactorService --> User : manages
```

