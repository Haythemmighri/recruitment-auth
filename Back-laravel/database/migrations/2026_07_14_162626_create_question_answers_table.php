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
        Schema::create('question_answers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('submission_id');
            $table->uuid('question_id');
            $table->text('answer_text')->nullable();
            $table->json('selected_options')->nullable(); // For QCM: [value, ...]
            $table->boolean('is_correct')->nullable();
            $table->decimal('points_awarded', 5, 2)->nullable();
            $table->timestamps();

            $table->foreign('submission_id')->references('id')->on('test_submissions')->onDelete('cascade');
            $table->foreign('question_id')->references('id')->on('questions')->onDelete('cascade');
            $table->unique(['submission_id', 'question_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('question_answers');
    }
};
