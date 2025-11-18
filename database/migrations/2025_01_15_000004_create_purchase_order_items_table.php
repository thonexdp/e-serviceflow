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
        Schema::create('purchase_order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_order_id')->constrained('purchase_orders')->onDelete('cascade');
            $table->foreignId('stock_item_id')->constrained('stock_items')->onDelete('cascade');
            $table->decimal('quantity', 10, 2)->comment('Quantity ordered in base UOM');
            $table->decimal('unit_cost', 10, 2)->comment('Cost per unit');
            $table->decimal('total_cost', 10, 2)->comment('quantity * unit_cost');
            $table->decimal('received_quantity', 10, 2)->default(0)->comment('Quantity received so far');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['purchase_order_id', 'stock_item_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('purchase_order_items');
    }
};

