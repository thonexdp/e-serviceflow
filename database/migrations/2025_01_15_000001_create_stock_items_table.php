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
        Schema::create('stock_items', function (Blueprint $table) {
            $table->id();
            $table->string('sku')->unique()->comment('Stock Keeping Unit');
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('category')->nullable()->comment('e.g., Paper, Ink, Binding, etc.');
            $table->string('base_unit_of_measure')->default('pcs')->comment('Base UOM: pcs, kg, liter, roll, sheet, etc.');
            $table->decimal('current_stock', 10, 2)->default(0)->comment('Current stock quantity in base UOM');
            $table->decimal('minimum_stock_level', 10, 2)->default(0)->comment('Reorder point');
            $table->decimal('maximum_stock_level', 10, 2)->nullable()->comment('Maximum stock capacity');
            $table->decimal('unit_cost', 10, 2)->default(0)->comment('Average unit cost');
            $table->string('supplier')->nullable();
            $table->string('location')->nullable()->comment('Storage location/warehouse');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index('sku');
            $table->index('category');
            $table->index('is_active');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stock_items');
    }
};

