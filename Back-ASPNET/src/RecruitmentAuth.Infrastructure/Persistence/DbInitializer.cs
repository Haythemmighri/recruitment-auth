using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecruitmentAuth.Domain.Entities;
using RecruitmentAuth.Domain.Enums;

namespace RecruitmentAuth.Infrastructure.Persistence;

public static class DbInitializer
{
    public static async Task SeedAsync(RecruitmentAuthContext context)
    {
        await context.Database.EnsureCreatedAsync();

        var recruiter = await context.Users.FirstOrDefaultAsync(u => u.Email == "recruiter@example.com");
        if (recruiter == null)
        {
            recruiter = new User
            {
                Id = Guid.NewGuid().ToString(),
                FirstName = "Lead",
                LastName = "Recruiter",
                Email = "recruiter@example.com",
                Role = "RECRUITER",
                Status = "ACTIVE",
                IsEmailVerified = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            context.Users.Add(recruiter);
            await context.SaveChangesAsync();
        }

        var testsData = new[]
        {
            new { Title = "JavaScript & Python Coding Proficiency", Description = "Comprehensive test evaluating core coding, string manipulations, and basic algorithms in JS and Python.", Category = TestCategory.CODING_PROGRAMMING, Type = TestType.QCM, Status = TestStatus.PUBLISHED, DurationMinutes = (int?)45 },
            new { Title = "Data Structures & Algorithmic Complexity", Description = "Assess knowledge of Big-O analysis, Hash Tables, Trees, Graphs, and Sorting Algorithms.", Category = TestCategory.DATA_STRUCTURES_ALGORITHMS, Type = TestType.QCM, Status = TestStatus.PUBLISHED, DurationMinutes = (int?)60 },
            new { Title = "Async Operations & Memory Leak Debugging", Description = "Troubleshoot complex asynchronous code, unhandled rejections, and memory leaks.", Category = TestCategory.DEBUGGING, Type = TestType.PROBLEM_SOLVING, Status = TestStatus.PUBLISHED, DurationMinutes = (int?)30 },
            new { Title = "High-Availability System & Microservices Design", Description = "Design scalable microservices, load balancers, caching strategies, and message queues.", Category = TestCategory.SYSTEM_DESIGN, Type = TestType.COMPTE_RENDU, Status = TestStatus.PUBLISHED, DurationMinutes = (int?)90 },
            new { Title = "Advanced SQL Queries, Indexing & Transactions", Description = "Test relational database knowledge including JOINs, GROUP BY, B-Tree indexes, and ACID compliance.", Category = TestCategory.DATABASE_SQL, Type = TestType.QCM, Status = TestStatus.PUBLISHED, DurationMinutes = (int?)40 },
            new { Title = "Object-Oriented Design & SOLID Principles", Description = "Evaluate understanding of OOP design principles, encapsulation, polymorphism, and SOLID rules.", Category = TestCategory.OOP, Type = TestType.QCM, Status = TestStatus.PUBLISHED, DurationMinutes = (int?)30 },
            new { Title = "Modern Web Frameworks (React, Angular, NestJS)", Description = "Assess proficiency in modern component-driven architectures and reactive state management.", Category = TestCategory.FRAMEWORK_TECHNOLOGY, Type = TestType.QCM, Status = TestStatus.PUBLISHED, DurationMinutes = (int?)45 },
            new { Title = "RESTful API & GraphQL Architecture", Description = "Evaluate API design standards, HTTP status codes, GraphQL schemas, and rate limiting.", Category = TestCategory.API_DEVELOPMENT, Type = TestType.QCM, Status = TestStatus.PUBLISHED, DurationMinutes = (int?)35 },
            new { Title = "Containerization (Docker, K8s) & CI/CD Pipelines", Description = "Test skills in Dockerization, Kubernetes pod deployments, Helm, and GitHub Actions.", Category = TestCategory.CLOUD_DEVOPS, Type = TestType.QCM, Status = TestStatus.PUBLISHED, DurationMinutes = (int?)45 },
            new { Title = "Git Workflow & Merge Conflict Resolution", Description = "Test knowledge of Git branching models (GitFlow, Trunk-based), rebasing, and cherry-picking.", Category = TestCategory.VERSION_CONTROL, Type = TestType.QCM, Status = TestStatus.PUBLISHED, DurationMinutes = (int?)25 },
            new { Title = "Automated Unit, Integration & E2E Testing", Description = "Test experience with TDD, Jest, Cypress, mocking dependencies, and code coverage metrics.", Category = TestCategory.TESTING_QA, Type = TestType.QCM, Status = TestStatus.PUBLISHED, DurationMinutes = (int?)30 },
            new { Title = "Web Security (OWASP Top 10, JWT & Encryption)", Description = "Evaluate knowledge of XSS, CSRF, SQL Injection, JWT secret handling, and HTTPS headers.", Category = TestCategory.SECURITY, Type = TestType.QCM, Status = TestStatus.PUBLISHED, DurationMinutes = (int?)40 },
            new { Title = "Web Vitals & Redis Backend Caching", Description = "Optimize frontend load performance, bundle splitting, Redis cache strategies, and indexing.", Category = TestCategory.PERFORMANCE_OPTIMIZATION, Type = TestType.QCM, Status = TestStatus.PUBLISHED, DurationMinutes = (int?)35 },
            new { Title = "PR Review & Refactoring Best Practices", Description = "Identify anti-patterns, code smells, duplicate logic, and offer constructive PR reviews.", Category = TestCategory.CODE_REVIEW, Type = TestType.PROBLEM_SOLVING, Status = TestStatus.PUBLISHED, DurationMinutes = (int?)30 },
            new { Title = "Full-Stack Application Architecture Project", Description = "Real-world project challenge building an end-to-end authentication and task management service.", Category = TestCategory.PROJECT_BASED, Type = TestType.COMPTE_RENDU, Status = TestStatus.PUBLISHED, DurationMinutes = (int?)120 },
            new { Title = "General Computer Science & IT Fundamentals", Description = "Covers operating systems, networking (TCP/IP, HTTP), bitwise operations, and boolean logic.", Category = TestCategory.TECHNICAL_QUIZ, Type = TestType.QCM, Status = TestStatus.PUBLISHED, DurationMinutes = (int?)30 },
            new { Title = "Algorithmic Logic & Pattern Recognition", Description = "Test analytical reasoning, sequence patterns, and logical problem solving speed.", Category = TestCategory.PROBLEM_SOLVING_LOGIC, Type = TestType.PROBLEM_SOLVING, Status = TestStatus.PUBLISHED, DurationMinutes = (int?)30 },
            new { Title = "Agile Technical Teamwork & Stakeholder Comm", Description = "Evaluate technical communication, resolving requirements conflicts, and sprint planning.", Category = TestCategory.COMMUNICATION_COLLABORATION, Type = TestType.OTHER, Status = TestStatus.PUBLISHED, DurationMinutes = (int?)30 }
        };

        foreach (var t in testsData)
        {
            var existing = await context.Tests.FirstOrDefaultAsync(x => x.Title == t.Title);
            if (existing == null)
            {
                var test = new Test
                {
                    Id = Guid.NewGuid().ToString(),
                    RecruiterId = recruiter.Id,
                    Title = t.Title,
                    Description = t.Description,
                    Category = t.Category,
                    Type = t.Type,
                    Status = t.Status,
                    DurationMinutes = t.DurationMinutes,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                context.Tests.Add(test);
                await context.SaveChangesAsync();

                var question = new Question
                {
                    Id = Guid.NewGuid().ToString(),
                    TestId = test.Id,
                    Content = $"Sample assessment question for {t.Title}",
                    Points = 10,
                    OrderIndex = 0,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                context.Questions.Add(question);
                await context.SaveChangesAsync();
            }
        }
    }
}
