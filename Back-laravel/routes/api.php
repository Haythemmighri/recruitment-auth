<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Auth\TwoFactorController;
use App\Http\Controllers\Auth\OAuthController;
use App\Http\Controllers\User\UserController;
use App\Http\Controllers\Admin\AdminController;
use App\Http\Controllers\Test\TestController;
use App\Http\Controllers\Test\QuestionController;
use App\Http\Controllers\Test\SubmissionController;

Route::get('/csrf-token', [AuthController::class, 'getCsrfToken']);

Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/refresh', [AuthController::class, 'refreshToken']);
    Route::post('/oauth-token-exchange', [AuthController::class, 'oauthTokenExchange']);
    
    Route::get('/verify-email', [AuthController::class, 'verifyEmail']);
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/reset-password', [AuthController::class, 'resetPassword']);

    // 2FA Routes
    Route::prefix('2fa')->group(function () {
        Route::middleware('auth.jwt')->group(function () {
            Route::post('/setup', [TwoFactorController::class, 'setup']);
            Route::post('/enable', [TwoFactorController::class, 'enable']);
            Route::post('/disable', [TwoFactorController::class, 'disable']);
        });
        Route::post('/verify', [TwoFactorController::class, 'verify']);
    });
});

Route::prefix('oauth')->group(function () {
    Route::get('/google', [OAuthController::class, 'redirectGoogle']);
    Route::get('/google/callback', [OAuthController::class, 'callbackGoogle']);
    
    Route::get('/github', [OAuthController::class, 'redirectGithub']);
    Route::get('/github/callback', [OAuthController::class, 'callbackGithub']);
    
    Route::get('/linkedin', [OAuthController::class, 'redirectLinkedin']);
    Route::get('/linkedin/callback', [OAuthController::class, 'callbackLinkedin']);
    
    Route::get('/{provider}/mock', [OAuthController::class, 'mockCallback']);

    Route::post('/verify-code', [AuthController::class, 'verifyOauthCode']);
});

Route::prefix('users')->middleware(['auth.jwt', 'role:CANDIDATE'])->group(function () {
    Route::get('/me', [UserController::class, 'getProfile']);
    Route::patch('/me', [UserController::class, 'updateProfile']);
    Route::get('/me/sessions', [UserController::class, 'getSessions']);
    Route::delete('/me/sessions/{family}', [UserController::class, 'revokeSession']);
});

Route::prefix('admin')->middleware(['auth.jwt', 'role:ADMIN'])->group(function () {
    Route::get('/users', [AdminController::class, 'getUsers']);
    Route::patch('/users/{id}/status', [AdminController::class, 'updateUserStatus']);
    Route::get('/system/stats', [AdminController::class, 'getSystemStats']);
    Route::get('/system/audit-logs', [AdminController::class, 'getAuditLogs']);

    Route::get('/tests/pending', [TestController::class, 'listPendingTests']);
    Route::get('/tests/{id}', [TestController::class, 'getTest']);
    Route::post('/tests/{id}/approve', [TestController::class, 'approveTest']);
    Route::post('/tests/{id}/reject', [TestController::class, 'rejectTest']);
});

// ─── Assessment Routes ────────────────────────────────────────────────────────

// Recruiter
Route::prefix('recruiter')->middleware(['auth.jwt', 'role:RECRUITER'])->group(function () {
    Route::post('/tests', [TestController::class, 'createTest']);
    Route::get('/tests/my', [TestController::class, 'listMyTests']);
    Route::get('/tests/{id}', [TestController::class, 'getTest']);
    Route::patch('/tests/{id}', [TestController::class, 'updateTest']);
    Route::delete('/tests/{id}', [TestController::class, 'archiveTest']);
    Route::post('/tests/{id}/submit-for-review', [TestController::class, 'submitForReview']);
    Route::get('/tests/{id}/submissions', [TestController::class, 'getSubmissions']);

    Route::post('/tests/{id}/questions', [QuestionController::class, 'addQuestion']);
    Route::patch('/tests/{id}/questions/{qId}', [QuestionController::class, 'updateQuestion']);
    Route::delete('/tests/{id}/questions/{qId}', [QuestionController::class, 'deleteQuestion']);

    Route::patch('/submissions/{id}/grade', [SubmissionController::class, 'grade']);
});

// Candidate
Route::prefix('candidate')->middleware(['auth.jwt', 'role:CANDIDATE'])->group(function () {
    Route::get('/tests', [TestController::class, 'listPublishedTests']);
    Route::get('/tests/{id}', [TestController::class, 'getTest']);
    
    Route::post('/tests/{id}/submissions', [SubmissionController::class, 'start']);
    Route::get('/tests/{id}/submissions/my', [SubmissionController::class, 'getMySubmission']);
    
    Route::post('/submissions/{id}/answers', [SubmissionController::class, 'submitAnswers']);
    Route::post('/submissions/{id}/submit', [SubmissionController::class, 'finalize']);
});
