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
        Schema::create('workflow_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ticket_id')->constrained('tickets')->onDelete('cascade');
            $table->string('workflow_step', 50);
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            
            // Tracking fields
            $table->enum('status', ['pending', 'in_progress', 'completed'])->default('pending');
            $table->integer('quantity_produced')->default(0);
            
            // Timestamps
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            
            // Additional info
            $table->text('notes')->nullable();
            $table->timestamps();
            
            // Indexes
            $table->index(['ticket_id', 'workflow_step']);
            $table->index(['user_id', 'workflow_step']);
            $table->index('status');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('workflow_logs');
    }
};

