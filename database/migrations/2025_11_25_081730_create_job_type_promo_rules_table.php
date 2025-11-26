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
        Schema::create('job_type_promo_rules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('job_type_id')->constrained('job_types')->onDelete('cascade');
            $table->integer('buy_quantity'); // e.g., 12
            $table->integer('free_quantity'); // e.g., 1
            $table->string('description')->nullable(); // e.g., "Buy 12, Get 1 Free!"
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            // Index for faster lookups
            $table->index(['job_type_id', 'is_active']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('job_type_promo_rules');
    }
};
