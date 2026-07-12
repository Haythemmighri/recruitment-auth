<?php

namespace App\Http\Controllers\Admin;

use App\Helpers\AuditLogHelper;
use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\LoginAttempt;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class AdminController extends Controller
{
    public function getUsers(Request $request)
    {
        try {
            $page = max(1, (int) $request->query('page', 1));
            $limit = max(1, min(100, (int) $request->query('limit', 10)));
            $role = $request->query('role');
            $status = $request->query('status');
            $search = $request->query('search');

            $query = User::query();

            if ($role) $query->where('role', $role);
            if ($status) $query->where('status', $status);
            if ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('email', 'like', "%{$search}%")
                      ->orWhere('first_name', 'like', "%{$search}%")
                      ->orWhere('last_name', 'like', "%{$search}%");
                });
            }

            $total = $query->count();
            $users = $query->orderBy('created_at', 'desc')
                ->skip(($page - 1) * $limit)
                ->take($limit)
                ->get([
                    'id', 'first_name', 'last_name', 'email', 'role', 
                    'status', 'is_email_verified', 'is_two_factor_enabled', 
                    'last_login_at', 'created_at'
                ])->map(function ($user) {
                    return [
                        'id' => $user->id,
                        'firstName' => $user->first_name,
                        'lastName' => $user->last_name,
                        'email' => $user->email,
                        'role' => $user->role,
                        'status' => $user->status,
                        'isEmailVerified' => $user->is_email_verified,
                        'isTwoFactorEnabled' => $user->is_two_factor_enabled,
                        'lastLoginAt' => $user->last_login_at,
                        'createdAt' => $user->created_at,
                    ];
                });

            return ResponseHelper::success($users, 'Users retrieved', 200, [
                'total' => $total,
                'page'  => $page,
                'limit' => $limit,
                'pages' => ceil($total / $limit)
            ]);
        } catch (\Throwable $e) {
            return ResponseHelper::error('Internal error', 500);
        }
    }

    public function updateUserStatus(Request $request, string $id)
    {
        try {
            $status = $request->input('status');
            $validStatuses = ['ACTIVE', 'SUSPENDED', 'DELETED', 'PENDING_VERIFICATION', 'PENDING_APPROVAL'];

            if (!in_array($status, $validStatuses)) {
                return ResponseHelper::error('Invalid status', 400);
            }

            $user = User::find($id);
            if (!$user) {
                return ResponseHelper::error('User not found', 404);
            }

            if ($user->role === 'ADMIN' && $request->attributes->get('user_id') !== $id) {
                return ResponseHelper::error('Cannot modify another admin', 403);
            }

            $user->update(['status' => $status]);

            AuditLogHelper::log($request, AuditLogHelper::ADMIN_USER_STATUS_CHANGED, null, [
                'targetUserId' => $id,
                'newStatus'    => $status,
            ]);

            // If suspended/deleted, revoke sessions
            if (in_array($status, ['SUSPENDED', 'DELETED'])) {
                \App\Models\RefreshToken::where('user_id', $id)
                    ->update(['revoked' => true]);
            }

            return ResponseHelper::success(null, 'User status updated');
        } catch (\Throwable $e) {
            return ResponseHelper::error('Internal error', 500);
        }
    }

    public function getSystemStats(Request $request)
    {
        try {
            $totalUsers = User::count();
            $activeUsers = User::where('status', 'ACTIVE')->count();
            $suspendedUsers = User::where('status', 'SUSPENDED')->count();
            
            $admins = User::where('role', 'ADMIN')->count();
            $recruiters = User::where('role', 'RECRUITER')->count();
            $candidates = User::where('role', 'CANDIDATE')->count();

            $verifiedUsers = User::where('is_email_verified', true)->count();
            $twoFactorEnabled = User::where('is_two_factor_enabled', true)->count();

            $recentLogins = LoginAttempt::where('success', true)
                ->where('created_at', '>=', now()->subHours(24))
                ->count();
                
            $failedLogins = LoginAttempt::where('success', false)
                ->where('created_at', '>=', now()->subHours(24))
                ->count();

            return ResponseHelper::success([
                'totalUsers'       => $totalUsers,
                'activeUsers'      => $activeUsers,
                'suspendedUsers'   => $suspendedUsers,
                'roles'            => [
                    'ADMIN'     => $admins,
                    'RECRUITER' => $recruiters,
                    'CANDIDATE' => $candidates,
                ],
                'security'         => [
                    'verifiedUsers'    => $verifiedUsers,
                    'twoFactorEnabled' => $twoFactorEnabled,
                ],
                'activity24h'      => [
                    'successfulLogins' => $recentLogins,
                    'failedLogins'     => $failedLogins,
                ]
            ], 'System statistics retrieved');
        } catch (\Throwable $e) {
            return ResponseHelper::error('Internal error', 500);
        }
    }

    public function getAuditLogs(Request $request)
    {
        try {
            $page = max(1, (int) $request->query('page', 1));
            $limit = max(1, min(100, (int) $request->query('limit', 20)));
            $skip = ($page - 1) * $limit;
            $userId = $request->query('userId');
            $event = $request->query('event');

            $query = AuditLog::query();

            if ($userId) $query->where('user_id', $userId);
            if ($event) $query->where('event', $event);

            $total = $query->count();
            $logs = \App\Models\AuditLog::with(['user' => function($q) {
                $q->select('id', 'first_name', 'last_name', 'email');
            }])
                ->where($query->getQuery()->wheres)
                ->orderBy('created_at', 'desc')
                ->skip($skip)
                ->take($limit)
                ->get()
                ->map(function ($log) {
                    $logData = $log->toArray();
                    if ($log->user) {
                        $logData['user'] = [
                            'id' => $log->user->id,
                            'firstName' => $log->user->first_name,
                            'lastName' => $log->user->last_name,
                            'email' => $log->user->email,
                        ];
                    }
                    return $logData;
                });

            return ResponseHelper::success($logs, 'Audit logs retrieved', 200, [
                'total' => $total,
                'page'  => $page,
                'limit' => $limit,
                'pages' => ceil($total / $limit)
            ]);
        } catch (\Throwable $e) {
            return ResponseHelper::error('Internal error', 500);
        }
    }
}
