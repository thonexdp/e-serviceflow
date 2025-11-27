<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\ValidationException;

class JobTypeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // add permissions later if needed
    }

    public function rules(): array
    {
        return [
            'category_id' => 'required|exists:job_categories,id',
            'name' => 'required|string|max:120',
            'description' => 'nullable|string',
            'price' => 'required|numeric|min:0',
            'price_by' => 'required|in:pcs,sqm,length',
            'discount' => 'nullable|numeric|min:0|max:100',
            'promo_text' => 'nullable|string|max:255',
            'is_active' => 'boolean',
            'sort_order' => 'nullable|integer|min:0',

            // Price tiers
            'price_tiers' => 'nullable|array',
            'price_tiers.*.label' => 'nullable|string|max:120',
            'price_tiers.*.min_quantity' => 'required_with:price_tiers.*.price|integer|min:1',
            'price_tiers.*.max_quantity' => 'nullable|integer|min:1',
            'price_tiers.*.price' => 'required_with:price_tiers.*.min_quantity|numeric|min:0',
            'price_tiers.*.notes' => 'nullable|string|max:255',

            // Size rates
            'size_rates' => 'nullable|array',
            'size_rates.*.variant_name' => 'nullable|string|max:120',
            'size_rates.*.description' => 'nullable|string|max:255',
            'size_rates.*.calculation_method' => 'required_with:size_rates|in:area,length',
            'size_rates.*.dimension_unit' => 'required_with:size_rates|in:ft,m,cm,in',
            'size_rates.*.rate' => 'required_with:size_rates|numeric|min:0',
            'size_rates.*.min_width' => 'nullable|numeric|min:0',
            'size_rates.*.max_width' => 'nullable|numeric|min:0',
            'size_rates.*.min_height' => 'nullable|numeric|min:0',
            'size_rates.*.max_height' => 'nullable|numeric|min:0',
            'size_rates.*.is_default' => 'boolean',

            // Promo rules
            'promo_rules' => 'nullable|array',
            'promo_rules.*.buy_quantity' => 'required_with:promo_rules.*.free_quantity|integer|min:1',
            'promo_rules.*.free_quantity' => 'required_with:promo_rules.*.buy_quantity|integer|min:1',
            'promo_rules.*.description' => 'nullable|string|max:255',
            'promo_rules.*.is_active' => 'boolean',

            'workflow_steps' => 'nullable|array',
        ];
    }

    public function after()
    {
        return [
            function () {
                // Additional custom validation
                $priceTiers = $this->input('price_tiers', []);

                foreach ($priceTiers as $tier) {
                    if (isset($tier['max_quantity']) && $tier['max_quantity'] < $tier['min_quantity']) {
                        throw ValidationException::withMessages([
                            'price_tiers' => ['Max quantity must be greater than or equal to min quantity.'],
                        ]);
                    }
                }
            }
        ];
    }
}
