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
        // Create sample stock items for a printing shop
        $stockItems = [
            [
                'sku' => 'PAPER-A4-80GSM',
                'name' => 'A4 Paper 80gsm',
                'description' => 'Standard A4 printing paper, 80gsm weight',
                'category' => 'Paper',
                'base_unit_of_measure' => 'ream',
                'current_stock' => 50,
                'minimum_stock_level' => 10,
                'maximum_stock_level' => 200,
                'unit_cost' => 25.00,
                'supplier' => 'Paper Supplies Co.',
                'location' => 'Warehouse A',
                'is_active' => true,
            ],
            [
                'sku' => 'PAPER-A3-100GSM',
                'name' => 'A3 Paper 100gsm',
                'description' => 'Premium A3 printing paper, 100gsm weight',
                'category' => 'Paper',
                'base_unit_of_measure' => 'ream',
                'current_stock' => 30,
                'minimum_stock_level' => 5,
                'maximum_stock_level' => 100,
                'unit_cost' => 35.00,
                'supplier' => 'Paper Supplies Co.',
                'location' => 'Warehouse A',
                'is_active' => true,
            ],
            [
                'sku' => 'INK-BLACK-CMYK',
                'name' => 'Black Ink Cartridge',
                'description' => 'CMYK Black ink cartridge for digital printers',
                'category' => 'Ink',
                'base_unit_of_measure' => 'pcs',
                'current_stock' => 20,
                'minimum_stock_level' => 5,
                'maximum_stock_level' => 50,
                'unit_cost' => 45.00,
                'supplier' => 'Ink Solutions Ltd.',
                'location' => 'Storage Room B',
                'is_active' => true,
            ],
            [
                'sku' => 'INK-COLOR-CMYK',
                'name' => 'Color Ink Set (CMYK)',
                'description' => 'Full color CMYK ink set for digital printing',
                'category' => 'Ink',
                'base_unit_of_measure' => 'set',
                'current_stock' => 15,
                'minimum_stock_level' => 3,
                'maximum_stock_level' => 30,
                'unit_cost' => 180.00,
                'supplier' => 'Ink Solutions Ltd.',
                'location' => 'Storage Room B',
                'is_active' => true,
            ],
            [
                'sku' => 'BINDING-SPIRAL',
                'name' => 'Spiral Binding Wire',
                'description' => 'Spiral binding wire for book binding',
                'category' => 'Binding',
                'base_unit_of_measure' => 'pcs',
                'current_stock' => 100,
                'minimum_stock_level' => 20,
                'maximum_stock_level' => 500,
                'unit_cost' => 2.50,
                'supplier' => 'Binding Materials Inc.',
                'location' => 'Warehouse C',
                'is_active' => true,
            ],
            [
                'sku' => 'BINDING-STAPLE',
                'name' => 'Staples Box',
                'description' => 'Standard staples for document binding',
                'category' => 'Binding',
                'base_unit_of_measure' => 'box',
                'current_stock' => 25,
                'minimum_stock_level' => 5,
                'maximum_stock_level' => 100,
                'unit_cost' => 8.00,
                'supplier' => 'Office Supplies Co.',
                'location' => 'Storage Room B',
                'is_active' => true,
            ],
            [
                'sku' => 'LAMINATE-A4',
                'name' => 'A4 Lamination Film',
                'description' => 'A4 size lamination film sheets',
                'category' => 'Lamination',
                'base_unit_of_measure' => 'sheet',
                'current_stock' => 500,
                'minimum_stock_level' => 100,
                'maximum_stock_level' => 2000,
                'unit_cost' => 0.50,
                'supplier' => 'Lamination Supplies',
                'location' => 'Warehouse A',
                'is_active' => true,
            ],
            [
                'sku' => 'CARDSTOCK-300GSM',
                'name' => 'Cardstock 300gsm',
                'description' => 'Heavy cardstock paper for business cards and invitations',
                'category' => 'Paper',
                'base_unit_of_measure' => 'sheet',
                'current_stock' => 200,
                'minimum_stock_level' => 50,
                'maximum_stock_level' => 1000,
                'unit_cost' => 0.75,
                'supplier' => 'Paper Supplies Co.',
                'location' => 'Warehouse A',
                'is_active' => true,
            ],
        ];

        foreach ($stockItems as $item) {
            StockItem::create($item);
        }

        // Link stock items to job types (if job types exist)
        $jobTypes = JobType::all();
        $stockItemsCreated = StockItem::all();

        if ($jobTypes->count() > 0 && $stockItemsCreated->count() > 0) {
            // Example: Link paper to printing job types
            $paperStock = $stockItemsCreated->where('category', 'Paper')->first();
            $inkStock = $stockItemsCreated->where('category', 'Ink')->first();
            $bindingStock = $stockItemsCreated->where('category', 'Binding')->first();

            foreach ($jobTypes as $jobType) {
                // Add paper requirement (1 ream per 100 prints)
                if ($paperStock) {
                    JobTypeStockRequirement::create([
                        'job_type_id' => $jobType->id,
                        'stock_item_id' => $paperStock->id,
                        'quantity_per_unit' => 0.01, // 1 ream per 100 units
                        'is_required' => true,
                        'notes' => 'Standard paper requirement',
                    ]);
                }

                // Add ink requirement (1 cartridge per 500 prints)
                if ($inkStock) {
                    JobTypeStockRequirement::create([
                        'job_type_id' => $jobType->id,
                        'stock_item_id' => $inkStock->id,
                        'quantity_per_unit' => 0.002, // 1 cartridge per 500 units
                        'is_required' => true,
                        'notes' => 'Ink consumption',
                    ]);
                }
            }
        }

        $this->command->info('Sample inventory data seeded successfully!');
        $this->command->info('Created ' . $stockItemsCreated->count() . ' stock items.');
    }
}

