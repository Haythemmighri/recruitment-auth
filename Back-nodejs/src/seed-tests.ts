import { PrismaClient, TestCategory, TestType, TestStatus, QuestionType, DifficultyLevel, Role, UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding tests for all 18 categories...');

  // Ensure recruiter user exists
  const passwordHash = await argon2.hash('Recruiter123!');
  const recruiter = await prisma.user.upsert({
    where: { email: 'recruiter@example.com' },
    update: {},
    create: {
      email: 'recruiter@example.com',
      firstName: 'Lead',
      lastName: 'Recruiter',
      passwordHash,
      role: Role.RECRUITER,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    },
  });

  const testsData = [
    {
      title: 'JavaScript & Python Coding Proficiency',
      description: 'Comprehensive test evaluating core coding, string manipulations, and basic algorithms in JS and Python.',
      category: TestCategory.CODING_PROGRAMMING,
      type: TestType.QCM,
      status: TestStatus.PUBLISHED,
      durationMinutes: 45,
      passingScore: 70,
      difficultyLevel: DifficultyLevel.MEDIUM,
      questions: [
        {
          content: 'What is the output of `typeof null` in JavaScript?',
          questionType: QuestionType.MCQ_SINGLE,
          points: 5,
          orderIndex: 0,
          options: JSON.stringify([
            { label: 'A', value: 'null', isCorrect: false },
            { label: 'B', value: 'object', isCorrect: true },
            { label: 'C', value: 'undefined', isCorrect: false },
            { label: 'D', value: 'string', isCorrect: false },
          ]),
        },
        {
          content: 'Which of the following array methods mutate the original array in JavaScript?',
          questionType: QuestionType.MCQ_MULTI,
          points: 10,
          orderIndex: 1,
          options: JSON.stringify([
            { label: 'push()', value: 'push()', isCorrect: true },
            { label: 'map()', value: 'map()', isCorrect: false },
            { label: 'splice()', value: 'splice()', isCorrect: true },
            { label: 'filter()', value: 'filter()', isCorrect: false },
          ]),
        },
      ],
    },
    {
      title: 'Data Structures & Algorithmic Complexity',
      description: 'Assess knowledge of Big-O analysis, Hash Tables, Trees, Graphs, and Sorting Algorithms.',
      category: TestCategory.DATA_STRUCTURES_ALGORITHMS,
      type: TestType.QCM,
      status: TestStatus.PUBLISHED,
      durationMinutes: 60,
      passingScore: 75,
      difficultyLevel: DifficultyLevel.HARD,
      questions: [
        {
          content: 'What is the average time complexity of searching in a balanced Binary Search Tree (BST)?',
          questionType: QuestionType.MCQ_SINGLE,
          points: 5,
          orderIndex: 0,
          options: JSON.stringify([
            { label: 'A', value: 'O(1)', isCorrect: false },
            { label: 'B', value: 'O(n)', isCorrect: false },
            { label: 'C', value: 'O(log n)', isCorrect: true },
            { label: 'D', value: 'O(n log n)', isCorrect: false },
          ]),
        },
      ],
    },
    {
      title: 'Async Operations & Memory Leak Debugging',
      description: 'Troubleshoot complex asynchronous code, unhandled rejections, and memory leaks.',
      category: TestCategory.DEBUGGING,
      type: TestType.PROBLEM_SOLVING,
      status: TestStatus.PUBLISHED,
      durationMinutes: 30,
      passingScore: 65,
      difficultyLevel: DifficultyLevel.MEDIUM,
      questions: [
        {
          content: 'Explain why unclosed event listeners cause memory leaks in Node.js applications.',
          questionType: QuestionType.LONG_ESSAY,
          points: 15,
          orderIndex: 0,
        },
      ],
    },
    {
      title: 'High-Availability System & Microservices Design',
      description: 'Design scalable microservices, load balancers, caching strategies, and message queues.',
      category: TestCategory.SYSTEM_DESIGN,
      type: TestType.COMPTE_RENDU,
      status: TestStatus.PUBLISHED,
      durationMinutes: 90,
      passingScore: 80,
      difficultyLevel: DifficultyLevel.HARD,
      questions: [
        {
          content: 'Design a URL shortener service (like bit.ly) capable of handling 100,000 requests per second.',
          questionType: QuestionType.LONG_ESSAY,
          points: 50,
          orderIndex: 0,
        },
      ],
    },
    {
      title: 'Advanced SQL Queries, Indexing & Transactions',
      description: 'Test relational database knowledge including JOINs, GROUP BY, B-Tree indexes, and ACID compliance.',
      category: TestCategory.DATABASE_SQL,
      type: TestType.QCM,
      status: TestStatus.PUBLISHED,
      durationMinutes: 40,
      passingScore: 70,
      difficultyLevel: DifficultyLevel.MEDIUM,
      questions: [
        {
          content: 'Which SQL keyword is used to filter records after aggregation with GROUP BY?',
          questionType: QuestionType.MCQ_SINGLE,
          points: 5,
          orderIndex: 0,
          options: JSON.stringify([
            { label: 'A', value: 'WHERE', isCorrect: false },
            { label: 'B', value: 'HAVING', isCorrect: true },
            { label: 'C', value: 'ORDER BY', isCorrect: false },
            { label: 'D', value: 'FILTER', isCorrect: false },
          ]),
        },
      ],
    },
    {
      title: 'Object-Oriented Design & SOLID Principles',
      description: 'Evaluate understanding of OOP design principles, encapsulation, polymorphism, and SOLID rules.',
      category: TestCategory.OOP,
      type: TestType.QCM,
      status: TestStatus.PUBLISHED,
      durationMinutes: 30,
      passingScore: 60,
      difficultyLevel: DifficultyLevel.EASY,
      questions: [
        {
          content: 'The "L" in SOLID design principles stands for which rule?',
          questionType: QuestionType.MCQ_SINGLE,
          points: 5,
          orderIndex: 0,
          options: JSON.stringify([
            { label: 'A', value: 'Linear Dependency Principle', isCorrect: false },
            { label: 'B', value: 'Liskov Substitution Principle', isCorrect: true },
            { label: 'C', value: 'Lazy Loading Principle', isCorrect: false },
            { label: 'D', value: 'Layered Abstraction Principle', isCorrect: false },
          ]),
        },
      ],
    },
    {
      title: 'Modern Web Frameworks (React, Angular, NestJS)',
      description: 'Assess proficiency in modern component-driven architectures and reactive state management.',
      category: TestCategory.FRAMEWORK_TECHNOLOGY,
      type: TestType.QCM,
      status: TestStatus.PUBLISHED,
      durationMinutes: 45,
      passingScore: 70,
      difficultyLevel: DifficultyLevel.MEDIUM,
      questions: [
        {
          content: 'In React, which hook should be used for side effects like data fetching?',
          questionType: QuestionType.MCQ_SINGLE,
          points: 5,
          orderIndex: 0,
          options: JSON.stringify([
            { label: 'A', value: 'useState', isCorrect: false },
            { label: 'B', value: 'useEffect', isCorrect: true },
            { label: 'C', value: 'useMemo', isCorrect: false },
            { label: 'D', value: 'useContext', isCorrect: false },
          ]),
        },
      ],
    },
    {
      title: 'RESTful API & GraphQL Architecture',
      description: 'Evaluate API design standards, HTTP status codes, GraphQL schemas, and rate limiting.',
      category: TestCategory.API_DEVELOPMENT,
      type: TestType.QCM,
      status: TestStatus.PUBLISHED,
      durationMinutes: 35,
      passingScore: 70,
      difficultyLevel: DifficultyLevel.EASY,
      questions: [
        {
          content: 'Which HTTP status code represents "201 Created"?',
          questionType: QuestionType.MCQ_SINGLE,
          points: 5,
          orderIndex: 0,
          options: JSON.stringify([
            { label: 'A', value: 'Successful resource creation', isCorrect: true },
            { label: 'B', value: 'Bad Request', isCorrect: false },
            { label: 'C', value: 'Unauthorized access', isCorrect: false },
            { label: 'D', value: 'Resource moved permanently', isCorrect: false },
          ]),
        },
      ],
    },
    {
      title: 'Containerization (Docker, K8s) & CI/CD Pipelines',
      description: 'Test skills in Dockerization, Kubernetes pod deployments, Helm, and GitHub Actions.',
      category: TestCategory.CLOUD_DEVOPS,
      type: TestType.QCM,
      status: TestStatus.PUBLISHED,
      durationMinutes: 45,
      passingScore: 75,
      difficultyLevel: DifficultyLevel.MEDIUM,
      questions: [
        {
          content: 'Which Docker command creates and runs a container from an image?',
          questionType: QuestionType.MCQ_SINGLE,
          points: 5,
          orderIndex: 0,
          options: JSON.stringify([
            { label: 'A', value: 'docker build', isCorrect: false },
            { label: 'B', value: 'docker run', isCorrect: true },
            { label: 'C', value: 'docker create', isCorrect: false },
            { label: 'D', value: 'docker exec', isCorrect: false },
          ]),
        },
      ],
    },
    {
      title: 'Git Workflow & Merge Conflict Resolution',
      description: 'Test knowledge of Git branching models (GitFlow, Trunk-based), rebasing, and cherry-picking.',
      category: TestCategory.VERSION_CONTROL,
      type: TestType.QCM,
      status: TestStatus.PUBLISHED,
      durationMinutes: 25,
      passingScore: 70,
      difficultyLevel: DifficultyLevel.EASY,
      questions: [
        {
          content: 'What is the primary difference between `git merge` and `git rebase`?',
          questionType: QuestionType.MCQ_SINGLE,
          points: 10,
          orderIndex: 0,
          options: JSON.stringify([
            { label: 'A', value: 'Rebase rewrites commit history while merge preserves it with a merge commit', isCorrect: true },
            { label: 'B', value: 'Merge is only for remote repositories', isCorrect: false },
            { label: 'C', value: 'Rebase deletes the original branch', isCorrect: false },
            { label: 'D', value: 'There is no difference', isCorrect: false },
          ]),
        },
      ],
    },
    {
      title: 'Automated Unit, Integration & E2E Testing',
      description: 'Test experience with TDD, Jest, Cypress, mocking dependencies, and code coverage metrics.',
      category: TestCategory.TESTING_QA,
      type: TestType.QCM,
      status: TestStatus.PUBLISHED,
      durationMinutes: 30,
      passingScore: 70,
      difficultyLevel: DifficultyLevel.MEDIUM,
      questions: [
        {
          content: 'Unit testing should test components in isolation without external database calls.',
          questionType: QuestionType.TRUE_FALSE,
          points: 5,
          orderIndex: 0,
          options: JSON.stringify([
            { label: 'True', value: 'true', isCorrect: true },
            { label: 'False', value: 'false', isCorrect: false },
          ]),
        },
      ],
    },
    {
      title: 'Web Security (OWASP Top 10, JWT & Encryption)',
      description: 'Evaluate knowledge of XSS, CSRF, SQL Injection, JWT secret handling, and HTTPS headers.',
      category: TestCategory.SECURITY,
      type: TestType.QCM,
      status: TestStatus.PUBLISHED,
      durationMinutes: 40,
      passingScore: 80,
      difficultyLevel: DifficultyLevel.HARD,
      questions: [
        {
          content: 'Which security header helps mitigate Cross-Site Scripting (XSS) attacks by controlling resource loading?',
          questionType: QuestionType.MCQ_SINGLE,
          points: 5,
          orderIndex: 0,
          options: JSON.stringify([
            { label: 'A', value: 'Content-Security-Policy', isCorrect: true },
            { label: 'B', value: 'Strict-Transport-Security', isCorrect: false },
            { label: 'C', value: 'X-Frame-Options', isCorrect: false },
            { label: 'D', value: 'Access-Control-Allow-Origin', isCorrect: false },
          ]),
        },
      ],
    },
    {
      title: 'Web Vitals & Redis Backend Caching',
      description: 'Optimize frontend load performance, bundle splitting, Redis cache strategies, and indexing.',
      category: TestCategory.PERFORMANCE_OPTIMIZATION,
      type: TestType.QCM,
      status: TestStatus.PUBLISHED,
      durationMinutes: 35,
      passingScore: 70,
      difficultyLevel: DifficultyLevel.MEDIUM,
      questions: [
        {
          content: 'Which cache invalidation strategy updates the cache whenever the underlying database record is updated?',
          questionType: QuestionType.MCQ_SINGLE,
          points: 5,
          orderIndex: 0,
          options: JSON.stringify([
            { label: 'A', value: 'Cache-Aside / Write-Through', isCorrect: true },
            { label: 'B', value: 'Lazy Loading', isCorrect: false },
            { label: 'C', value: 'TTL Expiration Only', isCorrect: false },
            { label: 'D', value: 'Read-Through', isCorrect: false },
          ]),
        },
      ],
    },
    {
      title: 'PR Review & Refactoring Best Practices',
      description: 'Identify anti-patterns, code smells, duplicate logic, and offer constructive PR reviews.',
      category: TestCategory.CODE_REVIEW,
      type: TestType.PROBLEM_SOLVING,
      status: TestStatus.PUBLISHED,
      durationMinutes: 30,
      passingScore: 65,
      difficultyLevel: DifficultyLevel.MEDIUM,
      questions: [
        {
          content: 'Identify three code smells in a function that contains 15 nested IF statements and 500 lines of code.',
          questionType: QuestionType.LONG_ESSAY,
          points: 15,
          orderIndex: 0,
        },
      ],
    },
    {
      title: 'Full-Stack Application Architecture Project',
      description: 'Real-world project challenge building an end-to-end authentication and task management service.',
      category: TestCategory.PROJECT_BASED,
      type: TestType.COMPTE_RENDU,
      status: TestStatus.PUBLISHED,
      durationMinutes: 120,
      passingScore: 75,
      difficultyLevel: DifficultyLevel.HARD,
      questions: [
        {
          content: 'Submit your architectural documentation and ZIP archive containing source code for the full-stack project.',
          questionType: QuestionType.FILE_UPLOAD,
          points: 50,
          orderIndex: 0,
        },
      ],
    },
    {
      title: 'General Computer Science & IT Fundamentals',
      description: 'Covers operating systems, networking (TCP/IP, HTTP), bitwise operations, and boolean logic.',
      category: TestCategory.TECHNICAL_QUIZ,
      type: TestType.QCM,
      status: TestStatus.PUBLISHED,
      durationMinutes: 30,
      passingScore: 60,
      difficultyLevel: DifficultyLevel.EASY,
      questions: [
        {
          content: 'HTTP is a stateless protocol.',
          questionType: QuestionType.TRUE_FALSE,
          points: 5,
          orderIndex: 0,
          options: JSON.stringify([
            { label: 'True', value: 'true', isCorrect: true },
            { label: 'False', value: 'false', isCorrect: false },
          ]),
        },
      ],
    },
    {
      title: 'Algorithmic Logic & Pattern Recognition',
      description: 'Test analytical reasoning, sequence patterns, and logical problem solving speed.',
      category: TestCategory.PROBLEM_SOLVING_LOGIC,
      type: TestType.PROBLEM_SOLVING,
      status: TestStatus.PUBLISHED,
      durationMinutes: 30,
      passingScore: 70,
      difficultyLevel: DifficultyLevel.MEDIUM,
      questions: [
        {
          content: 'What is the next number in the Fibonacci sequence: 1, 1, 2, 3, 5, 8, 13, ?',
          questionType: QuestionType.NUMERICAL,
          points: 5,
          orderIndex: 0,
          numericalMin: 21,
          numericalMax: 21,
        },
      ],
    },
    {
      title: 'Agile Technical Teamwork & Stakeholder Comm',
      description: 'Evaluate technical communication, resolving requirements conflicts, and sprint planning.',
      category: TestCategory.COMMUNICATION_COLLABORATION,
      type: TestType.OTHER,
      status: TestStatus.PUBLISHED,
      durationMinutes: 30,
      passingScore: 65,
      difficultyLevel: DifficultyLevel.EASY,
      questions: [
        {
          content: 'Describe how you handle a situation where a client requests a major scope change 2 days before sprint release.',
          questionType: QuestionType.LONG_ESSAY,
          points: 20,
          orderIndex: 0,
        },
      ],
    },
  ];

  for (const tData of testsData) {
    const { questions, ...testInfo } = tData;

    // Create test if not already present by title
    const existing = await prisma.test.findFirst({
      where: { title: testInfo.title },
    });

    if (!existing) {
      const createdTest = await prisma.test.create({
        data: {
          ...testInfo,
          recruiterId: recruiter.id,
        },
      });

      for (const q of questions) {
        await prisma.question.create({
          data: {
            ...q,
            testId: createdTest.id,
          },
        });
      }
      console.log(`Created test: [${testInfo.category}] - ${testInfo.title}`);
    } else {
      console.log(`Skipped existing test: ${testInfo.title}`);
    }
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
