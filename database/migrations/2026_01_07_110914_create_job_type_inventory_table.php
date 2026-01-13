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
        Schema::create('job_type_inventory', function (Blueprint $table) {
            $table->id();
            $table->foreignId('job_type_id')->constrained('job_types')->onDelete('cascade');
            $table->foreignId('stock_item_id')->constrained('stock_items')->onDelete('cascade');
            $table->enum('consume_type', ['pcs', 'area', 'kg', 'liter', 'meter', 'ml', 'sqft'])->default('pcs')->comment('How this material is consumed');
            $table->decimal('avg_quantity_per_unit', 10, 4)->default(0)->comment('Average consumption per 1 unit of production');
            $table->boolean('is_optional')->default(false)->comment('Optional materials like extra ink, thread');
            $table->text('notes')->nullable()->comment('Special instructions or notes');
            $table->timestamps();

            // Ensure unique combination of job_type and stock_item
            $table->unique(['job_type_id', 'stock_item_id']);
            $table->index('job_type_id');
            $table->index('stock_item_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('job_type_inventory');
    }
};
