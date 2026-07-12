<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Raw tokens are NEVER stored. Only SHA-256 hashes.
        // Token family enables theft detection via reuse signals.
        Schema::create('refresh_tokens', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('user_id');
            $table->string('token_hash')->unique(); // SHA-256(rawToken)
            $table->string('family');              // Groups tokens by login session
            $table->timestamp('expires_at');
            $table->boolean('revoked')->default(false);
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent', 500)->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');

            $table->index('token_hash');
            $table->index('family');
            $table->index('user_id');
            $table->index('revoked');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('refresh_tokens');
    }
};
