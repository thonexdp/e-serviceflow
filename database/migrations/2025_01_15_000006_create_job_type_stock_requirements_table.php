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
        Schema::create('job_type_stock_requirements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('job_type_id')->constrained('job_types')->onDelete('cascade');
            $table->foreignId('stock_item_id')->constrained('stock_items')->onDelete('cascade');
            $table->decimal('quantity_per_unit', 10, 2)->default(1)->comment('Quantity needed per production unit (e.g., per print)');
            $table->boolean('is_required')->default(true)->comment('Is this stock required for this job type?');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['job_type_id', 'stock_item_id']);
            $table->index('job_type_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('job_type_stock_requirements');
    }
};

