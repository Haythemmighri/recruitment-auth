<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->string('id')->primary(); // cuid-style, stored as varchar
            $table->string('first_name', 100);
            $table->string('last_name', 100);
            $table->string('email', 255)->unique();
            $table->string('phone', 20)->unique()->nullable();

            // Never stored in plaintext – always Argon2id hash
            $table->string('password_hash')->nullable();

            $table->enum('role', ['CANDIDATE', 'RECRUITER', 'ADMIN'])->default('CANDIDATE');
            $table->enum('status', ['PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'DELETED'])->default('PENDING_VERIFICATION');
            $table->boolean('is_email_verified')->default(false);

            // OAuth fields
            $table->string('google_id')->unique()->nullable();
            $table->string('github_id')->unique()->nullable();
            $table->string('linkedin_id')->unique()->nullable();
            $table->string('avatar_url')->nullable();

            // TOTP two-factor authentication
            $table->boolean('is_two_factor_enabled')->default(false);
            $table->string('two_factor_secret')->nullable(); // Encrypted at-rest

            $table->timestamp('last_login_at')->nullable();
            $table->timestamps();

            $table->index('email');
            $table->index('phone');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
