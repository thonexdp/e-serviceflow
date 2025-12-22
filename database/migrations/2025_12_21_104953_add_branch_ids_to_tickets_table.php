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
            // Branch that accepted the order
            $table->foreignId('order_branch_id')->nullable()->constrained('branches')->onDelete('set null');
            
            // Branch responsible for production
            $table->foreignId('production_branch_id')->nullable()->constrained('branches')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->dropForeign(['order_branch_id']);
            $table->dropForeign(['production_branch_id']);
            $table->dropColumn(['order_branch_id', 'production_branch_id']);
        });
    }
};
