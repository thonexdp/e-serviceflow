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
        Schema::create('tickets', function (Blueprint $table) {
            $table->id();
            $table->string('ticket_number')->unique();
            $table->foreignId('customer_id')->constrained('customers')->onDelete('cascade');
            $table->text('description');
            $table->string('job_type')->nullable();
            $table->integer('quantity')->default(1);
            $table->string('size_value')->nullable();
            $table->string('size_unit')->nullable();
            $table->date('due_date')->nullable();
            $table->decimal('total_amount', 10, 2)->default(0);
            $table->decimal('discount', 10, 2)->default(0);
            $table->decimal('downpayment', 10, 2)->default(0);
            $table->string('status')->default('pending'); // pending, in_production, completed, cancelled
            $table->string('payment_status')->default('pending'); // pending, partial, paid
            $table->string('status_notes')->nullable();
            $table->decimal('amount_paid', 10, 2)->default(0);
            $table->text('file_path')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tickets');
    }
};
