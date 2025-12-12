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
            // Drop the existing UNIQUE index on sku
            $table->dropUnique('stock_items_sku_unique');

            // Add composite UNIQUE: sku + deleted_at
            $table->unique(['sku', 'deleted_at'], 'stock_items_sku_deleted_at_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('stock_items', function (Blueprint $table) {
            // Drop composite index
            $table->dropUnique('stock_items_sku_deleted_at_unique');

            // Restore original unique index
            $table->unique('sku', 'stock_items_sku_unique');
        });
    }
};
