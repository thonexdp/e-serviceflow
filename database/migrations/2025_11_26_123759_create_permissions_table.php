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
        Schema::create('permissions', function (Blueprint $table) {
            $table->id();
            $table->string('module'); // e.g., 'tickets', 'customers', 'inventory', etc.
            $table->string('feature'); // e.g., 'create', 'read', 'update', 'delete', 'price_edit'
            $table->string('label'); // Human-readable label
            $table->string('description')->nullable();
            $table->string('role')->nullable();
            $table->timestamps();

            // Ensure unique combination of module and feature
            $table->unique(['module', 'feature']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('permissions');
    }
};
