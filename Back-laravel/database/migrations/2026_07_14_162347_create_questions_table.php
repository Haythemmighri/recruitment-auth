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
        Schema::create('questions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('test_id');
            $table->text('content');
            $table->integer('order_index')->default(0);
            $table->integer('points')->default(1);
            $table->json('options')->nullable(); // For QCM: [{label, value, isCorrect}]
            $table->text('expected_output')->nullable(); // For PROBLEM_SOLVING
            $table->timestamps();

            $table->foreign('test_id')->references('id')->on('tests')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('questions');
    }
};
