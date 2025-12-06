# Real-Time Production Board Updates

## Overview

Implemented real-time WebSocket updates for the production board and production queue using Laravel Echo and Soketi.

## Implementation Details

### WebSocket Setup

The application uses:

-   **Laravel Echo** - For client-side WebSocket connections
-   **Pusher JS** - As the WebSocket client library
-   **Soketi** - As the WebSocket server (running on port 6001)

### Connection Details

-   **Endpoint**: `ws://localhost:6001` (or configured host)
-   **Channel Type**: Private channels (user-specific)
-   **Channel Name**: `user.{userId}`
-   **Event Name**: `ticket.status.changed`

## Real-Time Updates in Production Pages

### 1. Production Board (`Dashboard/Production.jsx`)

**Location**: Full production dashboard with table and board views

**Features:**

-   Listens for ticket status changes
-   Auto-refreshes ticket data when updates occur
-   Shows animated notifications in fullscreen mode
-   Preserves scroll position and view state during updates

**Implementation:**

```javascript
useEffect(() => {
    const channel = window.Echo.private(`user.${auth.user.id}`);

    channel.listen(".ticket.status.changed", (data) => {
        // Refresh only tickets and summary data
        router.reload({
            only: ["tickets", "summary"],
            preserveScroll: true,
            preserveState: true,
        });

        // Show notification in fullscreen mode
        if (isFullscreen) {
            // Display animated toast notification
        }
    });

    return () => {
        channel.stopListening(".ticket.status.changed");
    };
}, [isFullscreen]);
```

**Fullscreen Notifications:**

-   Beautiful gradient toast notifications
-   Auto-dismiss after 3 seconds
-   Slide-in/slide-out animations
-   Shows ticket status update message
-   Positioned in top-right corner

### 2. Production Queue (`Productions.jsx`)

**Location**: Production queue management page

**Features:**

-   Real-time ticket list updates
-   Instant workflow step changes
-   Quantity updates reflected immediately
-   Status changes visible across all users

**Implementation:**

```javascript
useEffect(() => {
    const channel = window.Echo.private(`user.${auth.user.id}`);

    channel.listen(".ticket.status.changed", (data) => {
        // Refresh tickets data
        router.reload({
            only: ["tickets"],
            preserveScroll: true,
            preserveState: true,
        });
    });

    return () => {
        channel.stopListening(".ticket.status.changed");
    };
}, []);
```

## Broadcast Event

### TicketStatusChanged Event

**File**: `app/Events/TicketStatusChanged.php`

**Triggered When:**

-   Production is started
-   Production progress is updated
-   Ticket is marked as completed
-   Workflow step changes
-   Design status changes

**Broadcast Data:**

```php
[
    'ticket' => [
        'id' => $ticket->id,
        'ticket_number' => $ticket->ticket_number,
        'status' => $ticket->status,
        'old_status' => $oldStatus,
        'new_status' => $newStatus,
        'current_workflow_step' => $ticket->current_workflow_step,
    ],
    'notification' => [
        'type' => 'ticket_status_changed',
        'title' => 'Ticket Status Updated',
        'message' => 'Ticket #XXX is now in production',
        'triggered_by' => [
            'id' => $user->id,
            'name' => $user->name,
        ],
    ],
]
```

## How It Works

### Scenario: Production Worker Updates Ticket

1. **Worker Action**: Worker opens "Update Production" modal and:

    - Changes workflow step from "Printing" to "Cutting"
    - Updates produced quantity from 0 to 50
    - Clicks "Save Progress"

2. **Backend Processing**:

    ```php
    // ProductionQueueController.php
    $ticket->update([
        'produced_quantity' => 50,
        'current_workflow_step' => 'cutting',
        'status' => 'in_production',
    ]);

    // Broadcast event
    event(new TicketStatusChanged($ticket, ...));
    ```

3. **WebSocket Broadcast**:

    - Event is broadcast to Soketi server
    - Soketi pushes to all connected clients subscribed to `user.{userId}`
    - Multiple users (frontdesk, managers, other production workers) receive update

4. **Client-Side Updates**:
    - Production board automatically refreshes
    - Ticket moves to "Cutting" column
    - Quantity shows 50/100
    - Progress bar updates
    - Fullscreen displays notification: "Ticket #12345 moved to Cutting"

### Multi-User Synchronization

**User A (Production Worker):**

-   Updates ticket status
-   Changes reflected immediately in their view

**User B (Manager on TV Board):**

-   Sees ticket move from "Printing" to "Cutting" column
-   Gets toast notification: "Ticket #12345 moved to Cutting"
-   No need to refresh page

**User C (Front Desk):**

-   Receives notification in header bell icon
-   Production queue table auto-updates
-   Can see real-time progress

## Benefits

### 1. **Instant Synchronization**

-   Multiple users see updates immediately
-   No manual page refresh needed
-   Reduces confusion about ticket status

### 2. **Better Communication**

-   Production team knows what's being worked on
-   Front desk can give accurate customer updates
-   Managers see real-time floor status

### 3. **TV Display Optimization**

-   Fullscreen board updates automatically
-   Beautiful notifications for status changes
-   Perfect for production floor monitoring

### 4. **Reduced Server Load**

-   Only changed data is transmitted
-   Efficient partial page updates
-   No polling required

## Testing Real-Time Updates

### Manual Test Steps:

1. **Setup:**

    - Run `soketi start` in terminal
    - Open production board in Browser A (as Manager)
    - Open production queue in Browser B (as Production Worker)
    - Keep console open to see WebSocket logs

2. **Test Update:**

    - In Browser B: Click "Update" on a ticket
    - Change workflow step to "Cutting"
    - Update quantity to 25
    - Click "Save Progress"

3. **Expected Results:**
    - Browser B: Modal closes, success message shown
    - Browser A: Board automatically updates
        - Ticket moves to "Cutting" column
        - Quantity shows 25/100
        - If fullscreen: Toast notification appears
    - Console: Shows "📬 Production update received"

### WebSocket Connection Logs:

✅ **Successful Connection:**

```
🔌 Setting up production board real-time updates...
✅ Subscribed to channel: user.123
✅ WebSocket connected to Soketi
```

📬 **Receiving Updates:**

```
📬 Production update received: {
    ticket: { id: 45, ticket_number: "T-12345", ... },
    notification: { message: "Ticket T-12345 is now in production" }
}
✅ Production queue refreshed
```

## Troubleshooting

### WebSocket Not Connecting

**Check:**

1. Soketi is running: `soketi start`
2. `.env` has correct Pusher keys:
    ```
    VITE_PUSHER_APP_KEY=app-key
    VITE_PUSHER_HOST=127.0.0.1
    VITE_PUSHER_PORT=6001
    ```
3. Browser console shows no errors

### Updates Not Received

**Check:**

1. User is authenticated
2. Event is being broadcast (check Laravel logs)
3. Channel name matches: `user.{userId}`
4. Event name is correct: `.ticket.status.changed`

### Notifications Not Showing

**Check:**

1. `isFullscreen` state is true
2. CSS animations are injected
3. Notification element is created in DOM
4. No z-index conflicts

## Future Enhancements

-   [ ] Add sound notifications for urgent tickets
-   [ ] Implement typing indicators for concurrent edits
-   [ ] Add presence channels to show who's online
-   [ ] Real-time chat for production coordination
-   [ ] Push notifications for mobile devices
-   [ ] Analytics dashboard with live metrics

## Files Modified

### Frontend:

-   `resources/js/Pages/Dashboard/Production.jsx` - Board real-time updates
-   `resources/js/Pages/Productions.jsx` - Queue real-time updates
-   `resources/js/bootstrap.js` - Echo configuration

### Backend:

-   `app/Events/TicketStatusChanged.php` - Broadcast event
-   `app/Http/Controllers/ProductionQueueController.php` - Trigger broadcasts

### Configuration:

-   `.env` - WebSocket server settings
-   `config/broadcasting.php` - Broadcasting configuration
