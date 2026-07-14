<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('test_submissions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('test_id');
            $table->uuid('candidate_id');
            $table->enum('status', ['IN_PROGRESS', 'SUBMITTED', 'GRADED'])->default('IN_PROGRESS');
            $table->timestamp('started_at')->useCurrent();
            $table->timestamp('submitted_at')->nullable();
            $table->decimal('score', 5, 2)->nullable();
            $table->decimal('max_score', 5, 2)->nullable();
            $table->timestamps();

            $table->foreign('test_id')->references('id')->on('tests')->onDelete('cascade');
            $table->foreign('candidate_id')->references('id')->on('users')->onDelete('cascade');
            $table->unique(['test_id', 'candidate_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('test_submissions');
    }
};
