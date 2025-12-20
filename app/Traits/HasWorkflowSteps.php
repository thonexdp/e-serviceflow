<?php

namespace App\Traits;

trait HasWorkflowSteps
{
    /**
     * Get the first active workflow step for this ticket based on its job type.
     * 
     * @return string|null
     */
    public function getFirstWorkflowStep(): ?string
    {
        if (!$this->jobType || !$this->jobType->workflow_steps) {
            return null;
        }

        $workflowSteps = $this->jobType->workflow_steps;

        // Define the order of workflow steps
        $stepOrder = [
            // 'design',
            'printing',
            'lamination_heatpress',
            'cutting',
            'sewing',
            'dtf_press',
            // 'assembly',
            // 'quality_check',
        ];

        // Find the first enabled step
        foreach ($stepOrder as $step) {
            if (isset($workflowSteps[$step]) && $workflowSteps[$step]) {
                return $step;
            }
        }

        return null;
    }

    /**
     * Get the next workflow step for this ticket.
     * 
     * @return string|null
     */
    public function getNextWorkflowStep(): ?string
    {
        if (!$this->jobType || !$this->jobType->workflow_steps || !$this->current_workflow_step) {
            return null;
        }

        $workflowSteps = $this->jobType->workflow_steps;

        // Define the order of workflow steps
        $stepOrder = [
            // 'design',
            'printing',
            'lamination_heatpress',
            'cutting',
            'sewing',
            'dtf_press',
            // 'assembly',
            // 'quality_check',
        ];

        // Find current step index
        $currentIndex = array_search($this->current_workflow_step, $stepOrder);

        if ($currentIndex === false) {
            return $this->getFirstWorkflowStep();
        }

        // Find the next enabled step
        for ($i = $currentIndex + 1; $i < count($stepOrder); $i++) {
            $step = $stepOrder[$i];
            if (isset($workflowSteps[$step]) && $workflowSteps[$step]) {
                return $step;
            }
        }

        // No more steps, workflow is complete
        return null;
    }

    /**
     * Get the previous workflow step for this ticket.
     * 
     * @return string|null
     */
    public function getPreviousWorkflowStep(): ?string
    {
        if (!$this->jobType || !$this->jobType->workflow_steps || !$this->current_workflow_step) {
            return null;
        }

        $workflowSteps = $this->jobType->workflow_steps;

        // Define the order of workflow steps
        $stepOrder = [
            // 'design',
            'printing',
            'lamination_heatpress',
            'cutting',
            'sewing',
            'dtf_press',
            // 'assembly',
            // 'quality_check',
        ];

        // Find current step index
        $currentIndex = array_search($this->current_workflow_step, $stepOrder);

        if ($currentIndex === false || $currentIndex === 0) {
            return null;
        }

        // Find the previous enabled step
        for ($i = $currentIndex - 1; $i >= 0; $i--) {
            $step = $stepOrder[$i];
            if (isset($workflowSteps[$step]) && $workflowSteps[$step]) {
                return $step;
            }
        }

        return null;
    }

    /**
     * Get all active workflow steps for this ticket in order.
     * 
     * @return array
     */
    public function getActiveWorkflowSteps(): array
    {
        if (!$this->jobType || !$this->jobType->workflow_steps) {
            return [];
        }

        $workflowSteps = $this->jobType->workflow_steps;

        // Define the order of workflow steps
        $stepOrder = [
            // 'design',
            'printing',
            'lamination_heatpress',
            'cutting',
            'sewing',
            'dtf_press',
            // 'assembly',
            // 'quality_check',
        ];

        $activeSteps = [];
        foreach ($stepOrder as $step) {
            if (isset($workflowSteps[$step]) && $workflowSteps[$step]) {
                $activeSteps[] = $step;
            }
        }

        return $activeSteps;
    }

    /**
     * Calculate workflow progress percentage.
     * 
     * @return int Progress percentage (0-100)
     */
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

        // Calculate percentage based on completed steps
        return (int) round((($currentIndex + 1) / count($activeSteps)) * 100);
    }

    /**
     * Advance to the next workflow step.
     * 
     * @return bool True if advanced, false if already at last step
     */
    public function advanceWorkflowStep(): bool
    {
        $nextStep = $this->getNextWorkflowStep();

        if ($nextStep === null) {
            // No more steps, mark as completed
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

    /**
     * Move back to the previous workflow step.
     * 
     * @return bool True if moved back, false if already at first step
     */
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

    /**
     * Initialize workflow step when starting production.
     * 
     * @return void
     */
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
