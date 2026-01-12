<?php

namespace App\Traits;

trait HasWorkflowSteps
{

    protected function resolveWorkflowSteps(): ?array
    {
        if (isset($this->jobType) && $this->jobType && $this->jobType->workflow_steps) {
            return $this->jobType->workflow_steps;
        }

        if (!empty($this->custom_workflow_steps)) {
            return $this->custom_workflow_steps;
        }

        return null;
    }

    protected function isWorkflowStepEnabled(array $workflowSteps, string $step): bool
    {
        // Support array format: ['printing', 'cutting', ...]
        if (array_is_list($workflowSteps)) {
            return in_array($step, $workflowSteps, true);
        }

        // Support keyed map formats:
        // - { printing: true }
        // - { printing: { enabled: true } }
        if (!isset($workflowSteps[$step])) {
            return false;
        }

        $data = $workflowSteps[$step];
        if (is_array($data) && isset($data['enabled'])) {
            return (bool) $data['enabled'];
        }

        return (bool) $data;
    }

    public function getFirstWorkflowStep(): ?string
    {
        $workflowSteps = $this->resolveWorkflowSteps();
        if (!$workflowSteps) {
            return null;
        }


        $stepOrder = [

            'printing',
            'lamination_heatpress',
            'cutting',
            'sewing',
            'dtf_press',
            'embroidery',
            'knitting',
            'lasser_cutting',
            'qa',
        ];


        foreach ($stepOrder as $step) {
            if ($this->isWorkflowStepEnabled($workflowSteps, $step)) {
                return $step;
            }
        }

        return null;
    }


    public function getNextWorkflowStep(): ?string
    {
        $workflowSteps = $this->resolveWorkflowSteps();
        if (!$workflowSteps || !$this->current_workflow_step) {
            return null;
        }


        $stepOrder = [

            'printing',
            'lamination_heatpress',
            'cutting',
            'sewing',
            'dtf_press',
            'embroidery',
            'knitting',
            'lasser_cutting',
            'qa',
        ];


        $currentIndex = array_search($this->current_workflow_step, $stepOrder);

        if ($currentIndex === false) {
            return $this->getFirstWorkflowStep();
        }


        for ($i = $currentIndex + 1; $i < count($stepOrder); $i++) {
            $step = $stepOrder[$i];
            if ($this->isWorkflowStepEnabled($workflowSteps, $step)) {
                return $step;
            }
        }


        return null;
    }


    public function getPreviousWorkflowStep(): ?string
    {
        $workflowSteps = $this->resolveWorkflowSteps();
        if (!$workflowSteps || !$this->current_workflow_step) {
            return null;
        }


        $stepOrder = [

            'printing',
            'lamination_heatpress',
            'cutting',
            'sewing',
            'dtf_press',
            'embroidery',
            'knitting',
            'lasser_cutting',
            'qa',
        ];


        $currentIndex = array_search($this->current_workflow_step, $stepOrder);

        if ($currentIndex === false || $currentIndex === 0) {
            return null;
        }


        for ($i = $currentIndex - 1; $i >= 0; $i--) {
            $step = $stepOrder[$i];
            if ($this->isWorkflowStepEnabled($workflowSteps, $step)) {
                return $step;
            }
        }

        return null;
    }


    public function getActiveWorkflowSteps(): array
    {
        $workflowSteps = $this->resolveWorkflowSteps();
        if (!$workflowSteps) {
            return [];
        }


        $stepOrder = [

            'printing',
            'lamination_heatpress',
            'cutting',
            'sewing',
            'dtf_press',
            'embroidery',
            'knitting',
            'lasser_cutting',
            'qa',
        ];

        $activeSteps = [];
        foreach ($stepOrder as $step) {
            if ($this->isWorkflowStepEnabled($workflowSteps, $step)) {
                $activeSteps[] = $step;
            }
        }

        return $activeSteps;
    }


    public function getWorkflowProgress(): int
    {
        $activeSteps = $this->getActiveWorkflowSteps();

        if (empty($activeSteps)) {
            return 0;
        }

        if (!$this->current_workflow_step) {
            return 0;
        }

        $currentIndex = array_search($this->current_workflow_step, $activeSteps);

        if ($currentIndex === false) {
            return 0;
        }


        return (int) round((($currentIndex + 1) / count($activeSteps)) * 100);
    }


    public function advanceWorkflowStep(): bool
    {
        $nextStep = $this->getNextWorkflowStep();

        if ($nextStep === null) {

            $this->update([
                'status' => 'completed',
                'current_workflow_step' => null,
            ]);
            return false;
        }

        $this->update([
            'current_workflow_step' => $nextStep,
        ]);

        return true;
    }


    public function revertWorkflowStep(): bool
    {
        $previousStep = $this->getPreviousWorkflowStep();

        if ($previousStep === null) {
            return false;
        }

        $this->update([
            'current_workflow_step' => $previousStep,
        ]);

        return true;
    }


    public function initializeWorkflow(): void
    {
        if (!$this->current_workflow_step) {
            $firstStep = $this->getFirstWorkflowStep();
            if ($firstStep) {
                $this->update([
                    'current_workflow_step' => $firstStep,
                ]);
            }
        }
    }
}
