# Recruitment Authentication Platform — ASP.NET Core Implementation

This directory contains the **.NET 10 (C#)** implementation of the Recruitment Authentication and Skill Testing Platform.

## Architecture & Design Patterns

The ASP.NET Core solution adheres strictly to **Clean Architecture** and SOLID principles, structured into distinct project layers:

1. **`RecruitmentAuth.Domain`**: Core domain entities (`User`, `Test`, `Question`, `TestSubmission`, `QuestionAnswer`, `TestSubscription`, `AuditLog`, `RefreshToken`), domain enums (`Role`, `TestCategory`, `TestType`, `TestStatus`, `SubmissionStatus`), and value objects. Inner layer with no external dependencies.
2. **`RecruitmentAuth.Application`**: Business logic interfaces (`ITestService`, `IAuthService`), DTOs, and application service implementations.
3. **`RecruitmentAuth.Infrastructure`**: Persistence (`ApplicationDbContext` with EF Core), JWT token generators, Argon2id password hashing, Redis caching, 2FA services, and external provider integrations.
4. **`RecruitmentAuth.API`**: Presentation layer featuring ASP.NET Core Web API Controllers (`AuthController`, `TestsController`, `SubmissionsController`, `AdminController`, `UsersController`, `OAuthController`) with JWT middleware authorization, rate limiting, and CORS headers.

## Recruitment Assessment & Skill Testing Module

- **Recruiter Endpoints (`/api/Tests`)**: Create assessments (`POST /api/Tests`), manage questions (`POST /api/Tests/{testId}/questions`), submit tests for admin review (`POST /api/Tests/{id}/submit-for-review`), list recruiter tests, view submissions (`GET /api/Tests/{testId}/submissions`), and grade submissions (`PATCH /api/Submissions/{id}/grade`).
- **Candidate Endpoints (`/api/Tests` & `/api/Submissions`)**: Browse published assessments (`GET /api/Tests`), subscribe to tests (`POST /api/Tests/{testId}/subscribe`), view subscriptions (`GET /api/Tests/subscriptions/my`), start submissions (`POST /api/Submissions/test/{testId}`), save answers (`POST /api/Submissions/{id}/answers`), and finalize tests (`POST /api/Submissions/{id}/submit`).
- **Admin Endpoints (`/api/Tests` & `/api/Admin`)**: List pending tests awaiting review (`GET /api/Tests/pending`), approve/reject assessments with reason, list pending candidate subscriptions (`GET /api/Tests/subscriptions/pending`), and approve/reject subscription requests.

## Automated Testing Suite (xUnit)

Run automated unit and integration tests with `.NET CLI`:

```bash
cd Back-ASPNET
dotnet test
```

## Setup & Execution

1. Configure connection strings in `src/RecruitmentAuth.API/appsettings.json` (or `.env`).
2. Run database migrations:
   ```bash
   dotnet ef database update --project src/RecruitmentAuth.Infrastructure --startup-project src/RecruitmentAuth.API
   ```
3. Launch the API:
   ```bash
   dotnet run --project src/RecruitmentAuth.API
   ```
