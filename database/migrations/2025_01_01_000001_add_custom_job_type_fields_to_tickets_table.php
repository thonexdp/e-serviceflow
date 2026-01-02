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
            // Custom job type fields for "Others" category
            $table->string('custom_job_type_description')->nullable()->after('job_type_id');
            $table->string('custom_price_mode')->nullable()->after('custom_job_type_description'); // 'per_item' or 'fixed_total'
            $table->decimal('custom_price_per_item', 10, 2)->nullable()->after('custom_price_mode');
            $table->decimal('custom_fixed_total', 10, 2)->nullable()->after('custom_price_per_item');
            $table->boolean('is_size_based')->default(false)->after('custom_fixed_total');
            $table->decimal('custom_width', 10, 2)->nullable()->after('is_size_based');
            $table->decimal('custom_height', 10, 2)->nullable()->after('custom_width');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->dropColumn([
                'custom_job_type_description',
                'custom_price_mode',
                'custom_price_per_item',
                'custom_fixed_total',
                'is_size_based',
                'custom_width',
                'custom_height',
            ]);
        });
    }
};

