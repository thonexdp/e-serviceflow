<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class JobDataSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Schema::disableForeignKeyConstraints();

        // 1. Job Categories
        DB::table('job_categories')->truncate();
        DB::unprepared("
            INSERT INTO `job_categories` (`id`, `name`, `created_at`, `updated_at`, `deleted_at`) VALUES 
            (1,'Mugs','2025-12-05 14:51:06','2025-12-07 14:08:53','2025-12-07 14:08:53'),
            (2,'SOUVERNIERS','2025-12-07 14:09:05','2025-12-07 14:09:05',NULL),
            (3,'SUBLIMATION PRINTING','2025-12-07 14:09:26','2025-12-07 14:09:26',NULL),
            (4,'TSHIRT Printing','2025-12-07 14:09:55','2025-12-07 14:09:55',NULL),
            (5,'CUSTOM MADE','2025-12-07 14:10:16','2025-12-07 14:10:16',NULL),
            (6,'ADVERTISING PRINTING','2025-12-07 14:10:30','2025-12-07 14:10:30',NULL);
        ");

        // 2. Job Types
        // Explicitly specifying columns to avoid mismatch with extra columns like image_path
        DB::table('job_types')->truncate();
        DB::unprepared("
            INSERT INTO `job_types` (`id`, `category_id`, `name`, `description`, `price`, `price_by`, `discount`, `promo_text`, `is_active`, `sort_order`, `workflow_steps`, `created_at`, `updated_at`, `deleted_at`) VALUES 
            (1,1,'Mugs Item',NULL,100.00,'pcs',NULL,NULL,1,0,'{\"design\":true,\"printing\":true,\"lamination_heatpress\":false,\"cutting\":false,\"sewing\":false,\"dtf_press\":true}','2025-12-05 14:51:46','2025-12-07 14:08:47','2025-12-07 14:08:47'),
            (2,2,'Mug',NULL,95.00,'pcs',NULL,NULL,1,0,'{\"design\":true,\"printing\":true,\"lamination_heatpress\":false,\"cutting\":false,\"sewing\":false,\"dtf_press\":false}','2025-12-09 15:49:13','2025-12-09 15:49:13',NULL),
            (3,2,'FOLDABLE FAN',NULL,24.00,'pcs',NULL,NULL,1,0,'{\"design\":true,\"printing\":true,\"lamination_heatpress\":false,\"cutting\":false,\"sewing\":false,\"dtf_press\":false}','2025-12-09 15:50:13','2025-12-09 15:50:13',NULL),
            (4,2,'KEYCHAIN',NULL,15.00,'pcs',NULL,NULL,1,0,'{\"design\":true,\"printing\":true,\"lamination_heatpress\":false,\"cutting\":false,\"sewing\":false,\"dtf_press\":false}','2025-12-09 15:50:43','2025-12-09 15:50:43',NULL),
            (5,2,'THUMBLER',NULL,120.00,'pcs',NULL,NULL,1,0,'{\"design\":true,\"printing\":true,\"lamination_heatpress\":false,\"cutting\":false,\"sewing\":false,\"dtf_press\":false}','2025-12-09 15:51:05','2025-12-09 15:51:05',NULL),
            (6,3,'BASKET BALL JERSEY (SET)',NULL,750.00,'pcs',NULL,NULL,1,0,'{\"design\":true,\"printing\":true,\"lamination_heatpress\":true,\"cutting\":true,\"sewing\":true,\"dtf_press\":true}','2025-12-09 15:53:34','2025-12-09 15:53:34',NULL),
            (7,3,'JERSEY UPPER (Nba Cut 180gsm)',NULL,378.00,'pcs',NULL,NULL,1,0,'{\"design\":true,\"printing\":true,\"lamination_heatpress\":true,\"cutting\":true,\"sewing\":true,\"dtf_press\":true}','2025-12-09 15:54:02','2025-12-09 15:54:02',NULL),
            (8,3,'JERSEY SHORT',NULL,369.00,'pcs',NULL,NULL,1,0,'{\"design\":true,\"printing\":true,\"lamination_heatpress\":true,\"cutting\":true,\"sewing\":true,\"dtf_press\":true}','2025-12-09 15:54:24','2025-12-09 15:54:24',NULL),
            (9,4,'Tshirt front print  (DTF)',NULL,170.00,'pcs',NULL,NULL,1,0,'{\"design\":true,\"printing\":true,\"lamination_heatpress\":true,\"cutting\":true,\"sewing\":true,\"dtf_press\":false}','2025-12-09 15:54:59','2025-12-09 15:54:59',NULL),
            (10,4,'Tshirt back print only (DTF)',NULL,170.00,'pcs',NULL,NULL,1,0,'{\"design\":true,\"printing\":true,\"lamination_heatpress\":true,\"cutting\":true,\"sewing\":true,\"dtf_press\":false}','2025-12-09 15:55:31','2025-12-09 15:55:31',NULL),
            (11,4,'Tshirt white',NULL,158.00,'pcs',NULL,NULL,1,0,'{\"design\":true,\"printing\":false,\"lamination_heatpress\":false,\"cutting\":true,\"sewing\":true,\"dtf_press\":true}','2025-12-09 15:55:59','2025-12-09 15:55:59',NULL),
            (12,5,'Plaint Tshirt',NULL,168.00,'pcs',NULL,NULL,1,0,'{\"design\":true,\"printing\":false,\"lamination_heatpress\":false,\"cutting\":true,\"sewing\":true,\"dtf_press\":false}','2025-12-09 15:56:22','2025-12-09 15:56:22',NULL),
            (13,5,'raglan',NULL,180.00,'pcs',NULL,NULL,1,0,'{\"design\":true,\"printing\":false,\"lamination_heatpress\":false,\"cutting\":true,\"sewing\":true,\"dtf_press\":false}','2025-12-09 15:56:49','2025-12-09 15:56:49',NULL),
            (14,6,'Tarpaulin',NULL,0.00,'pcs',NULL,NULL,1,0,'{\"design\":true,\"printing\":true,\"lamination_heatpress\":true,\"cutting\":true,\"sewing\":false,\"dtf_press\":false}','2025-12-09 15:59:03','2025-12-09 15:59:03',NULL),
            (15,6,'Panaflex',NULL,0.00,'pcs',NULL,NULL,1,0,'{\"design\":true,\"printing\":true,\"lamination_heatpress\":true,\"cutting\":true,\"sewing\":false,\"dtf_press\":false}','2025-12-09 16:00:19','2025-12-09 16:00:19',NULL),
            (16,6,'sinage installation',NULL,1500.00,'pcs',NULL,NULL,1,0,'{\"design\":true,\"printing\":true,\"lamination_heatpress\":false,\"cutting\":true,\"sewing\":false,\"dtf_press\":false}','2025-12-09 16:00:41','2025-12-09 16:00:41',NULL),
            (17,2,'CAP',NULL,150.00,'pcs',NULL,NULL,1,0,'{\"design\":true,\"printing\":true,\"lamination_heatpress\":false,\"cutting\":false,\"sewing\":true,\"dtf_press\":false}','2025-12-12 08:28:06','2025-12-12 08:28:06',NULL),
            (18,2,'TOTE BAG',NULL,130.00,'pcs',NULL,NULL,1,0,'{\"design\":true,\"printing\":true,\"lamination_heatpress\":false,\"cutting\":true,\"sewing\":true,\"dtf_press\":true}','2025-12-12 08:28:37','2025-12-12 08:28:37',NULL),
            (19,2,'LANYARD',NULL,60.00,'pcs',NULL,NULL,1,0,'{\"design\":true,\"printing\":true,\"lamination_heatpress\":false,\"cutting\":true,\"sewing\":true,\"dtf_press\":false}','2025-12-12 08:29:08','2025-12-12 08:29:08',NULL),
            (20,2,'MAGNET',NULL,15.00,'pcs',NULL,NULL,1,0,'{\"design\":true,\"printing\":false,\"lamination_heatpress\":false,\"cutting\":true,\"sewing\":true,\"dtf_press\":false}','2025-12-12 08:29:33','2025-12-12 08:29:33',NULL),
            (21,3,'JERSEY UPPER (plain Cut 180gsm',NULL,370.00,'pcs',NULL,NULL,1,0,'{\"design\":true,\"printing\":true,\"lamination_heatpress\":true,\"cutting\":false,\"sewing\":true,\"dtf_press\":false}','2025-12-12 08:30:33','2025-12-12 08:30:33',NULL),
            (22,3,'WARMER with hood (180gsm)',NULL,500.00,'pcs',NULL,NULL,1,0,'{\"design\":true,\"printing\":true,\"lamination_heatpress\":true,\"cutting\":false,\"sewing\":true,\"dtf_press\":true}','2025-12-12 08:31:10','2025-12-12 08:31:10',NULL),
            (23,3,'TSHIRT (180gsm',NULL,379.00,'pcs',NULL,NULL,1,0,'{\"design\":true,\"printing\":true,\"lamination_heatpress\":true,\"cutting\":true,\"sewing\":true,\"dtf_press\":true}','2025-12-12 08:31:42','2025-12-12 08:31:42',NULL),
            (24,3,'POLO SHIRT',NULL,449.00,'pcs',NULL,NULL,1,0,'{\"design\":true,\"printing\":true,\"lamination_heatpress\":true,\"cutting\":true,\"sewing\":true,\"dtf_press\":true}','2025-12-12 08:32:14','2025-12-12 08:32:14',NULL),
            (25,3,'LONG SLEEVES',NULL,448.00,'pcs',NULL,NULL,1,0,'{\"design\":true,\"printing\":true,\"lamination_heatpress\":true,\"cutting\":true,\"sewing\":true,\"dtf_press\":true}','2025-12-12 08:32:48','2025-12-12 08:32:48',NULL);
        ");

        // 3. Price Tiers
        DB::table('job_type_price_tiers')->truncate();
        DB::unprepared("
            INSERT INTO `job_type_price_tiers` (`id`, `job_type_id`, `label`, `min_quantity`, `max_quantity`, `price`, `notes`, `created_at`, `updated_at`) VALUES 
            (2,6,'100-150 / 700 pesos',100,150,700.00,NULL,'2025-12-09 15:53:34','2025-12-09 15:53:34'),
            (3,2,'100-150 / 90 pesos',100,150,90.00,NULL,'2025-12-17 06:06:09','2025-12-17 06:06:09');
        ");

        // 4. Size Rates
        DB::table('job_type_size_rates')->truncate();
        DB::unprepared("
           INSERT INTO `job_type_size_rates` (`id`, `job_type_id`, `variant_name`, `description`, `calculation_method`, `dimension_unit`, `rate`, `min_width`, `max_width`, `min_height`, `max_height`, `is_default`, `created_at`, `updated_at`) VALUES 
           (1,14,'READY TO PRINT',NULL,'area','ft',15.00,1.00,2.00,1.00,3.00,1,'2025-12-09 15:59:03','2025-12-09 15:59:03'),
           (2,14,'DESIGN AND PRINT',NULL,'area','ft',22.00,1.00,2.00,1.00,3.00,0,'2025-12-09 15:59:03','2025-12-09 15:59:03'),
           (3,15,'READY TO PRINT',NULL,'area','ft',50.00,1.00,2.00,1.00,3.00,1,'2025-12-09 16:00:19','2025-12-09 16:00:19'),
           (4,15,'DESIGN AND PRINT',NULL,'area','ft',80.00,1.00,2.00,1.00,3.00,0,'2025-12-09 16:00:19','2025-12-09 16:00:19');
        ");

        // 5. Promo Rules
        DB::table('job_type_promo_rules')->truncate();
        DB::unprepared("
            INSERT INTO `job_type_promo_rules` (`id`, `job_type_id`, `buy_quantity`, `free_quantity`, `description`, `is_active`, `created_at`, `updated_at`) VALUES 
            (1,8,12,1,'Buy 12, Get 1',1,'2025-12-15 12:05:12','2025-12-15 12:05:12'),
            (2,7,12,1,'Buy 12, Get 1',1,'2025-12-15 12:05:46','2025-12-15 12:05:46');
        ");

        Schema::enableForeignKeyConstraints();
    }
}
