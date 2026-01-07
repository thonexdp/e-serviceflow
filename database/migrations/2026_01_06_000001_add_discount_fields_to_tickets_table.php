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
            // Add discount tracking fields
            $table->decimal('original_price', 10, 2)->nullable()->after('total_amount');
            $table->decimal('discount_percentage', 5, 2)->nullable()->after('original_price');
            $table->decimal('discount_amount', 10, 2)->nullable()->after('discount_percentage');
            
            // Add subtotal field if it doesn't exist
            if (!Schema::hasColumn('tickets', 'subtotal')) {
                $table->decimal('subtotal', 10, 2)->nullable()->after('total_amount');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->dropColumn(['original_price', 'discount_percentage', 'discount_amount']);
            
            if (Schema::hasColumn('tickets', 'subtotal')) {
                $table->dropColumn('subtotal');
            }
        });
    }
};

