<?php

namespace App\Http\Controllers\Auth;

use App\Helpers\AuditLogHelper;
use App\Helpers\CryptoHelper;
use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Services\AuthService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class AuthController extends Controller
{
    public function __construct(private AuthService $authService) {}

    private function setRefreshCookie($refreshToken, $ttlMs)
    {
        return cookie(
            'refreshToken',
            $refreshToken,
            $ttlMs / 60000, // minutes
            '/',
            env('COOKIE_DOMAIN', null),
            env('APP_ENV') === 'production',
            true,
            false,
            'Strict'
        );
    }

    public function register(RegisterRequest $request)
    {
        try {
            $data = $request->validated();
            $result = $this->authService->register($data);
            
            AuditLogHelper::log($request, AuditLogHelper::USER_REGISTERED, null, [
                'email' => $data['email'],
                'role'  => $data['role'] ?? 'CANDIDATE',
            ]);

            return ResponseHelper::created(null, $result['message']);
        } catch (\Throwable $e) {
            Log::error('[AuthController] register', ['error' => $e->getMessage()]);
            return ResponseHelper::error('An internal error occurred. Please try again.', 500);
        }
    }

    public function verifyEmail(Request $request)
    {
        $frontendLogin = env('CLIENT_URL', 'http://localhost:4200') . '/auth/login';
        try {
            $token = $request->query('token');
            if (!$token) {
                return redirect()->away($frontendLogin . '?verify_error=' . urlencode('Token is required'));
            }

            $this->authService->verifyEmail($token);
            
            AuditLogHelper::log($request, AuditLogHelper::EMAIL_VERIFIED);

            return redirect()->away($frontendLogin . '?verified=true');
        } catch (\Throwable $e) {
            $message = $e->getMessage() ?: 'Verification failed. The link may be expired or already used.';
            return redirect()->away($frontendLogin . '?verify_error=' . urlencode($message));
        }
    }

    public function login(LoginRequest $request)
    {
        try {
            $data = $request->validated();
            $ip = $request->ip();
            $ua = substr($request->userAgent() ?? 'unknown', 0, 500);

            $result = $this->authService->login($data, $ip, $ua);

            if (isset($result['requiresTwoFactor'])) {
                return ResponseHelper::success([
                    'requiresTwoFactor' => true,
                    'tempToken'         => $result['tempToken'],
                ], 'Two-factor authentication required');
            }

            AuditLogHelper::log($request, AuditLogHelper::USER_LOGIN);

            return ResponseHelper::success(['accessToken' => $result['accessToken']], 'Login successful')
                ->cookie($this->setRefreshCookie($result['refreshToken'], $result['refreshTtlMs']));
        } catch (\Throwable $e) {
            $status = $e->getCode() ?: 500;
            if ($status < 400 || $status > 599) $status = 500;
            return ResponseHelper::error($e->getMessage(), $status);
        }
    }

    public function refreshToken(Request $request)
    {
        try {
            $rawToken = $request->cookie('refreshToken');

            if (!$rawToken) {
                return ResponseHelper::error('Refresh token not found. Please log in.', 401);
            }

            $ip = $request->ip();
            $ua = substr($request->userAgent() ?? 'unknown', 0, 500);

            $result = $this->authService->refreshToken($rawToken, $ip, $ua);

            AuditLogHelper::log($request, AuditLogHelper::TOKEN_REFRESHED);

            return ResponseHelper::success(['accessToken' => $result['accessToken']], 'Token refreshed')
                ->cookie($this->setRefreshCookie($result['refreshToken'], $result['refreshTtlMs']));
        } catch (\Throwable $e) {
            $status = $e->getCode() ?: 500;
            if ($status < 400 || $status > 599) $status = 500;
            return ResponseHelper::error($e->getMessage(), $status)
                ->withoutCookie('refreshToken');
        }
    }

    public function oauthTokenExchange(Request $request)
    {
        $rawToken = $request->input('refreshToken');

        if (!$rawToken) {
            return ResponseHelper::error('Refresh token is required', 400);
        }

        return ResponseHelper::success(null, 'Token exchanged successfully')
            ->cookie($this->setRefreshCookie($rawToken, env('JWT_REFRESH_TTL', 10080) * 60 * 1000));
    }

    public function verifyOauthCode(Request $request, \App\Services\OAuthService $oauthService)
    {
        $request->validate([
            'tempToken' => 'required|string',
            'code'      => 'required|string|size:6',
        ]);

        try {
            $ip = $request->ip();
            $ua = substr($request->userAgent() ?? 'unknown', 0, 500);

            $result = $oauthService->verifyOauthCode($request->tempToken, $request->code, $ip, $ua);

            AuditLogHelper::log($request, AuditLogHelper::USER_LOGIN);

            return ResponseHelper::success(['accessToken' => $result['accessToken']], 'OAuth verification successful')
                ->cookie($this->setRefreshCookie($result['refreshToken'], $result['refreshTtlMs']));
        } catch (\Throwable $e) {
            $status = $e->getCode() ?: 500;
            if ($status < 400 || $status > 599) $status = 500;
            return ResponseHelper::error($e->getMessage(), $status);
        }
    }

    public function logout(Request $request)
    {
        try {
            $rawToken = $request->cookie('refreshToken');

            if ($rawToken) {
                $this->authService->logout($rawToken);
            }

            AuditLogHelper::log($request, AuditLogHelper::USER_LOGOUT);

            return ResponseHelper::success(null, 'Logged out successfully')
                ->withoutCookie('refreshToken');
        } catch (\Throwable $e) {
            Log::error('[AuthController] logout error', ['error' => $e->getMessage()]);
            return ResponseHelper::success(null, 'Logged out')
                ->withoutCookie('refreshToken');
        }
    }

    public function forgotPassword(ForgotPasswordRequest $request)
    {
        try {
            $data = $request->validated();
            $result = $this->authService->forgotPassword($data['email']);
            
            AuditLogHelper::log($request, AuditLogHelper::PASSWORD_RESET_REQUESTED, null, ['email' => $data['email']]);

            return ResponseHelper::success(null, $result['message']);
        } catch (\Throwable $e) {
            Log::error('[AuthController] forgotPassword error', ['error' => $e->getMessage()]);
            return ResponseHelper::success(null, 'If that email is registered, you will receive a password reset link shortly.');
        }
    }

    public function resetPassword(ResetPasswordRequest $request)
    {
        try {
            $data = $request->validated();
            $result = $this->authService->resetPassword($data['token'], $data['newPassword']);
            
            AuditLogHelper::log($request, AuditLogHelper::PASSWORD_RESET);

            return ResponseHelper::success(null, $result['message']);
        } catch (\Throwable $e) {
            $status = $e->getCode() ?: 500;
            if ($status < 400 || $status > 599) $status = 500;
            return ResponseHelper::error($e->getMessage(), $status);
        }
    }

    public function getCsrfToken(Request $request)
    {
        try {
            // Laravel handles CSRF via Sanctum/VerifyCsrfToken middleware out of the box for web routes.
            // Since this is an API, we can generate a simple custom CSRF token mirroring the custom logic.
            $token = CryptoHelper::generateSecureToken(32);
            $tokenHash = CryptoHelper::hashToken($token);

            return ResponseHelper::success(['csrfToken' => $token], 'CSRF token generated')
                ->cookie('csrfToken', $tokenHash, 120, '/', env('COOKIE_DOMAIN', null), env('APP_ENV') === 'production', false, false, 'Strict');
        } catch (\Throwable $e) {
            Log::error('[AuthController] getCsrfToken', ['error' => $e->getMessage()]);
            return ResponseHelper::error('Internal error', 500);
        }
    }
}
