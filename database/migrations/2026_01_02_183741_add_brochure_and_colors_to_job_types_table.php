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
        Schema::table('job_types', function (Blueprint $table) {
            $table->string('brochure_link')->nullable()->after('promo_text');
            $table->boolean('has_colors')->default(false)->after('brochure_link');
            $table->json('available_colors')->nullable()->after('has_colors');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('job_types', function (Blueprint $table) {
            $table->dropColumn(['brochure_link', 'has_colors', 'available_colors']);
        });
    }
};
