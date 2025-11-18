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
        Schema::create('job_type_size_rates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('job_type_id')->constrained('job_types')->onDelete('cascade');
            $table->string('variant_name')->nullable();
            $table->string('description')->nullable();
            $table->enum('calculation_method', ['area', 'length'])->default('area');
            $table->enum('dimension_unit', ['ft', 'm', 'cm', 'in'])->default('ft');
            $table->decimal('rate', 10, 2);
            $table->decimal('min_width', 10, 2)->nullable();
            $table->decimal('max_width', 10, 2)->nullable();
            $table->decimal('min_height', 10, 2)->nullable();
            $table->decimal('max_height', 10, 2)->nullable();
            $table->boolean('is_default')->default(false);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('job_type_size_rates');
    }
};
