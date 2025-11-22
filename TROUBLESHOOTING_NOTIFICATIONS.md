# Troubleshooting Real-Time Notifications

If notifications are not appearing in real-time, follow these steps:

## 1. Check BroadcastServiceProvider is Enabled

Make sure `BroadcastServiceProvider` is enabled in `config/app.php`:

```php
App\Providers\BroadcastServiceProvider::class,
```

## 2. Verify .env Configuration

Your `.env` file should have:

```env
BROADCAST_DRIVER=pusher

PUSHER_APP_ID=app-id
PUSHER_APP_KEY=app-key
PUSHER_APP_SECRET=app-secret
PUSHER_HOST=127.0.0.1
PUSHER_PORT=6001
PUSHER_SCHEME=http
```

**Important:** Make sure these values match your `soketi.json` if you're using one.

## 3. Check Soketi is Running

```bash
# Check if Soketi is running on port 6001
netstat -an | findstr 6001  # Windows
lsof -i :6001                # Linux/Mac
```

## 4. Check Browser Console

Open browser DevTools (F12) and check:

1. **Console tab** - Look for:
   - ✅ "WebSocket connected to Soketi"
   - ✅ "Subscribed to channel: user.{id}"
   - ❌ Any error messages

2. **Network tab** - Look for:
   - WebSocket connection to `ws://127.0.0.1:6001/app/{key}`
   - POST request to `/broadcasting/auth` (should return 200)

## 5. Verify CSRF Token

Make sure `resources/views/app.blade.php` has:

```html
<meta name="csrf-token" content="{{ csrf_token() }}">
```

## 6. Test WebSocket Connection

In browser console, run:

```javascript
// Check if Echo is initialized
console.log(window.Echo);

// Check connection status
console.log(window.Echo.connector.pusher.connection.state);

// Should show: "connected"
```

## 7. Test Channel Subscription

In browser console:

```javascript
// Manually subscribe to test
const channel = window.Echo.private('user.1'); // Replace 1 with your user ID
channel.subscribed(() => {
    console.log('Channel subscribed!');
});
```

## 8. Check Laravel Logs

```bash
tail -f storage/logs/laravel.log
```

Look for:
- Broadcasting errors
- Authentication errors
- Event dispatch errors

## 9. Test Event Broadcasting

In Laravel Tinker:

```php
php artisan tinker

// Get a ticket
$ticket = App\Models\Ticket::first();

// Get a user
$user = App\Models\User::first();

// Manually trigger the event
event(new App\Events\TicketStatusChanged(
    $ticket,
    'pending',
    'approved',
    $user,
    [$user->id],
    'ticket_approved',
    'Test Notification',
    'This is a test notification'
));
```

## 10. Common Issues

### Issue: "WebSocket connection failed"

**Solution:**
- Check Soketi is running: `npx @soketi/soketi start`
- Verify port 6001 is not blocked by firewall
- Check `.env` PUSHER_HOST and PUSHER_PORT match Soketi

### Issue: "401 Unauthorized" on /broadcasting/auth

**Solution:**
- Check CSRF token is in the page
- Verify user is authenticated
- Check `routes/channels.php` authorization logic

### Issue: "Channel subscription failed"

**Solution:**
- Verify channel name matches: `user.{id}`
- Check user ID is correct
- Verify channel authorization in `routes/channels.php`

### Issue: Events not broadcasting

**Solution:**
- Check `BROADCAST_DRIVER=pusher` in `.env`
- Verify event implements `ShouldBroadcast`
- Check queue workers are running (if using queues)

## 11. Enable Debug Mode

Add to `resources/js/bootstrap.js`:

```javascript
window.Echo.connector.pusher.connection.bind('state_change', (states) => {
    console.log('Connection state changed:', states);
});
```

## 12. Verify Event is Being Broadcast

Check if the event is actually being broadcast by looking at Soketi logs when you create/update a ticket.

## Still Not Working?

1. Clear browser cache
2. Restart Soketi server
3. Restart Laravel server
4. Rebuild frontend assets: `npm run build`
5. Check if notifications work when you refresh (if yes, it's a WebSocket issue)

