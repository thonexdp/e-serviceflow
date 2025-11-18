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
        Schema::create('purchase_orders', function (Blueprint $table) {
            $table->id();
            $table->string('po_number')->unique()->comment('Purchase Order Number');
            $table->string('supplier')->nullable();
            $table->string('supplier_contact')->nullable();
            $table->string('supplier_email')->nullable();
            $table->string('status')->default('draft')->comment('draft, pending, approved, ordered, received, cancelled');
            $table->date('order_date')->nullable();
            $table->date('expected_delivery_date')->nullable();
            $table->date('received_date')->nullable();
            $table->decimal('subtotal', 10, 2)->default(0);
            $table->decimal('tax', 10, 2)->default(0);
            $table->decimal('shipping_cost', 10, 2)->default(0);
            $table->decimal('total_amount', 10, 2)->default(0);
            $table->text('notes')->nullable();
            $table->text('internal_notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('approved_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('po_number');
            $table->index('status');
            $table->index('order_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('purchase_orders');
    }
};

