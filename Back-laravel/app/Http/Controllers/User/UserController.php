<?php

namespace App\Http\Controllers\User;

use App\Helpers\AuditLogHelper;
use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Http\Requests\User\UpdateProfileRequest;
use App\Models\User;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function getProfile(Request $request)
    {
        try {
            $userId = $request->attributes->get('user_id');

            $user = User::select([
                'id', 'first_name', 'last_name', 'email', 'phone', 
                'role', 'status', 'is_email_verified', 'is_two_factor_enabled', 
                'avatar_url', 'last_login_at', 'created_at'
            ])->find($userId);

            if (!$user) {
                return ResponseHelper::error('User not found', 404);
            }

            return ResponseHelper::success([
                'id' => $user->id,
                'firstName' => $user->first_name,
                'lastName' => $user->last_name,
                'email' => $user->email,
                'phone' => $user->phone,
                'role' => $user->role,
                'status' => $user->status,
                'isEmailVerified' => $user->is_email_verified,
                'isTwoFactorEnabled' => $user->is_two_factor_enabled,
                'avatarUrl' => $user->avatar_url,
                'lastLoginAt' => $user->last_login_at,
                'createdAt' => $user->created_at,
            ], 'Profile retrieved');
        } catch (\Throwable $e) {
            return ResponseHelper::error('Internal error', 500);
        }
    }

    public function updateProfile(UpdateProfileRequest $request)
    {
        try {
            $data = $request->validated();
            $userId = $request->attributes->get('user_id');

            $user = User::find($userId);
            
            $updateData = [];
            if (isset($data['firstName'])) $updateData['first_name'] = $data['firstName'];
            if (isset($data['lastName'])) $updateData['last_name'] = $data['lastName'];
            if (array_key_exists('phone', $data)) $updateData['phone'] = $data['phone']; // Allows null

            if (!empty($updateData)) {
                $user->update($updateData);
                AuditLogHelper::log($request, AuditLogHelper::PROFILE_UPDATED, $userId, array_keys($updateData));
            }

            $user->refresh();

            return ResponseHelper::success([
                'id' => $user->id,
                'firstName' => $user->first_name,
                'lastName' => $user->last_name,
                'phone' => $user->phone,
            ], 'Profile updated successfully');
        } catch (\Throwable $e) {
            return ResponseHelper::error('Internal error', 500);
        }
    }

    public function getSessions(Request $request)
    {
        try {
            $userId = $request->attributes->get('user_id');

            $sessions = \App\Models\RefreshToken::where('user_id', $userId)
                ->where('revoked', false)
                ->where('expires_at', '>', now())
                ->get(['family', 'ip_address', 'user_agent', 'created_at'])
                ->groupBy('family')
                ->map(function ($items) {
                    $latest = $items->sortByDesc('created_at')->first();
                    return [
                        'family'     => $latest->family,
                        'ipAddress'  => $latest->ip_address,
                        'userAgent'  => $latest->user_agent,
                        'lastActive' => $latest->created_at,
                    ];
                })
                ->values();

            return ResponseHelper::success($sessions, 'Active sessions retrieved');
        } catch (\Throwable $e) {
            return ResponseHelper::error('Internal error', 500);
        }
    }

    public function revokeSession(Request $request, string $family)
    {
        try {
            $userId = $request->attributes->get('user_id');

            $updated = \App\Models\RefreshToken::where('user_id', $userId)
                ->where('family', $family)
                ->where('revoked', false)
                ->update(['revoked' => true]);

            if ($updated === 0) {
                return ResponseHelper::error('Session not found or already revoked', 404);
            }

            return ResponseHelper::success(null, 'Session revoked successfully');
        } catch (\Throwable $e) {
            return ResponseHelper::error('Internal error', 500);
        }
    }
}
