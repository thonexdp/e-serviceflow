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
        // Link stock items to job types (only if column doesn't exist)
        if (!Schema::hasColumn('stock_items', 'job_type_id')) {
            Schema::table('stock_items', function (Blueprint $table) {
                $table->foreignId('job_type_id')->nullable()->after('id')->constrained('job_types')->onDelete('cascade');
            });
        }
        
        // Add dimension fields for area-based materials (tarpaulin, fabric, etc.)
        if (!Schema::hasColumn('stock_items', 'length')) {
            Schema::table('stock_items', function (Blueprint $table) {
                $table->decimal('length', 10, 2)->nullable()->after('base_unit_of_measure')->comment('Length in base unit');
            });
        }
        
        if (!Schema::hasColumn('stock_items', 'width')) {
            Schema::table('stock_items', function (Blueprint $table) {
                $table->decimal('width', 10, 2)->nullable()->after('length')->comment('Width in base unit');
            });
        }
        
        if (!Schema::hasColumn('stock_items', 'is_area_based')) {
            Schema::table('stock_items', function (Blueprint $table) {
                $table->boolean('is_area_based')->default(false)->after('width')->comment('If true, stock is managed by area (length x width)');
            });
        }
        
        // Remove the old category index if it exists
        Schema::table('stock_items', function (Blueprint $table) {
            try {
                $table->dropIndex(['category']);
            } catch (\Exception $e) {
                // Index might not exist, ignore
            }
        });
        
        // Add index for job_type_id (only if column exists and index doesn't)
        if (Schema::hasColumn('stock_items', 'job_type_id')) {
            Schema::table('stock_items', function (Blueprint $table) {
                try {
                    $table->index('job_type_id');
                } catch (\Exception $e) {
                    // Index might already exist, ignore
                }
            });
        }
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

