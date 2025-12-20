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
            // Check if columns don't exist before adding
            if (!Schema::hasColumn('tickets', 'is_workflow_completed')) {
                $table->boolean('is_workflow_completed')->default(false)->after('status');
            }
            if (!Schema::hasColumn('tickets', 'workflow_started_at')) {
                $table->timestamp('workflow_started_at')->nullable()->after('is_workflow_completed');
            }
            if (!Schema::hasColumn('tickets', 'workflow_completed_at')) {
                $table->timestamp('workflow_completed_at')->nullable()->after('workflow_started_at');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->dropColumn(['is_workflow_completed', 'workflow_started_at', 'workflow_completed_at']);
        });
    }
};

