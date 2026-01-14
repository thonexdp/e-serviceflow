<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // For MySQL, we need to alter the ENUM column to include new values
        // Keep old values for backward compatibility: 'pcs', 'area', 'kg', 'liter', 'meter'
        // Add new values: 'sqft', 'ml', 'm'
        DB::statement("ALTER TABLE `job_type_inventory` MODIFY COLUMN `consume_type` ENUM('pcs', 'area', 'sqft', 'kg', 'liter', 'ml', 'meter', 'm') DEFAULT 'pcs' COMMENT 'How this material is consumed'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert to original ENUM values
        DB::statement("ALTER TABLE `job_type_inventory` MODIFY COLUMN `consume_type` ENUM('pcs', 'area', 'kg', 'liter', 'meter', 'ml', 'sqft') DEFAULT 'pcs' COMMENT 'How this material is consumed'");
    }
};
