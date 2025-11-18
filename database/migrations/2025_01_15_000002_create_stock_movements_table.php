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
        Schema::create('stock_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stock_item_id')->constrained('stock_items')->onDelete('cascade');
            $table->string('movement_type')->comment('in, out, adjustment, transfer');
            $table->string('reference_type')->nullable()->comment('purchase_order, production, adjustment, etc.');
            $table->unsignedBigInteger('reference_id')->nullable()->comment('ID of related record');
            $table->decimal('quantity', 10, 2)->comment('Quantity in base UOM');
            $table->decimal('unit_cost', 10, 2)->nullable()->comment('Cost per unit at time of movement');
            $table->decimal('total_cost', 10, 2)->nullable();
            $table->decimal('stock_before', 10, 2)->comment('Stock level before movement');
            $table->decimal('stock_after', 10, 2)->comment('Stock level after movement');
            $table->text('notes')->nullable();
            $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();

            $table->index(['stock_item_id', 'movement_type']);
            $table->index(['reference_type', 'reference_id']);
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stock_movements');
    }
};

