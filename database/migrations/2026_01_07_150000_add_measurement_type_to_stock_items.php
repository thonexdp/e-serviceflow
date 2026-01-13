<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('stock_items', function (Blueprint $table) {
            if (!Schema::hasColumn('stock_items', 'measurement_type')) {
                $table->string('measurement_type', 20)
                    ->default('pieces')
                    ->after('base_unit_of_measure')
                    ->comment('pieces, area, weight, volume, length');
            }
        });

        // Backfill measurement type using existing attributes
        if (Schema::hasColumn('stock_items', 'measurement_type')) {
            DB::table('stock_items')->orderBy('id')->chunkById(500, function ($items) {
                foreach ($items as $item) {
                    $measurement = 'pieces';

                    if (!empty($item->is_area_based)) {
                        $measurement = 'area';
                    } elseif (in_array(strtolower($item->base_unit_of_measure ?? ''), ['kg', 'kilogram', 'kilograms'])) {
                        $measurement = 'weight';
                    } elseif (in_array(strtolower($item->base_unit_of_measure ?? ''), ['liter', 'litre', 'liters', 'litres', 'l'])) {
                        $measurement = 'volume';
                    } elseif (in_array(strtolower($item->base_unit_of_measure ?? ''), ['m', 'meter', 'meters', 'metre', 'metres'])) {
                        $measurement = 'length';
                    }

                    // Standardize common base units to match measurement type
                    $baseUnit = $item->base_unit_of_measure;
                    if ($measurement === 'area') {
                        $baseUnit = $baseUnit ?: 'sqft';
                    } elseif ($measurement === 'weight') {
                        $baseUnit = 'kg';
                    } elseif ($measurement === 'volume') {
                        $baseUnit = in_array(strtolower($baseUnit), ['ml', 'milliliter', 'milliliters']) ? 'liter' : ($baseUnit ?: 'liter');
                    } elseif ($measurement === 'length') {
                        $baseUnit = 'm';
                    } else {
                        $baseUnit = $baseUnit ?: 'pcs';
                    }

                    DB::table('stock_items')
                        ->where('id', $item->id)
                        ->update([
                            'measurement_type' => $measurement,
                            'base_unit_of_measure' => $baseUnit,
                        ]);
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('stock_items', function (Blueprint $table) {
            if (Schema::hasColumn('stock_items', 'measurement_type')) {
                $table->dropColumn('measurement_type');
            }
        });
    }
};


