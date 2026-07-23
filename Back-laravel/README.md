<p align="center"><a href="https://laravel.com" target="_blank"><img src="https://raw.githubusercontent.com/laravel/art/master/logo-lockup/5%20SVG/2%20CMYK/1%20Full%20Color/laravel-logolockup-cmyk-red.svg" width="400" alt="Laravel Logo"></a></p>

<p align="center">
<a href="https://github.com/laravel/framework/actions"><img src="https://github.com/laravel/framework/workflows/tests/badge.svg" alt="Build Status"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/dt/laravel/framework" alt="Total Downloads"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/v/laravel/framework" alt="Latest Stable Version"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/l/laravel/framework" alt="License"></a>
</p>

# Recruitment Authentication Platform — Laravel 13 Implementation

This directory contains the **Laravel 13** (PHP 8.3) implementation of the Recruitment Authentication and Skill Testing Platform.

## Architecture & Design Patterns
- **Pattern**: MVC (Model-View-Controller) with decoupled `Service` layers (`TestService`, `UserService`, `AuthService`) and `FormRequest` validation.
- **ORM**: Eloquent ORM with typed model relations (`Test`, `Question`, `TestSubmission`, `QuestionAnswer`, `TestSubscription`).
- **Security**: JWT Authentication via `tymon/jwt-auth`, 2FA via Google Authenticator (`pragmarx/google2fa-laravel`), Redis session tracking, CSRF protection, and Argon2id password hashing.

## Recruitment Assessment & Skill Testing Module
- **Recruiter Endpoints**: Create and manage assessments (`POST /api/recruiter/tests`), configure question types (MCQ, Essay, Code, etc.), update tests, submit tests for admin review (`POST /api/recruiter/tests/{id}/submit-for-review`), view submissions, and grade candidates (`PATCH /api/recruiter/submissions/{id}/grade`).
- **Candidate Endpoints**: Browse published assessments (`GET /api/candidate/tests`), subscribe to tests (`POST /api/candidate/tests/{id}/subscribe`), start test submissions (`POST /api/candidate/tests/{id}/submissions`), save answers in progress, and finalize submissions (`POST /api/candidate/submissions/{id}/submit`).
- **Admin Endpoints**: Review pending tests (`GET /api/admin/tests/pending`), approve/reject assessments, and manage pending candidate subscriptions.

## Automated Testing Suite (PHPUnit)

Run automated unit and feature test suites with PHPUnit:

```bash
php artisan test
# or
./vendor/bin/phpunit
```

---

## About Laravel

Laravel is a web application framework with expressive, elegant syntax. We believe development must be an enjoyable and creative experience to be truly fulfilling. Laravel takes the pain out of development by easing common tasks used in many web projects.

## Learning Laravel

Laravel has the most extensive and thorough [documentation](https://laravel.com/docs) and video tutorial library of all modern web application frameworks, making it a breeze to get started with the framework.

In addition, [Laracasts](https://laracasts.com) contains thousands of video tutorials on a range of topics including Laravel, modern PHP, unit testing, and JavaScript. Boost your skills by digging into our comprehensive video library.

You can also watch bite-sized lessons with real-world projects on [Laravel Learn](https://laravel.com/learn), where you will be guided through building a Laravel application from scratch while learning PHP fundamentals.

## Agentic Development

Laravel's predictable structure and conventions make it ideal for AI coding agents like Claude Code, Cursor, and GitHub Copilot. Install [Laravel Boost](https://laravel.com/docs/ai) to supercharge your AI workflow:

```bash
composer require laravel/boost --dev

php artisan boost:install
```

Boost provides your agent 15+ tools and skills that help agents build Laravel applications while following best practices.

## Contributing

Thank you for considering contributing to the Laravel framework! The contribution guide can be found in the [Laravel documentation](https://laravel.com/docs/contributions).

## Code of Conduct

In order to ensure that the Laravel community is welcoming to all, please review and abide by the [Code of Conduct](https://laravel.com/docs/contributions#code-of-conduct).

## Security Vulnerabilities

If you discover a security vulnerability within Laravel, please send an e-mail to Taylor Otwell via [taylor@laravel.com](mailto:taylor@laravel.com). All security vulnerabilities will be promptly addressed.

## License

The Laravel framework is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).
