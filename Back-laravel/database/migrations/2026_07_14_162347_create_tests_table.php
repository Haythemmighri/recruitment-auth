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
        Schema::create('tests', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('recruiter_id');
            $table->string('title');
            $table->text('description')->nullable();
            
            $categories = [
                'CODING_PROGRAMMING', 'DATA_STRUCTURES_ALGORITHMS', 'DEBUGGING', 'SYSTEM_DESIGN', 
                'DATABASE_SQL', 'OOP', 'FRAMEWORK_TECHNOLOGY', 'API_DEVELOPMENT', 'CLOUD_DEVOPS', 
                'VERSION_CONTROL', 'TESTING_QA', 'SECURITY', 'PERFORMANCE_OPTIMIZATION', 
                'CODE_REVIEW', 'PROJECT_BASED', 'TECHNICAL_QUIZ', 'PROBLEM_SOLVING_LOGIC', 
                'COMMUNICATION_COLLABORATION'
            ];
            $table->enum('category', $categories);
            
            $table->enum('type', ['QCM', 'COMPTE_RENDU', 'PROBLEM_SOLVING', 'OTHER']);
            $table->enum('status', ['DRAFT', 'PUBLISHED', 'ARCHIVED'])->default('DRAFT');
            $table->integer('duration_minutes')->nullable();
            $table->timestamps();

            $table->foreign('recruiter_id')->references('id')->on('users')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tests');
    }
};
