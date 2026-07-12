# Recruitment Authentication Platform

This repository contains the complete implementation of a highly secure, production-ready Authentication and Authorization platform tailored for a Recruitment System.

To demonstrate architectural flexibility and provide multiple implementation examples, the backend has been developed using **three different technology stacks**, all serving the same frontend client.

## Repository Structure

- `/Back-ASPNET` - The **.NET 10** (C#) implementation using Clean Architecture and Entity Framework Core.
- `/Back-laravel` - The **Laravel 13** (PHP 8.3) implementation using standard MVC, Eloquent ORM, and robust service classes.
- `/Back-nodejs` - The **Node.js 20+** (TypeScript) implementation using Express.js and Prisma ORM.
- `/frontend` - The frontend application (Angular).

## Architecture Patterns

The platform implements distinct architectural patterns across the different backend environments to provide varied implementation strategies:

- **ASP.NET**: Uses **Clean Architecture**. The solution is divided into strictly decoupled layers: `API` (Presentation), `Application` (Use cases/DTOs), `Domain` (Core entities), and `Infrastructure` (Database/External Services). This enforces the dependency rule where inner layers do not depend on outer layers.
- **Laravel**: Uses a robust **MVC (Model-View-Controller)** pattern adapted for API development. Business logic is abstracted into dedicated `Service` classes, and request validation is strictly handled by `FormRequests`, keeping controllers thin.
- **Node.js**: Uses a modular **Layered Architecture**. The application is structured into `Controllers` (handling HTTP requests), `Services` (containing core business logic), and `Middlewares` (handling cross-cutting concerns like authentication, rate limiting, and sanitization).

## Core Features (Consistent Across All Backends)

Regardless of the backend you choose to run, the system implements the following hardened security features:

- **Robust Registration & Login**: Including strict rate limiting and audit logging.
- **Advanced Session Management**: 
  - Short-lived stateless Access Tokens (JWTs).
  - Long-lived stateful Refresh Tokens (hashed in the database).
  - **Theft Detection / Token Family Tracking**: Instantly invalidates all active sessions if a revoked refresh token is reused.
- **Two-Factor Authentication (2FA)**: Full TOTP implementation (Google Authenticator) with QR Code generation.
- **OAuth Social Logins**: Seamless integration with Google, GitHub, and LinkedIn.
- **Password Management**: Secure Forgot / Reset password flows that automatically revoke existing sessions upon completion.
- **Email & SMS Notifications**: Transactional emails (verification, reset) and SMS integration.
- **Security Hardening**: Argon2id/BCrypt password hashing, XSS sanitization, CSRF Double-Submit cookie protection, and strictly typed input validation.

## Documentation

Detailed documentation for each specific backend stack, including the exact libraries and architectures used, can be found in their respective directories (or refer to the generated project documentation files).

## Getting Started

1. Navigate to your backend directory of choice (`Back-ASPNET`, `Back-laravel`, or `Back-nodejs`).
2. Copy the respective `.env.example` to `.env` and fill in your secrets (Database, SMTP, OAuth Client IDs).
3. Follow the specific setup instructions in that directory to install dependencies and run migrations.
4. Start the backend server and connect it to the `/frontend` client application.
