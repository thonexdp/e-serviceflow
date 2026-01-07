<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * This migration moves existing stock items that have a job_type_id
     * to the new many-to-many relationship in job_type_stock_requirements table.
     */
    public function up(): void
    {
        // Get all stock items that have a job_type_id but are not yet in the pivot table
        $stockItems = DB::table('stock_items')
            ->whereNotNull('job_type_id')
            ->whereNull('deleted_at')
            ->get();

        foreach ($stockItems as $stockItem) {
            // Check if relationship already exists
            $exists = DB::table('job_type_stock_requirements')
                ->where('job_type_id', $stockItem->job_type_id)
                ->where('stock_item_id', $stockItem->id)
                ->exists();

            // Only insert if it doesn't exist
            if (!$exists) {
                DB::table('job_type_stock_requirements')->insert([
                    'job_type_id' => $stockItem->job_type_id,
                    'stock_item_id' => $stockItem->id,
                    'quantity_per_unit' => $stockItem->is_area_based ? 0 : 1,
                    'is_required' => true,
                    'notes' => 'Migrated from single job_type_id field',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        // Note: We're NOT dropping the job_type_id column for backward compatibility
        // and to maintain data integrity. It can be removed in a future migration if needed.
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove migrated entries (optional - only if you want to revert)
        DB::table('job_type_stock_requirements')
            ->where('notes', 'Migrated from single job_type_id field')
            ->delete();
    }
};
