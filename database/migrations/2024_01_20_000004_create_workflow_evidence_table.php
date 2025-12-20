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
        Schema::create('workflow_evidence', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ticket_id')->constrained('tickets')->onDelete('cascade');
            $table->string('workflow_step', 50);
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('workflow_log_id')->nullable()->constrained('workflow_logs')->onDelete('set null');
            
            // File information
            $table->string('file_name');
            $table->string('file_path', 500);
            $table->integer('file_size')->nullable();
            $table->string('mime_type', 100)->nullable();
            
            // Metadata
            $table->timestamp('uploaded_at')->useCurrent();
            $table->text('notes')->nullable();
            $table->timestamps();
            
            $table->index(['ticket_id', 'workflow_step']);
            $table->index('user_id');
            $table->index('uploaded_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('workflow_evidence');
    }
};

