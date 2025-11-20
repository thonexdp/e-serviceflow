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
        Schema::table('stock_items', function (Blueprint $table) {
            // Link stock items to job types
            $table->foreignId('job_type_id')->nullable()->after('id')->constrained('job_types')->onDelete('cascade');
            
            // Add dimension fields for area-based materials (tarpaulin, fabric, etc.)
            $table->decimal('length', 10, 2)->nullable()->after('base_unit_of_measure')->comment('Length in base unit');
            $table->decimal('width', 10, 2)->nullable()->after('length')->comment('Width in base unit');
            $table->boolean('is_area_based')->default(false)->after('width')->comment('If true, stock is managed by area (length x width)');
            
            // Change category to reference job_type (we'll keep category as text for now but link to job_type)
            // Remove the old category index since we're changing the logic
            $table->dropIndex(['category']);
        });
        
        // Add index for job_type_id
        Schema::table('stock_items', function (Blueprint $table) {
            $table->index('job_type_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('stock_items', function (Blueprint $table) {
            $table->dropForeign(['job_type_id']);
            $table->dropColumn(['job_type_id', 'length', 'width', 'is_area_based']);
            $table->index('category');
        });
    }
};

