<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\StockItem;
use App\Models\JobType;
use Illuminate\Support\Str;

class StockItemSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        $items = [
            ['name' => 'CAP', 'is_area_based' => false],
            ['name' => 'FOLDABLE FAN', 'is_area_based' => false],
            ['name' => 'JERSEY SHORT', 'is_area_based' => false],
            ['name' => 'JERSEY UPPER (Nba Cut 180gsm)', 'is_area_based' => false],
            ['name' => 'JERSEY UPPER (plain Cut 180gsm)', 'is_area_based' => false],
            ['name' => 'KEYCHAIN', 'is_area_based' => false],
            ['name' => 'LANYARD', 'is_area_based' => false],
            ['name' => 'LONG SLEEVES', 'is_area_based' => false],
            ['name' => 'MAGNET', 'is_area_based' => false],
            ['name' => 'Mug', 'is_area_based' => false],
            ['name' => 'Panaflex', 'is_area_based' => true],
            ['name' => 'Plaint Tshirt', 'is_area_based' => false],
            ['name' => 'POLO SHIRT', 'is_area_based' => false],
            ['name' => 'raglan', 'is_area_based' => false],
            ['name' => 'sinage installation', 'is_area_based' => true],
            ['name' => 'Tarpaulin', 'is_area_based' => true],
            ['name' => 'THUMBLER', 'is_area_based' => false],
            ['name' => 'TOTE BAG', 'is_area_based' => false],
            ['name' => 'TSHIRT (180gsm', 'is_area_based' => false],
            ['name' => 'Tshirt back print only (DTF)', 'is_area_based' => false],
            ['name' => 'Tshirt front print (DTF)', 'is_area_based' => false],
            ['name' => 'Tshirt white', 'is_area_based' => false],
            ['name' => 'WARMER with hood (180gsm)', 'is_area_based' => false],
        ];

        foreach ($items as $item) {
            // Attempt to find a matching JobType
            $jobType = JobType::where('name', 'LIKE', '%' . $item['name'] . '%')->first();

            $isArea = $item['is_area_based'];

            // Generate SKU
            $sku = 'STK-' . strtoupper(substr(Str::slug($item['name']), 0, 8)) . '-' . rand(100, 999);

            $stockData = [
                'job_type_id' => $jobType ? $jobType->id : null,
                'sku' => $sku,
                'name' => $item['name'],
                'description' => 'Stock item for ' . $item['name'],
                'category' => 'General',
                'base_unit_of_measure' => $isArea ? 'sqft' : 'pcs',
                'unit_cost' => rand(500, 5000) / 100, // Random cost between 5.00 and 50.00
                'current_stock' => rand(50, 200), // Initial stock
                'minimum_stock_level' => 10,
                'maximum_stock_level' => 500,
                'supplier' => 'Test Supplier',
                'location' => 'Zone A',
                'is_active' => true,
                'is_area_based' => $isArea,
            ];

            if ($isArea) {
                $stockData['length'] = 100.00; // Example length
                $stockData['width'] = 50.00;   // Example width
            } else {
                $stockData['length'] = null;
                $stockData['width'] = null;
            }

            StockItem::updateOrCreate(
                ['name' => $item['name']], // Check by name to avoid duplicates if re-run
                $stockData
            );
        }
    }
}
