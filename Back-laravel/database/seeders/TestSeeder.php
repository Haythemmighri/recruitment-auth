<?php

namespace Database\Seeders;

use App\Models\Test;
use App\Models\Question;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Hash;

class TestSeeder extends Seeder
{
    public function run(): void
    {
        $recruiter = User::firstOrCreate(
            ['email' => 'recruiter@example.com'],
            [
                'id' => (string) Str::uuid(),
                'first_name' => 'Lead',
                'last_name' => 'Recruiter',
                'password_hash' => Hash::make('Recruiter123!'),
                'role' => 'RECRUITER',
                'status' => 'ACTIVE',
                'is_email_verified' => true,
            ]
        );

        $testsData = [
            [
                'title' => 'JavaScript & Python Coding Proficiency',
                'description' => 'Comprehensive test evaluating core coding, string manipulations, and basic algorithms in JS and Python.',
                'category' => 'CODING_PROGRAMMING',
                'type' => 'QCM',
                'status' => 'PUBLISHED',
                'duration_minutes' => 45,
                'questions' => [
                    [
                        'content' => 'What is the output of `typeof null` in JavaScript?',
                        'points' => 5,
                        'order_index' => 0,
                        'options' => [
                            ['label' => 'A', 'value' => 'null', 'isCorrect' => false],
                            ['label' => 'B', 'value' => 'object', 'isCorrect' => true],
                            ['label' => 'C', 'value' => 'undefined', 'isCorrect' => false],
                            ['label' => 'D', 'value' => 'string', 'isCorrect' => false],
                        ],
                    ],
                ],
            ],
            [
                'title' => 'Data Structures & Algorithmic Complexity',
                'description' => 'Assess knowledge of Big-O analysis, Hash Tables, Trees, Graphs, and Sorting Algorithms.',
                'category' => 'DATA_STRUCTURES_ALGORITHMS',
                'type' => 'QCM',
                'status' => 'PUBLISHED',
                'duration_minutes' => 60,
                'questions' => [
                    [
                        'content' => 'What is the average time complexity of searching in a balanced Binary Search Tree (BST)?',
                        'points' => 5,
                        'order_index' => 0,
                        'options' => [
                            ['label' => 'A', 'value' => 'O(1)', 'isCorrect' => false],
                            ['label' => 'B', 'value' => 'O(n)', 'isCorrect' => false],
                            ['label' => 'C', 'value' => 'O(log n)', 'isCorrect' => true],
                            ['label' => 'D', 'value' => 'O(n log n)', 'isCorrect' => false],
                        ],
                    ],
                ],
            ],
            [
                'title' => 'Async Operations & Memory Leak Debugging',
                'description' => 'Troubleshoot complex asynchronous code, unhandled rejections, and memory leaks.',
                'category' => 'DEBUGGING',
                'type' => 'PROBLEM_SOLVING',
                'status' => 'PUBLISHED',
                'duration_minutes' => 30,
                'questions' => [
                    [
                        'content' => 'Explain why unclosed event listeners cause memory leaks in Node.js applications.',
                        'points' => 15,
                        'order_index' => 0,
                    ],
                ],
            ],
            [
                'title' => 'High-Availability System & Microservices Design',
                'description' => 'Design scalable microservices, load balancers, caching strategies, and message queues.',
                'category' => 'SYSTEM_DESIGN',
                'type' => 'COMPTE_RENDU',
                'status' => 'PUBLISHED',
                'duration_minutes' => 90,
                'questions' => [
                    [
                        'content' => 'Design a URL shortener service capable of handling 100,000 requests per second.',
                        'points' => 50,
                        'order_index' => 0,
                    ],
                ],
            ],
            [
                'title' => 'Advanced SQL Queries, Indexing & Transactions',
                'description' => 'Test relational database knowledge including JOINs, GROUP BY, B-Tree indexes, and ACID compliance.',
                'category' => 'DATABASE_SQL',
                'type' => 'QCM',
                'status' => 'PUBLISHED',
                'duration_minutes' => 40,
                'questions' => [
                    [
                        'content' => 'Which SQL keyword is used to filter records after aggregation with GROUP BY?',
                        'points' => 5,
                        'order_index' => 0,
                        'options' => [
                            ['label' => 'A', 'value' => 'WHERE', 'isCorrect' => false],
                            ['label' => 'B', 'value' => 'HAVING', 'isCorrect' => true],
                            ['label' => 'C', 'value' => 'ORDER BY', 'isCorrect' => false],
                        ],
                    ],
                ],
            ],
            [
                'title' => 'Object-Oriented Design & SOLID Principles',
                'description' => 'Evaluate understanding of OOP design principles, encapsulation, polymorphism, and SOLID rules.',
                'category' => 'OOP',
                'type' => 'QCM',
                'status' => 'PUBLISHED',
                'duration_minutes' => 30,
                'questions' => [
                    [
                        'content' => 'The "L" in SOLID design principles stands for which rule?',
                        'points' => 5,
                        'order_index' => 0,
                        'options' => [
                            ['label' => 'A', 'value' => 'Liskov Substitution Principle', 'isCorrect' => true],
                            ['label' => 'B', 'value' => 'Lazy Loading Principle', 'isCorrect' => false],
                        ],
                    ],
                ],
            ],
            [
                'title' => 'Modern Web Frameworks (React, Angular, NestJS)',
                'description' => 'Assess proficiency in modern component-driven architectures and reactive state management.',
                'category' => 'FRAMEWORK_TECHNOLOGY',
                'type' => 'QCM',
                'status' => 'PUBLISHED',
                'duration_minutes' => 45,
                'questions' => [
                    [
                        'content' => 'In React, which hook should be used for side effects like data fetching?',
                        'points' => 5,
                        'order_index' => 0,
                        'options' => [
                            ['label' => 'A', 'value' => 'useState', 'isCorrect' => false],
                            ['label' => 'B', 'value' => 'useEffect', 'isCorrect' => true],
                        ],
                    ],
                ],
            ],
            [
                'title' => 'RESTful API & GraphQL Architecture',
                'description' => 'Evaluate API design standards, HTTP status codes, GraphQL schemas, and rate limiting.',
                'category' => 'API_DEVELOPMENT',
                'type' => 'QCM',
                'status' => 'PUBLISHED',
                'duration_minutes' => 35,
                'questions' => [
                    [
                        'content' => 'Which HTTP status code represents "201 Created"?',
                        'points' => 5,
                        'order_index' => 0,
                        'options' => [
                            ['label' => 'A', 'value' => 'Successful resource creation', 'isCorrect' => true],
                            ['label' => 'B', 'value' => 'Bad Request', 'isCorrect' => false],
                        ],
                    ],
                ],
            ],
            [
                'title' => 'Containerization (Docker, K8s) & CI/CD Pipelines',
                'description' => 'Test skills in Dockerization, Kubernetes pod deployments, Helm, and GitHub Actions.',
                'category' => 'CLOUD_DEVOPS',
                'type' => 'QCM',
                'status' => 'PUBLISHED',
                'duration_minutes' => 45,
                'questions' => [
                    [
                        'content' => 'Which Docker command creates and runs a container from an image?',
                        'points' => 5,
                        'order_index' => 0,
                        'options' => [
                            ['label' => 'A', 'value' => 'docker build', 'isCorrect' => false],
                            ['label' => 'B', 'value' => 'docker run', 'isCorrect' => true],
                        ],
                    ],
                ],
            ],
            [
                'title' => 'Git Workflow & Merge Conflict Resolution',
                'description' => 'Test knowledge of Git branching models (GitFlow, Trunk-based), rebasing, and cherry-picking.',
                'category' => 'VERSION_CONTROL',
                'type' => 'QCM',
                'status' => 'PUBLISHED',
                'duration_minutes' => 25,
                'questions' => [
                    [
                        'content' => 'What is the primary difference between `git merge` and `git rebase`?',
                        'points' => 10,
                        'order_index' => 0,
                        'options' => [
                            ['label' => 'A', 'value' => 'Rebase rewrites history, merge preserves history', 'isCorrect' => true],
                            ['label' => 'B', 'value' => 'Merge is only for remote repositories', 'isCorrect' => false],
                        ],
                    ],
                ],
            ],
            [
                'title' => 'Automated Unit, Integration & E2E Testing',
                'description' => 'Test experience with TDD, Jest, Cypress, mocking dependencies, and code coverage metrics.',
                'category' => 'TESTING_QA',
                'type' => 'QCM',
                'status' => 'PUBLISHED',
                'duration_minutes' => 30,
                'questions' => [
                    [
                        'content' => 'Unit testing should test components in isolation without external database calls.',
                        'points' => 5,
                        'order_index' => 0,
                        'options' => [
                            ['label' => 'True', 'value' => 'true', 'isCorrect' => true],
                            ['label' => 'False', 'value' => 'false', 'isCorrect' => false],
                        ],
                    ],
                ],
            ],
            [
                'title' => 'Web Security (OWASP Top 10, JWT & Encryption)',
                'description' => 'Evaluate knowledge of XSS, CSRF, SQL Injection, JWT secret handling, and HTTPS headers.',
                'category' => 'SECURITY',
                'type' => 'QCM',
                'status' => 'PUBLISHED',
                'duration_minutes' => 40,
                'questions' => [
                    [
                        'content' => 'Which security header helps mitigate Cross-Site Scripting (XSS) attacks?',
                        'points' => 5,
                        'order_index' => 0,
                        'options' => [
                            ['label' => 'A', 'value' => 'Content-Security-Policy', 'isCorrect' => true],
                            ['label' => 'B', 'value' => 'X-Frame-Options', 'isCorrect' => false],
                        ],
                    ],
                ],
            ],
            [
                'title' => 'Web Vitals & Redis Backend Caching',
                'description' => 'Optimize frontend load performance, bundle splitting, Redis cache strategies, and indexing.',
                'category' => 'PERFORMANCE_OPTIMIZATION',
                'type' => 'QCM',
                'status' => 'PUBLISHED',
                'duration_minutes' => 35,
                'questions' => [
                    [
                        'content' => 'Which cache invalidation strategy updates the cache whenever database records update?',
                        'points' => 5,
                        'order_index' => 0,
                        'options' => [
                            ['label' => 'A', 'value' => 'Cache-Aside / Write-Through', 'isCorrect' => true],
                            ['label' => 'B', 'value' => 'Read-Through', 'isCorrect' => false],
                        ],
                    ],
                ],
            ],
            [
                'title' => 'PR Review & Refactoring Best Practices',
                'description' => 'Identify anti-patterns, code smells, duplicate logic, and offer constructive PR reviews.',
                'category' => 'CODE_REVIEW',
                'type' => 'PROBLEM_SOLVING',
                'status' => 'PUBLISHED',
                'duration_minutes' => 30,
                'questions' => [
                    [
                        'content' => 'Identify three code smells in a function that contains 15 nested IF statements.',
                        'points' => 15,
                        'order_index' => 0,
                    ],
                ],
            ],
            [
                'title' => 'Full-Stack Application Architecture Project',
                'description' => 'Real-world project challenge building an end-to-end authentication and task management service.',
                'category' => 'PROJECT_BASED',
                'type' => 'COMPTE_RENDU',
                'status' => 'PUBLISHED',
                'duration_minutes' => 120,
                'questions' => [
                    [
                        'content' => 'Submit your architectural documentation and source code project ZIP archive.',
                        'points' => 50,
                        'order_index' => 0,
                    ],
                ],
            ],
            [
                'title' => 'General Computer Science & IT Fundamentals',
                'description' => 'Covers operating systems, networking (TCP/IP, HTTP), bitwise operations, and boolean logic.',
                'category' => 'TECHNICAL_QUIZ',
                'type' => 'QCM',
                'status' => 'PUBLISHED',
                'duration_minutes' => 30,
                'questions' => [
                    [
                        'content' => 'HTTP is a stateless protocol.',
                        'points' => 5,
                        'order_index' => 0,
                        'options' => [
                            ['label' => 'True', 'value' => 'true', 'isCorrect' => true],
                            ['label' => 'False', 'value' => 'false', 'isCorrect' => false],
                        ],
                    ],
                ],
            ],
            [
                'title' => 'Algorithmic Logic & Pattern Recognition',
                'description' => 'Test analytical reasoning, sequence patterns, and logical problem solving speed.',
                'category' => 'PROBLEM_SOLVING_LOGIC',
                'type' => 'PROBLEM_SOLVING',
                'status' => 'PUBLISHED',
                'duration_minutes' => 30,
                'questions' => [
                    [
                        'content' => 'What is the next number in the Fibonacci sequence: 1, 1, 2, 3, 5, 8, 13, ?',
                        'points' => 5,
                        'order_index' => 0,
                    ],
                ],
            ],
            [
                'title' => 'Agile Technical Teamwork & Stakeholder Comm',
                'description' => 'Evaluate technical communication, resolving requirements conflicts, and sprint planning.',
                'category' => 'COMMUNICATION_COLLABORATION',
                'type' => 'OTHER',
                'status' => 'PUBLISHED',
                'duration_minutes' => 30,
                'questions' => [
                    [
                        'content' => 'Describe how you handle a situation where a client requests a major scope change 2 days before release.',
                        'points' => 20,
                        'order_index' => 0,
                    ],
                ],
            ],
        ];

        foreach ($testsData as $tData) {
            $questions = $tData['questions'];
            unset($tData['questions']);

            $test = Test::firstOrCreate(
                ['title' => $tData['title']],
                array_merge($tData, ['recruiter_id' => $recruiter->id])
            );

            foreach ($questions as $q) {
                Question::firstOrCreate(
                    [
                        'test_id' => $test->id,
                        'content' => $q['content'],
                    ],
                    [
                        'points' => $q['points'],
                        'order_index' => $q['order_index'],
                        'options' => $q['options'] ?? null,
                    ]
                );
            }
        }
    }
}
