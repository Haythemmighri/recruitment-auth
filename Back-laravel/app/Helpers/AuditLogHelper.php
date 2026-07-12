<?php

namespace App\Helpers;

use App\Models\AuditLog;
use Illuminate\Http\Request;

class AuditLogHelper
{
    // Mirroring AuditEvents from auditLog.middleware.ts
    public const USER_REGISTERED = 'USER_REGISTERED';
    public const USER_LOGIN = 'USER_LOGIN';
    public const USER_LOGOUT = 'USER_LOGOUT';
    public const EMAIL_VERIFIED = 'EMAIL_VERIFIED';
    public const PASSWORD_RESET_REQUESTED = 'PASSWORD_RESET_REQUESTED';
    public const PASSWORD_RESET = 'PASSWORD_RESET';
    public const TWO_FACTOR_SETUP = 'TWO_FACTOR_SETUP';
    public const TWO_FACTOR_ENABLED = 'TWO_FACTOR_ENABLED';
    public const TWO_FACTOR_DISABLED = 'TWO_FACTOR_DISABLED';
    public const TWO_FACTOR_LOGIN = 'TWO_FACTOR_LOGIN';
    public const TOKEN_REFRESHED = 'TOKEN_REFRESHED';
    public const PROFILE_UPDATED = 'PROFILE_UPDATED';
    public const ADMIN_USER_STATUS_CHANGED = 'ADMIN_USER_STATUS_CHANGED';

    public static function log(Request $request, string $event, ?string $explicitUserId = null, ?array $metadata = null): void
    {
        try {
            $userId = $explicitUserId ?? $request->attributes->get('user_id');
            $ipAddress = $request->ip();
            $userAgent = substr($request->userAgent() ?? 'unknown', 0, 500);

            AuditLog::create([
                'id'         => CryptoHelper::generateCuid(),
                'user_id'    => $userId,
                'event'      => $event,
                'ip_address' => $ipAddress,
                'user_agent' => $userAgent,
                'metadata'   => $metadata,
                'created_at' => now(),
            ]);
        } catch (\Throwable $e) {
            // Swallow audit errors so they don't break main flow
            \Illuminate\Support\Facades\Log::error('Audit log failed', ['error' => $e->getMessage()]);
        }
    }
}
