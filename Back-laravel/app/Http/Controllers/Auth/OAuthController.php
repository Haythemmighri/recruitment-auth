<?php

namespace App\Http\Controllers\Auth;

use App\Helpers\AuditLogHelper;
use App\Http\Controllers\Controller;
use App\Services\OAuthService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Laravel\Socialite\Facades\Socialite;

class OAuthController extends Controller
{
    public function __construct(private OAuthService $oauthService) {}

    private function getClientErrorUrl(string $error): string
    {
        $clientUrl = env('CLIENT_URL', 'http://localhost:4200');
        return "{$clientUrl}/#/auth/login?error=" . urlencode($error);
    }

    private function getClientCallbackUrl(string $accessToken, string $refreshToken): string
    {
        $clientUrl = env('CLIENT_URL', 'http://localhost:4200');
        return "{$clientUrl}/#/oauth/callback?token=" . urlencode($accessToken)
            . '&rt=' . urlencode($refreshToken);
    }

    private function getClientOauthVerifyUrl(string $tempToken): string
    {
        $clientUrl = env('CLIENT_URL', 'http://localhost:4200');
        return "{$clientUrl}/#/auth/oauth/verify?tempToken=" . urlencode($tempToken);
    }

    // ─── Initiate ──────────────────────────────────────────────────────────────
    
    public function redirectGoogle()
    {
        return Socialite::driver('google')->stateless()->redirect();
    }

    public function redirectGithub()
    {
        return Socialite::driver('github')->stateless()->redirect();
    }

    public function redirectLinkedin()
    {
        return Socialite::driver('linkedin-openid')->stateless()->redirect();
    }

    // ─── Callbacks ─────────────────────────────────────────────────────────────

    public function callbackGoogle(Request $request)
    {
        return $this->handleCallback($request, 'google');
    }

    public function callbackGithub(Request $request)
    {
        return $this->handleCallback($request, 'github');
    }

    public function callbackLinkedin(Request $request)
    {
        return $this->handleCallback($request, 'linkedin-openid');
    }

    public function mockCallback(Request $request, string $provider)
    {
        $dbProvider = $provider === 'linkedin-openid' || $provider === 'linkedin' ? 'linkedin' : $provider;

        try {
            $rand = bin2hex(random_bytes(4));
            $profile = [
                'id'        => "mock-{$dbProvider}-{$rand}",
                'email'     => "mock-{$dbProvider}-{$rand}@example.com",
                'avatarUrl' => "https://avatars.githubusercontent.com/u/9919?v=4",
                'firstName' => 'Mock',
                'lastName'  => ucfirst($dbProvider) . ' User',
            ];

            $user = $this->oauthService->findOrCreateOAuthUser($dbProvider, $profile);

            $ip = $request->ip();
            $ua = substr($request->userAgent() ?? 'unknown', 0, 500);

            $result = $this->oauthService->oauthLogin($user->id, $ip, $ua);

            if (isset($result['requiresOauthVerification'])) {
                \App\Helpers\AuditLogHelper::log($request, \App\Helpers\AuditLogHelper::USER_LOGIN, $user->id);
                return redirect($this->getClientOauthVerifyUrl($result['tempToken']));
            }

            \App\Helpers\AuditLogHelper::log($request, \App\Helpers\AuditLogHelper::USER_LOGIN, $user->id);

            return redirect($this->getClientCallbackUrl($result['accessToken'], $result['refreshToken']));

        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error("[oauth] mock {$dbProvider} callback error", ['error' => $e->getMessage()]);
            return redirect($this->getClientErrorUrl("mock_{$dbProvider}_auth_failed"));
        }
    }

    // ─── Shared Handler ────────────────────────────────────────────────────────

    private function handleCallback(Request $request, string $provider)
    {
        try {
            $socialUser = Socialite::driver($provider)->stateless()->user();

            $profile = [
                'id'        => $socialUser->getId(),
                'email'     => $socialUser->getEmail(),
                'avatarUrl' => $socialUser->getAvatar(),
            ];

            // Normalize names
            if ($provider === 'google' || $provider === 'linkedin-openid') {
                $profile['firstName'] = $socialUser->user['given_name'] ?? explode(' ', $socialUser->getName())[0] ?? 'User';
                $profile['lastName']  = $socialUser->user['family_name'] ?? implode(' ', array_slice(explode(' ', $socialUser->getName()), 1)) ?: 'User';
            } else {
                // github
                $nameParts = explode(' ', $socialUser->getName() ?? 'GitHub User');
                $profile['firstName'] = $nameParts[0];
                $profile['lastName']  = implode(' ', array_slice($nameParts, 1)) ?: 'User';
            }

            if (!$profile['email']) {
                return redirect($this->getClientErrorUrl("No verified email from {$provider}."));
            }

            // Find or Create — normalize provider key for DB column
            $dbProvider = $provider === 'linkedin-openid' ? 'linkedin' : $provider;
            $user = $this->oauthService->findOrCreateOAuthUser($dbProvider, $profile);

            $ip = $request->ip();
            $ua = substr($request->userAgent() ?? 'unknown', 0, 500);

            // Login — also checks for 2FA
            $result = $this->oauthService->oauthLogin($user->id, $ip, $ua);

            // If verification is required, redirect to verification page with a temp token
            if (isset($result['requiresOauthVerification'])) {
                AuditLogHelper::log($request, AuditLogHelper::USER_LOGIN, $user->id);
                return redirect($this->getClientOauthVerifyUrl($result['tempToken']));
            }

            AuditLogHelper::log($request, AuditLogHelper::USER_LOGIN, $user->id);

            // Pass refresh token as a URL param because cross-origin Set-Cookie headers
            // are silently dropped by browsers during OAuth redirects.
            return redirect($this->getClientCallbackUrl($result['accessToken'], $result['refreshToken']));

        } catch (\Throwable $e) {
            Log::error("[oauth] {$provider} callback error", ['error' => $e->getMessage()]);
            return redirect($this->getClientErrorUrl("{$provider}_auth_failed"));
        }
    }
}
