# ASP.NET Backend Documentation

This document outlines everything we used and everything we implemented in the ASP.NET backend application.

## Architecture & Use Case Diagram

![ASP.NET Architecture & Use Case Diagram](aspnet-diagram.png)

## 1. Architecture & Core Technologies
- **Framework**: .NET 10.0 (`net10.0`) Web API.
- **Architecture**: **Clean Architecture** (divided into `API`, `Application`, `Domain`, and `Infrastructure` layers).

```mermaid
flowchart TD
    subgraph Presentation
        API["API Layer (Controllers, Middleware, Program.cs)"]
    end
    subgraph Core
        APP["Application Layer (Services, DTOs, Interfaces)"]
        DOM["Domain Layer (Entities, Enums)"]
    end
    subgraph External
        INF["Infrastructure Layer (EF Core, External Services)"]
        DB[(MySQL Database)]
    end

    API -->|Depends on| APP
    INF -->|Implements interfaces of| APP
    APP -->|Depends on| DOM
    API -.->|DI Setup| INF
    INF --> DB
```

- **Database**: MySQL integrated via **Entity Framework Core 9.0** (`Pomelo.EntityFrameworkCore.MySql`).
- **Environment Management**: `DotNetEnv` for loading configuration from `.env` files.
- **Documentation**: Swagger / OpenAPI (`Swashbuckle.AspNetCore`) for interactive API testing.

## 2. Authentication & Security Libraries
- **JWT**: `Microsoft.AspNetCore.Authentication.JwtBearer` for validating Access Tokens.
- **Hashing**: `BCrypt.Net-Next` for securely hashing passwords.
- **Caching**: ASP.NET Core `MemoryCache` (`AddMemoryCache()`) utilized for temporary state (like 2FA temp tokens).
- **CORS**: Configured Cross-Origin Resource Sharing to allow credentials (cookies) and specific client URLs.

## 3. Features & Flows Implemented

### Registration & Email Verification
- Users register and are assigned a `PENDING_VERIFICATION` status.
- The system generates a cryptographically secure token, hashes it for database storage, and emails the raw token.
- Validating the token upgrades the user to `PENDING_APPROVAL`.

### Login & Session Management
- Validates credentials and checks account status (e.g., Suspended, Inactive).
- Issues a short-lived **JWT Access Token** (via Header or HttpOnly Cookie) and a long-lived **Refresh Token**.
- **Token Rotation & Theft Detection**: Refresh tokens are rotated on use. If a previously used (revoked) refresh token is presented, the system detects a potential token theft and immediately revokes the entire token family (all active sessions for that user).

### Two-Factor Authentication (2FA)
- Full TOTP (Time-based One-Time Password) setup.
- If 2FA is enabled, login issues a temporary token instead of access tokens. The user must submit the TOTP code to complete login.
- Features to setup, enable, and disable 2FA.

### Password Management
- **Forgot Password**: Generates a secure, time-limited reset token sent via email.
- **Reset Password**: Consumes the token, updates the hashed password, and automatically revokes all existing sessions to secure the account.

### OAuth / Social Login
- Endpoints to handle OAuth callbacks, verifying codes and issuing application-specific JWTs or temporary tokens if 2FA is required.

### Admin & User Management
- Controllers available for administrators to manage users (e.g., approving accounts) and for users to retrieve their own profiles.

## 4. Sequence Diagrams

### Login Flow (with optional 2FA)

```mermaid
sequenceDiagram
    actor User
    participant API as AuthController
    participant AS as AuthService
    participant DB as MySQL (EF Core)
    participant Cache as MemoryCache

    User->>API: POST /auth/login {email, password}
    API->>AS: LoginAsync(request)
    AS->>DB: Find user by email
    DB-->>AS: User entity
    AS->>AS: BCrypt.Verify(password, hash)
    alt 2FA Enabled
        AS->>Cache: Store temp token (userId)
        AS-->>API: { requiresTwoFactor: true, tempToken }
        API-->>User: 200 { requiresTwoFactor, tempToken }
        User->>API: POST /auth/2fa/verify {tempToken, code}
        API->>AS: VerifyTwoFactorAsync(tempToken, code)
        AS->>Cache: Retrieve userId from tempToken
        AS->>AS: Validate TOTP code
        AS->>DB: Store Refresh Token (hashed)
        AS-->>API: { accessToken, refreshToken }
    else 2FA Disabled
        AS->>DB: Store Refresh Token (hashed)
        AS-->>API: { accessToken, refreshToken }
    end
    API-->>User: 200 { accessToken } + Set-Cookie: refreshToken (HttpOnly)
```

### Refresh Token Rotation & Theft Detection

```mermaid
sequenceDiagram
    actor User
    participant API as AuthController
    participant AS as AuthService
    participant DB as MySQL (EF Core)

    User->>API: POST /auth/refresh (cookie: refreshToken)
    API->>AS: RefreshTokenAsync(token)
    AS->>DB: Lookup hashed token
    alt Token not found
        AS-->>API: 401 Revoke entire family (theft detected)
    else Token already revoked
        AS->>DB: Revoke entire token family
        AS-->>API: 401 Compromise signal - all sessions invalidated
    else Token valid
        AS->>DB: Mark old token as revoked
        AS->>DB: Issue new Refresh Token (new hash)
        AS-->>API: { accessToken, refreshToken }
    end
    API-->>User: 200 New tokens
```

### Password Reset Flow

```mermaid
sequenceDiagram
    actor User
    participant API as AuthController
    participant AS as AuthService
    participant DB as MySQL (EF Core)
    participant SMTP as EmailService

    User->>API: POST /auth/forgot-password {email}
    API->>AS: ForgotPasswordAsync(email)
    AS->>DB: Generate & hash reset token
    AS->>SMTP: Send reset link (raw token)
    AS-->>API: 200 Safe response (no leak)
    API-->>User: 200 Check your email

    User->>API: POST /auth/reset-password {token, newPassword}
    API->>AS: ResetPasswordAsync(token, newPassword)
    AS->>DB: Validate token hash, check expiry
    AS->>DB: Update password (BCrypt hash)
    AS->>DB: Revoke ALL refresh tokens for user
    AS-->>API: 200 Password reset
    API-->>User: 200 Success
```

## 5. Use Case Diagram

The following diagram illustrates the primary use cases and actors interacting with the ASP.NET backend.

```mermaid
flowchart LR
    %% Actors
    U([Candidate / User])
    A([Administrator])
    OAuth([OAuth Providers])
    Email([SMTP Service])

    %% Use Cases
    subgraph ASP.NET Auth System
        R(Register)
        VE(Verify Email)
        L(Login via JWT)
        TFA(TOTP 2FA Verification)
        PR(Password Reset)
        SL(Social Login)
        M(Manage Profile)
        App(Approve Accounts)
    end

    %% Relationships
    U --> R
    U --> VE
    U --> L
    U --> TFA
    U --> PR
    U --> SL
    U --> M

    SL -.->|Authenticates with| OAuth
    R -.->|Sends Code via| Email
    PR -.->|Sends Link via| Email

    A --> App
    A --> M
```

## 6. Class Diagram

Based on the actual C# entity classes in the `Domain` layer and service interfaces in the `Application` layer.

![ASP.NET Class Diagram](aspnet-class-diagram.png)

```mermaid
classDiagram
    class User {
        +string Id
        +string FirstName
        +string LastName
        +string Email
        +string? Phone
        +string? PasswordHash
        +string Role
        +string Status
        +bool IsEmailVerified
        +bool IsTwoFactorEnabled
        +string? TwoFactorSecret
        +DateTime? LastLoginAt
        +string? AvatarUrl
        +string? GithubId
        +string? GoogleId
        +string? LinkedinId
        +DateTime CreatedAt
        +DateTime UpdatedAt
    }

    class RefreshToken {
        +string Id
        +string UserId
        +string TokenHash
        +string Family
        +DateTime ExpiresAt
        +bool Revoked
        +string? IpAddress
        +string? UserAgent
        +DateTime CreatedAt
    }

    class EmailVerificationToken {
        +string Id
        +string UserId
        +string TokenHash
        +DateTime ExpiresAt
        +bool Used
        +DateTime CreatedAt
    }

    class PasswordResetToken {
        +string Id
        +string UserId
        +string TokenHash
        +DateTime ExpiresAt
        +bool Used
        +DateTime CreatedAt
    }

    class AuditLog {
        +string Id
        +string? UserId
        +string Event
        +string? IpAddress
        +string? UserAgent
        +string? Metadata
        +DateTime CreatedAt
    }

    class LoginAttempt {
        +string Id
        +string? UserId
        +string Email
        +string IpAddress
        +bool Success
        +string? FailureReason
        +DateTime CreatedAt
    }

    class IAuthService {
        <<interface>>
        +RegisterAsync(request, ip, ua) AuthResponse
        +LoginAsync(request, ip, ua) LoginResult
        +RefreshTokenAsync(token, ip, ua) AuthResponse
        +LogoutAsync(refreshToken)
        +VerifyEmailAsync(token) bool
        +ForgotPasswordAsync(email, ip)
        +ResetPasswordAsync(token, password)
        +GetCurrentUserAsync(userId) UserDto
        +VerifyTwoFactorAsync(tempToken, code, ip, ua) AuthResponse
        +SetupTwoFactorAsync(userId) object
        +EnableTwoFactorAsync(userId, code) object
        +DisableTwoFactorAsync(userId, password) object
    }

    class ITokenService {
        <<interface>>
        +GenerateAccessToken(user) string
        +GenerateRefreshToken(userId, family) string
        +ValidateRefreshToken(token) ClaimsPrincipal
    }

    class IEmailService {
        <<interface>>
        +SendVerificationEmailAsync(to, name, token)
        +SendPasswordResetEmailAsync(to, name, token)
        +SendPasswordChangedEmailAsync(to, name)
    }

    User "1" --> "*" RefreshToken : has
    User "1" --> "*" EmailVerificationToken : has
    User "1" --> "*" PasswordResetToken : has
    User "1" --> "*" AuditLog : has
    User "1" --> "*" LoginAttempt : has
    IAuthService ..> ITokenService : uses
    IAuthService ..> IEmailService : uses
```

