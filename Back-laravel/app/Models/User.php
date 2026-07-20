<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Tymon\JWTAuth\Contracts\JWTSubject;
use Illuminate\Foundation\Auth\User as Authenticatable;

class User extends Authenticatable implements JWTSubject
{
    protected $table = 'users';
    protected $primaryKey = 'id';
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = true;

    protected $fillable = [
        'id',
        'first_name',
        'last_name',
        'email',
        'phone',
        'password_hash',
        'role',
        'status',
        'is_email_verified',
        'google_id',
        'github_id',
        'linkedin_id',
        'avatar_url',
        'is_two_factor_enabled',
        'two_factor_secret',
        'last_login_at',
    ];

    protected $hidden = [
        'password_hash',
        'two_factor_secret',
    ];

    protected $casts = [
        'is_email_verified'     => 'boolean',
        'is_two_factor_enabled' => 'boolean',
        'last_login_at'         => 'datetime',
        'created_at'            => 'datetime',
        'updated_at'            => 'datetime',
    ];

    // ─── JWTSubject ────────────────────────────────────────────────────────────

    public function getJWTIdentifier(): mixed
    {
        return $this->getKey();
    }

    public function getJWTCustomClaims(): array
    {
        return [
            'email' => $this->email,
            'role'  => $this->role,
        ];
    }

    // ─── Relations ─────────────────────────────────────────────────────────────

    public function refreshTokens(): HasMany
    {
        return $this->hasMany(RefreshToken::class, 'user_id');
    }

    public function emailVerificationTokens(): HasMany
    {
        return $this->hasMany(EmailVerificationToken::class, 'user_id');
    }

    public function passwordResetTokens(): HasMany
    {
        return $this->hasMany(PasswordResetToken::class, 'user_id');
    }

    public function auditLogs(): HasMany
    {
        return $this->hasMany(AuditLog::class, 'user_id');
    }

    public function loginAttempts(): HasMany
    {
        return $this->hasMany(LoginAttempt::class, 'user_id');
    }

    public function testSubscriptions(): HasMany
    {
        return $this->hasMany(TestSubscription::class, 'candidate_id');
    }
}
