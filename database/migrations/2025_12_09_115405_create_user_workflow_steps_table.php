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
        Schema::create('user_workflow_steps', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->string('workflow_step', 50); // e.g., 'design', 'printing', 'cutting', etc.
            $table->timestamps();
            
            // Ensure a user can only be assigned to a workflow step once
            $table->unique(['user_id', 'workflow_step']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_workflow_steps');
    }
};
