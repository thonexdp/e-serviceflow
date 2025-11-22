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
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ticket_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('customer_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('invoice_number')->nullable();
            $table->string('official_receipt_number')->nullable();
            $table->string('payment_reference')->nullable();
            $table->string('payer_type', 20)->default('customer');
            $table->string('payer_name')->nullable();
            $table->string('payment_type', 20)->default('collection'); // collection, refund, adjustment
            $table->string('allocation', 30)->nullable(); // downpayment, balance, full
            $table->string('payment_method', 30)->default('cash');
            $table->decimal('amount', 12, 2);
            $table->decimal('balance_before', 12, 2)->nullable();
            $table->decimal('balance_after', 12, 2)->nullable();
            $table->date('payment_date');
            $table->string('status', 20)->default('posted');
            $table->text('notes')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['ticket_id', 'payment_date']);
            $table->index(['customer_id', 'payment_date']);
            $table->index(['official_receipt_number']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
