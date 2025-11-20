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
        Schema::table('job_type_stock_requirements', function (Blueprint $table) {
            $table->enum('calculation_type', ['quantity', 'area', 'length'])->default('quantity')
                ->after('quantity_per_unit')
                ->comment('How to calculate required stock: quantity (per piece), area (per sqm), length (per meter)');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('job_type_stock_requirements', function (Blueprint $table) {
            $table->dropColumn('calculation_type');
        });
    }
};
