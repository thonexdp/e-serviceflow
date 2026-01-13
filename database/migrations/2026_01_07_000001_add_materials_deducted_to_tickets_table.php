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
        Schema::table('tickets', function (Blueprint $table) {
            $table->boolean('materials_deducted')->default(false)->after('status');
            $table->timestamp('materials_deducted_at')->nullable()->after('materials_deducted');
            $table->foreignId('materials_deducted_by')->nullable()->constrained('users')->nullOnDelete()->after('materials_deducted_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->dropForeign(['materials_deducted_by']);
            $table->dropColumn(['materials_deducted', 'materials_deducted_at', 'materials_deducted_by']);
        });
    }
};

