<?php

namespace App\Http\Middleware;

use App\Helpers\ResponseHelper;
use App\Services\TokenService;
use Closure;
use Illuminate\Http\Request;

class Authenticate
{
    public function __construct(private TokenService $tokenService) {}

    public function handle(Request $request, Closure $next)
    {
        $authHeader = $request->header('Authorization');

        if (!$authHeader) {
            return ResponseHelper::error('Authorization header is required', 401);
        }

        if (!str_starts_with($authHeader, 'Bearer ')) {
            return ResponseHelper::error('Authorization header must use Bearer scheme', 401);
        }

        $token = substr($authHeader, 7);

        if (!$token) {
            return ResponseHelper::error('Access token is required', 401);
        }

        try {
            $payload = $this->tokenService->verifyAccessToken($token);

            // Populate request attributes for downstream controllers
            $request->attributes->set('user_id', $payload->sub);
            $request->attributes->set('email', $payload->email);
            $request->attributes->set('role', $payload->role);
            $request->attributes->set('jti', $payload->jti);

        } catch (\Firebase\JWT\ExpiredException $e) {
            return ResponseHelper::error('Access token has expired. Please refresh.', 401);
        } catch (\Throwable $e) {
            return ResponseHelper::error('Invalid access token', 401);
        }

        return $next($request);
    }
}
