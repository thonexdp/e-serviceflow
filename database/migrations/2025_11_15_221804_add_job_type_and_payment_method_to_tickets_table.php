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
        Schema::table('tickets', function (Blueprint $table) {
            $table->foreignId('job_type_id')->nullable()->after('job_type')->constrained('job_types')->onDelete('set null');
            $table->string('payment_method')->nullable()->after('downpayment')->default('cash'); // cash, gcash, bank_account
            $table->decimal('subtotal', 10, 2)->nullable()->after('total_amount');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->dropForeign(['job_type_id']);
            $table->dropColumn(['job_type_id', 'payment_method', 'subtotal']);
        });
    }
};
