# Production Workflow System - Documentation

## Overview

The production workflow system allows you to define custom production processes for each job type/product. This enables dynamic tracking of products through different production stages, making it ideal for print shops with varying production requirements.

## Features

### 1. **Dynamic Workflow Configuration**

-   Each job type can have its own unique production workflow
-   Select from 8 predefined workflow steps:
    -   **Design** - Initial design work
    -   **Printing** - Printing process
    -   **Lamination/Heatpress** - Lamination or heat press application
    -   **Cutting** - Cutting to size
    -   **Sewing** - Sewing/stitching work
    -   **DTF Press** - Direct-to-Film press for T-shirts
    -   **Assembly** - Final assembly
    -   **Quality Check** - Quality control inspection

### 2. **Production Board View**

-   Kanban-style board showing tickets grouped by workflow stage
-   Visual progress indicators for each ticket
-   Overdue ticket highlighting
-   Real-time status updates
-   Perfect for TV display in production areas

### 3. **Flexible Workflow Assignment**

-   Choose which steps apply to each product type
-   Example configurations:
    -   **T-Shirts**: Design → DTF Press → Quality Check
    -   **Tarpaulins**: Design → Printing → Lamination → Cutting → Assembly → Quality Check
    -   **Banners**: Design → Printing → Cutting → Quality Check
    -   **ID Cards**: Design → Printing → Lamination → Cutting → Quality Check

## How to Use

### Setting Up Workflows for Job Types

1. **Navigate to Job Types & Pricing**

    - Go to the admin panel
    - Click on "Job Types & Pricing"

2. **Add or Edit a Job Type**

    - Click "Add Job Type" or edit an existing one
    - Fill in the basic information (name, category, pricing, etc.)

3. **Configure Production Workflow**

    - Scroll to the "Production Workflow Template" section
    - Check the boxes for the production steps that apply to this product
    - Only select the steps that are actually used in production

4. **Save the Job Type**
    - Click "Save" to store the workflow configuration

### Viewing the Production Board

1. **Access Production Queue**

    - Navigate to "Dashboard" → "Production Queue"

2. **Switch to Board View**

    - Click the "Board View" button in the top right
    - The board will display columns for each active workflow step
    - Tickets are automatically grouped by their current workflow stage

3. **Fullscreen Mode for TV Display**
    - Click the fullscreen button at the top center
    - The interface will expand to fill the screen
    - Perfect for displaying on TVs in production areas

### Tracking Ticket Progress

1. **Current Workflow Step**

    - Each ticket tracks its `current_workflow_step`
    - This determines which column the ticket appears in on the board

2. **Moving Tickets Through Workflow**

    - Update the ticket's `current_workflow_step` field to move it between stages
    - When a ticket is completed, it moves to the "Completed" column

3. **Progress Indicators**
    - Each ticket card shows:
        - Ticket number
        - Description/Job type
        - Quantity progress (produced/total)
        - Due date
        - Progress bar showing completion percentage
        - Overdue indicator (if applicable)

## Database Schema

### Job Types Table

```sql
workflow_steps (JSON) - Stores the enabled workflow steps for each job type
Example:
{
  "design": true,
  "printing": true,
  "lamination_heatpress": false,
  "cutting": true,
  "sewing": false,
  "dtf_press": false,
  "assembly": true,
  "quality_check": true
}
```

### Tickets Table

```sql
current_workflow_step (VARCHAR) - Tracks the current production stage
Possible values: 'design', 'printing', 'lamination_heatpress', 'cutting',
                 'sewing', 'dtf_press', 'assembly', 'quality_check'
```

## API Endpoints

### Production Queue Controller

-   `GET /production` - List all production tickets
-   `POST /production/{id}/start` - Start production for a ticket
-   `POST /production/{id}/update` - Update production progress
-   `POST /production/{id}/complete` - Mark ticket as completed
-   `POST /production/{id}/record-stock` - Record stock consumption

## Best Practices

1. **Configure Workflows Accurately**

    - Only enable steps that are actually used for each product
    - This keeps the board clean and focused

2. **Update Workflow Steps Regularly**

    - Keep the `current_workflow_step` updated as work progresses
    - This ensures accurate tracking and visibility

3. **Use Fullscreen Mode for TV Displays**

    - Set up a dedicated screen in the production area
    - Use fullscreen mode for better visibility
    - Refresh periodically to show latest updates

4. **Monitor Overdue Items**

    - Overdue tickets are highlighted in red
    - Pay special attention to these items

5. **Review Completed Items**
    - The "Completed" column shows finished work
    - Use this to track daily/weekly production output

## Customization

### Adding New Workflow Steps

To add new workflow steps:

1. Update `WORKFLOW_STEPS` array in `ProductionBoard.jsx`
2. Add the new step to the workflow checkboxes in `JobTypeForm.jsx`
3. Update the initial state in `JobTypeForm.jsx`
4. Update the workflow step handler

### Changing Workflow Colors

Edit the `color` property in the `WORKFLOW_STEPS` array in `ProductionBoard.jsx`:

```javascript
{ key: 'printing', label: 'Printing', icon: 'ti-printer', color: '#2196F3' }
```

## Troubleshooting

### Tickets Not Showing in Board View

-   Ensure the job type has workflow steps configured
-   Check that the ticket has a valid `current_workflow_step`
-   Verify the ticket status is not 'pending' or 'cancelled'

### Workflow Steps Not Saving

-   Check browser console for errors
-   Verify the migration has been run
-   Ensure the `workflow_steps` column exists in the `job_types` table

### Board View Not Loading

-   Check that tickets have the `jobType` relationship loaded
-   Verify the `ProductionBoard` component is imported correctly
-   Check browser console for JavaScript errors

## Future Enhancements

Potential improvements to consider:

-   Drag-and-drop to move tickets between workflow stages
-   Time tracking for each workflow step
-   Automatic workflow step progression
-   Workflow step notifications
-   Custom workflow templates
-   Workflow analytics and reporting
-   Mobile-responsive board view
-   Real-time updates using WebSockets

## Support

For issues or questions:

1. Check the browser console for errors
2. Review the Laravel logs in `storage/logs`
3. Verify database migrations have been run
4. Ensure all relationships are properly loaded
