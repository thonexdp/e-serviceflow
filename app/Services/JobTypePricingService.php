<?php

namespace App\Services;

use App\Models\JobType;

class JobTypePricingService
{
    public function sync(JobType $jobType, array $priceTiers, array $sizeRates): void
    {
        $this->syncPriceTiers($jobType, $priceTiers);
        $this->syncSizeRates($jobType, $sizeRates);
    }

    private function syncPriceTiers(JobType $jobType, array $priceTiers): void
    {
        $filtered = collect($priceTiers)
            ->filter(fn($tier) => isset($tier['min_quantity']) && isset($tier['price']))
            ->map(function ($tier) {
                $min = (int)$tier['min_quantity'];
                $max = isset($tier['max_quantity']) ? (int)$tier['max_quantity'] : null;

                return [
                    'label' => $tier['label'] ?? null,
                    'min_quantity' => $min,
                    'max_quantity' => ($max !== null && $max >= $min) ? $max : null,
                    'price' => (float)$tier['price'],
                    'notes' => $tier['notes'] ?? null,
                ];
            })
            ->values();

        $jobType->priceTiers()->delete();

        if ($filtered->isNotEmpty()) {
            $jobType->priceTiers()->createMany($filtered->toArray());
        }
    }

    private function syncSizeRates(JobType $jobType, array $sizeRates): void
    {
        $rates = [];
        $collection = collect($sizeRates)->filter(fn($r) => isset($r['rate']));
        $defaultAssigned = false;

        foreach ($collection as $rate) {
            $isDefault = $rate['is_default'] ?? false;

            if ($isDefault && !$defaultAssigned) {
                $defaultAssigned = true;
            } else {
                $isDefault = false;
            }

            $rates[] = [
                'variant_name' => $rate['variant_name'] ?? null,
                'description' => $rate['description'] ?? null,
                'calculation_method' => $rate['calculation_method'] ?? 'area',
                'dimension_unit' => $rate['dimension_unit'] ?? 'ft',
                'rate' => (float)$rate['rate'],
                'min_width' => $rate['min_width'] ?? null,
                'max_width' => $rate['max_width'] ?? null,
                'min_height' => $rate['min_height'] ?? null,
                'max_height' => $rate['max_height'] ?? null,
                'is_default' => $isDefault,
            ];
        }

        if (!$defaultAssigned && !empty($rates)) {
            $rates[0]['is_default'] = true;
        }

        $jobType->sizeRates()->delete();
        $jobType->sizeRates()->createMany($rates);
    }
}
