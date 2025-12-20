<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('workflow_steps', function (Blueprint $table) {
            $table->id();
            $table->string('step_key', 50)->unique();
            $table->string('step_name', 100);
            $table->integer('step_order');
            $table->string('icon', 50)->default('ti-package');
            $table->string('color', 20)->default('#2196F3');
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('step_key');
            $table->index('step_order');
        });

        // Insert default workflow steps
        DB::table('workflow_steps')->insert([
            [
                'step_key' => 'printing',
                'step_name' => 'Printing',
                'step_order' => 1,
                'icon' => 'ti-printer',
                'color' => '#2196F3',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'step_key' => 'lamination_heatpress',
                'step_name' => 'Lamination/Heatpress',
                'step_order' => 2,
                'icon' => 'ti-layers',
                'color' => '#FF9800',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'step_key' => 'cutting',
                'step_name' => 'Cutting',
                'step_order' => 3,
                'icon' => 'ti-cut',
                'color' => '#F44336',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'step_key' => 'sewing',
                'step_name' => 'Sewing',
                'step_order' => 4,
                'icon' => 'ti-pin-alt',
                'color' => '#E91E63',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'step_key' => 'dtf_press',
                'step_name' => 'DTF Press',
                'step_order' => 5,
                'icon' => 'ti-stamp',
                'color' => '#673AB7',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'step_key' => 'qa',
                'step_name' => 'Quality Assurance',
                'step_order' => 6,
                'icon' => 'ti-check-box',
                'color' => '#4CAF50',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('workflow_steps');
    }
};

