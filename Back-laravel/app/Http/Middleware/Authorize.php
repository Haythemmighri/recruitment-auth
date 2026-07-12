<?php

namespace App\Http\Middleware;

use App\Helpers\ResponseHelper;
use Closure;
use Illuminate\Http\Request;

class Authorize
{
    /**
     * Role hierarchy matching Node backend:
     * ADMIN can access anything.
     * RECRUITER can access recruiter and candidate routes.
     * CANDIDATE can only access candidate routes.
     */
    private const ROLE_LEVELS = [
        'ADMIN'     => 3,
        'RECRUITER' => 2,
        'CANDIDATE' => 1,
    ];

    public function handle(Request $request, Closure $next, string $requiredRole)
    {
        $userRole = $request->attributes->get('role');

        if (!$userRole) {
            return ResponseHelper::error('Authentication required', 401);
        }

        $userLevel = self::ROLE_LEVELS[$userRole] ?? 0;
        $requiredLevel = self::ROLE_LEVELS[$requiredRole] ?? 999;

        if ($userLevel < $requiredLevel) {
            return ResponseHelper::error('Forbidden: insufficient permissions', 403);
        }

        return $next($request);
    }
}
