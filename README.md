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
- **Recruiter Assessment & Skill Testing Module (Consistent Across Node.js, Laravel & ASP.NET Core)**:
  - **Recruiter Workflow**: Create, edit, and manage technical assessments with customizable categories (Coding, DSA, SQL, DevOps, etc.), question types (MCQ Single/Multi, True/False, Essay, Code, File Upload, Matching, Ordering, Numerical), time limits, passing scores, difficulty levels, and anti-cheating settings (browser lock, webcam, tab switch detection).
  - **Admin Workflow**: Review candidate subscription requests and pending assessments submitted by recruiters with approve/reject workflows and rejection reason feedback.
  - **Candidate Workflow**: Browse published assessments, subscribe to tests, complete interactive timed tests, save answers in progress, and submit final responses.
  - **Automated & Manual Grading System**: Automatic scoring calculation for objective question types (MCQ, True/False, Numerical) upon submission, and recruiter grading interface for manual essay/code/file responses.
- **Security Hardening**: Argon2id/BCrypt password hashing, XSS sanitization, CSRF Double-Submit cookie protection, and strictly typed input validation.

## Automated Testing Suites

Each of the three backend implementations includes a dedicated automated test suite for unit and integration testing:

- **Node.js (`Back-nodejs`)**: Automated unit and integration testing powered by **Jest** and **Supertest**.
  ```bash
  cd Back-nodejs
  npm run test              # Run all Jest tests
  npm run test:unit         # Run unit tests
  npm run test:integration  # Run integration tests
  ```
- **Laravel (`Back-laravel`)**: Automated unit and feature testing powered by **PHPUnit**.
  ```bash
  cd Back-laravel
  php artisan test          # Run all PHPUnit tests
  # or
  ./vendor/bin/phpunit
  ```
- **ASP.NET Core (`Back-ASPNET`)**: Automated unit and integration testing powered by **xUnit**, **Moq**, and **Microsoft.AspNetCore.Mvc.Testing**.
  ```bash
  cd Back-ASPNET
  dotnet test               # Run all xUnit tests
  ```

## Documentation

Detailed documentation for each specific backend stack, including the exact libraries and architectures used, can be found in their respective directories (or refer to the generated project documentation files).

## Getting Started

1. Navigate to your backend directory of choice (`Back-ASPNET`, `Back-laravel`, or `Back-nodejs`).
2. Copy the respective `.env.example` to `.env` and fill in your secrets (Database, SMTP, OAuth Client IDs).
3. Follow the specific setup instructions in that directory to install dependencies and run migrations.
4. Start the backend server and connect it to the `/frontend` client application.
