<?php

namespace App\Traits;

trait HasWorkflowSteps
{

    public function getFirstWorkflowStep(): ?string
    {
        if (!$this->jobType || !$this->jobType->workflow_steps) {
            return null;
        }

        $workflowSteps = $this->jobType->workflow_steps;


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

            $isEnabled = false;
            if (isset($workflowSteps[$step])) {
                if (is_array($workflowSteps[$step]) && isset($workflowSteps[$step]['enabled'])) {
                    $isEnabled = $workflowSteps[$step]['enabled'];
                } else {
                    $isEnabled = (bool) $workflowSteps[$step];
                }
            }

            if ($isEnabled) {
                return $step;
            }
        }

        return null;
    }


    public function getNextWorkflowStep(): ?string
    {
        if (!$this->jobType || !$this->jobType->workflow_steps || !$this->current_workflow_step) {
            return null;
        }

        $workflowSteps = $this->jobType->workflow_steps;


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

            $isEnabled = false;
            if (isset($workflowSteps[$step])) {
                if (is_array($workflowSteps[$step]) && isset($workflowSteps[$step]['enabled'])) {
                    $isEnabled = $workflowSteps[$step]['enabled'];
                } else {
                    $isEnabled = (bool) $workflowSteps[$step];
                }
            }

            if ($isEnabled) {
                return $step;
            }
        }


        return null;
    }


    public function getPreviousWorkflowStep(): ?string
    {
        if (!$this->jobType || !$this->jobType->workflow_steps || !$this->current_workflow_step) {
            return null;
        }

        $workflowSteps = $this->jobType->workflow_steps;


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

            $isEnabled = false;
            if (isset($workflowSteps[$step])) {
                if (is_array($workflowSteps[$step]) && isset($workflowSteps[$step]['enabled'])) {
                    $isEnabled = $workflowSteps[$step]['enabled'];
                } else {
                    $isEnabled = (bool) $workflowSteps[$step];
                }
            }

            if ($isEnabled) {
                return $step;
            }
        }

        return null;
    }


    public function getActiveWorkflowSteps(): array
    {
        if (!$this->jobType || !$this->jobType->workflow_steps) {
            return [];
        }

        $workflowSteps = $this->jobType->workflow_steps;


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

            $isEnabled = false;
            if (isset($workflowSteps[$step])) {
                if (is_array($workflowSteps[$step]) && isset($workflowSteps[$step]['enabled'])) {
                    $isEnabled = $workflowSteps[$step]['enabled'];
                } else {
                    $isEnabled = (bool) $workflowSteps[$step];
                }
            }

            if ($isEnabled) {
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
