<?php

namespace App\Http\Controllers\Auth;

use App\Helpers\AuditLogHelper;
use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\TwoFactorDisableRequest;
use App\Http\Requests\Auth\TwoFactorEnableRequest;
use App\Http\Requests\Auth\TwoFactorVerifyRequest;
use App\Services\TwoFactorService;
use Illuminate\Http\Request;

class TwoFactorController extends Controller
{
    public function __construct(private TwoFactorService $twoFactorService) {}

    public function setup(Request $request)
    {
        try {
            $userId = $request->attributes->get('user_id');
            $result = $this->twoFactorService->setupTwoFactor($userId);
            
            AuditLogHelper::log($request, AuditLogHelper::TWO_FACTOR_SETUP);

            return ResponseHelper::success($result['data'], 'QR code generated. Scan it with your authenticator app.');
        } catch (\Throwable $e) {
            $status = $e->getCode() ?: 500;
            if ($status < 400 || $status > 599) $status = 500;
            return ResponseHelper::error($e->getMessage(), $status);
        }
    }

    public function enable(TwoFactorEnableRequest $request)
    {
        try {
            $data = $request->validated();
            $userId = $request->attributes->get('user_id');
            $result = $this->twoFactorService->enableTwoFactor($userId, $data['totpCode']);
            
            AuditLogHelper::log($request, AuditLogHelper::TWO_FACTOR_ENABLED);

            return ResponseHelper::success(null, $result['message']);
        } catch (\Throwable $e) {
            $status = $e->getCode() ?: 500;
            if ($status < 400 || $status > 599) $status = 500;
            return ResponseHelper::error($e->getMessage(), $status);
        }
    }

    public function disable(TwoFactorDisableRequest $request)
    {
        try {
            $data = $request->validated();
            $userId = $request->attributes->get('user_id');
            $result = $this->twoFactorService->disableTwoFactor($userId, $data['password']);
            
            AuditLogHelper::log($request, AuditLogHelper::TWO_FACTOR_DISABLED);

            return ResponseHelper::success(null, $result['message']);
        } catch (\Throwable $e) {
            $status = $e->getCode() ?: 500;
            if ($status < 400 || $status > 599) $status = 500;
            return ResponseHelper::error($e->getMessage(), $status);
        }
    }

    public function verify(TwoFactorVerifyRequest $request)
    {
        try {
            $data = $request->validated();
            $ip = $request->ip();
            $ua = substr($request->userAgent() ?? 'unknown', 0, 500);

            $result = $this->twoFactorService->verifyTwoFactor($data['tempToken'], $data['totpCode'], $ip, $ua);

            AuditLogHelper::log($request, AuditLogHelper::TWO_FACTOR_LOGIN);

            return ResponseHelper::success(['accessToken' => $result['accessToken']], '2FA verification successful')
                ->cookie(
                    'refreshToken',
                    $result['refreshToken'],
                    $result['refreshTtlMs'] / 60000,
                    '/',
                    env('COOKIE_DOMAIN', null),
                    env('APP_ENV') === 'production',
                    true,
                    false,
                    'Strict'
                );
        } catch (\Throwable $e) {
            $status = $e->getCode() ?: 500;
            if ($status < 400 || $status > 599) $status = 500;
            return ResponseHelper::error($e->getMessage(), $status);
        }
    }
}
