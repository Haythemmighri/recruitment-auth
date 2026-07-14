<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tests', function (Blueprint $table) {
            $table->text('rejection_reason')->nullable()->after('status');
        });
        
        \Illuminate\Support\Facades\DB::statement("ALTER TABLE tests MODIFY COLUMN status ENUM('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED', 'ARCHIVED') DEFAULT 'DRAFT'");
    }

    public function down(): void
    {
        \Illuminate\Support\Facades\DB::statement("ALTER TABLE tests MODIFY COLUMN status ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') DEFAULT 'DRAFT'");

        Schema::table('tests', function (Blueprint $table) {
            $table->dropColumn('rejection_reason');
        });
    }
};
