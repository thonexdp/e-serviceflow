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
        Schema::create('ticket_workflow_progress', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ticket_id')->constrained('tickets')->onDelete('cascade');
            $table->string('workflow_step', 50); // e.g., 'design', 'printing', 'cutting', etc.
            $table->integer('completed_quantity')->default(0); // Quantity completed in this step
            $table->boolean('is_completed')->default(false); // Whether this step is fully completed
            $table->timestamp('completed_at')->nullable();
            $table->foreignId('completed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            
            // Ensure one progress record per ticket per workflow step
            $table->unique(['ticket_id', 'workflow_step']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ticket_workflow_progress');
    }
};
