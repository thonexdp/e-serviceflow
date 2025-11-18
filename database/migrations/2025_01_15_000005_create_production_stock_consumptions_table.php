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
        Schema::create('production_stock_consumptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ticket_id')->constrained('tickets')->onDelete('cascade');
            $table->foreignId('stock_item_id')->constrained('stock_items')->onDelete('cascade');
            $table->decimal('quantity_consumed', 10, 2)->comment('Quantity consumed in base UOM');
            $table->decimal('unit_cost', 10, 2)->nullable()->comment('Cost per unit at time of consumption');
            $table->decimal('total_cost', 10, 2)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['ticket_id', 'stock_item_id']);
            $table->index('ticket_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('production_stock_consumptions');
    }
};

