<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\StockItem;
use App\Models\JobType;
use App\Models\JobTypeStockRequirement;

class InventorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get first job type for linking (or create sample if none exist)
        $jobType = JobType::first();
        
        if (!$jobType) {
            $this->command->warn('No job types found. Please create job types first.');
            return;
        }

        // Create sample stock items for a printing shop (T-shirt, tarpaulin, mugs, etc.)
        $stockItems = [
            [
                'job_type_id' => $jobType->id,
                'sku' => 'TARPAULIN-3X4',
                'name' => 'Tarpaulin 3ft x 4ft',
                'description' => 'Standard tarpaulin sheet for printing',
                'base_unit_of_measure' => 'pcs',
                'length' => 3,
                'width' => 4,
                'is_area_based' => true,
                'current_stock' => 50,
                'minimum_stock_level' => 10,
                'maximum_stock_level' => 200,
                'unit_cost' => 150.00,
                'supplier' => 'Material Supplies Co.',
                'location' => 'Warehouse A',
                'is_active' => true,
            ],
            [
                'job_type_id' => $jobType->id,
                'sku' => 'TARPAULIN-4X6',
                'name' => 'Tarpaulin 4ft x 6ft',
                'description' => 'Large tarpaulin sheet for printing',
                'base_unit_of_measure' => 'pcs',
                'length' => 4,
                'width' => 6,
                'is_area_based' => true,
                'current_stock' => 30,
                'minimum_stock_level' => 5,
                'maximum_stock_level' => 100,
                'unit_cost' => 250.00,
                'supplier' => 'Material Supplies Co.',
                'location' => 'Warehouse A',
                'is_active' => true,
            ],
            [
                'job_type_id' => $jobType->id,
                'sku' => 'TSHIRT-WHITE-M',
                'name' => 'White T-Shirt Medium',
                'description' => 'White cotton t-shirt for printing',
                'base_unit_of_measure' => 'pcs',
                'is_area_based' => false,
                'current_stock' => 100,
                'minimum_stock_level' => 20,
                'maximum_stock_level' => 500,
                'unit_cost' => 120.00,
                'supplier' => 'Apparel Supplier',
                'location' => 'Warehouse B',
                'is_active' => true,
            ],
            [
                'job_type_id' => $jobType->id,
                'sku' => 'MUG-WHITE',
                'name' => 'White Ceramic Mug',
                'description' => 'White ceramic mug for sublimation printing',
                'base_unit_of_measure' => 'pcs',
                'is_area_based' => false,
                'current_stock' => 80,
                'minimum_stock_level' => 15,
                'maximum_stock_level' => 300,
                'unit_cost' => 45.00,
                'supplier' => 'Mug Supplier',
                'location' => 'Warehouse B',
                'is_active' => true,
            ],
        ];

        foreach ($stockItems as $item) {
            StockItem::create($item);
        }

        // Create stock requirements linking job types to stock items
        $stockItemsCreated = StockItem::all();

        if ($stockItemsCreated->count() > 0) {
            // Link each stock item to its job type with requirement
            foreach ($stockItemsCreated as $stockItem) {
                if ($stockItem->job_type_id) {
                    JobTypeStockRequirement::updateOrCreate(
                        [
                            'job_type_id' => $stockItem->job_type_id,
                            'stock_item_id' => $stockItem->id,
                        ],
                        [
                            'quantity_per_unit' => $stockItem->is_area_based ? 0 : 1, // For area-based, calculation is done by area
                            'is_required' => true,
                            'notes' => $stockItem->is_area_based 
                                ? 'Area-based material - calculated from production dimensions' 
                                : 'Standard 1:1 consumption',
                        ]
                    );
                }
            }
        }

        $this->command->info('Sample inventory data seeded successfully!');
        $this->command->info('Created ' . $stockItemsCreated->count() . ' stock items.');
    }
}

