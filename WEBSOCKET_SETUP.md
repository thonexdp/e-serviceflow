# Laravel WebSockets Setup Guide (Soketi)

This guide will help you set up real-time notifications using Soketi, a modern, self-hosted WebSocket server compatible with Laravel's broadcasting system.

## Prerequisites

- Laravel 10+
- Node.js 16+ and npm installed
- Composer installed

## What is Soketi?

Soketi is a simple, fast, and resilient open-source WebSocket server. It's a drop-in replacement for Pusher and works seamlessly with Laravel's broadcasting system. Unlike beyondcode/laravel-websockets, Soketi is a standalone server that doesn't require a Laravel package.

## Installation Steps

### 1. Backend Configuration

#### Update `.env` file

**⚠️ Important: You do NOT need to sign up for Pusher.com!** 

These are just configuration values for Soketi (which uses the Pusher protocol). You can use any values you want - they just need to match between your `.env` file and Soketi.

Add the following broadcasting configuration to your `.env` file:

```env
BROADCAST_DRIVER=pusher

PUSHER_APP_ID=app-id
PUSHER_APP_KEY=app-key
PUSHER_APP_SECRET=app-secret
PUSHER_APP_CLUSTER=mt1
PUSHER_HOST=127.0.0.1
PUSHER_PORT=6001
PUSHER_SCHEME=http
```

**Generate secure random values (recommended):**

You can generate secure random values using Laravel:

```bash
php artisan tinker --execute="echo 'PUSHER_APP_ID=' . Str::random(20) . PHP_EOL; echo 'PUSHER_APP_KEY=' . Str::random(20) . PHP_EOL; echo 'PUSHER_APP_SECRET=' . Str::random(40) . PHP_EOL;"
```

Or manually in tinker:
```bash
php artisan tinker
>>> Str::random(20)  // For APP_ID and APP_KEY
>>> Str::random(40)  // For APP_SECRET (longer is better)
```

**Example generated values:**
```env
PUSHER_APP_ID=3h0tjTTytpPldiqu4yHA
PUSHER_APP_KEY=rIJkejlPXXxoxS40Ciqk
PUSHER_APP_SECRET=Sy6jvmDJnM7uBpj5B5RSys0k5ASbyi5aW8Xfx0Sv
```

**Note:** For local development, you can use simple values like `app-id`, `app-key`, `app-secret`. For production, always use randomly generated secure values.

### 2. Install Required PHP Package

Laravel's broadcasting system requires the Pusher PHP SDK (even when using Soketi):

```bash
composer require pusher/pusher-php-server
```

This package allows Laravel to send messages to the WebSocket server.

### 3. Install Soketi

Soketi can be installed globally via npm:

```bash
npm install -g @soketi/soketi
```

Or use npx to run it without global installation:

```bash
npx @soketi/soketi start
```

### 4. Configure Soketi

**Option A: Use environment variables (Recommended - No config file needed)**

Soketi can read from environment variables. Just make sure your `.env` values are set, and Soketi will use them automatically when you start it.

**Option B: Create a `soketi.json` configuration file (Optional)**

If you prefer using a config file, create `soketi.json` in your project root:

```json
{
  "debug": true,
  "port": 6001,
  "appManager.array.apps": [
    {
      "id": "app-id",
      "key": "app-key",
      "secret": "app-secret"
    }
  ]
}
```

**Important:** The `id`, `key`, and `secret` in `soketi.json` must **exactly match** your `.env` file values:
- `id` = `PUSHER_APP_ID`
- `key` = `PUSHER_APP_KEY`
- `secret` = `PUSHER_APP_SECRET`

**If values don't match, WebSocket connections will fail!**

### 5. Frontend Configuration

The frontend packages (laravel-echo and pusher-js) are already installed. The Echo configuration is in `resources/js/bootstrap.js`.

Update your `.env` file with the frontend variables (Vite will read these):

```env
VITE_PUSHER_APP_KEY="${PUSHER_APP_KEY}"
VITE_PUSHER_HOST="${PUSHER_HOST}"
VITE_PUSHER_PORT="${PUSHER_PORT}"
VITE_PUSHER_SCHEME="${PUSHER_SCHEME}"
VITE_PUSHER_APP_CLUSTER="${PUSHER_APP_CLUSTER}"
```

### 6. Run Migrations

```bash
php artisan migrate
```

This will create the `notifications` table.

### 7. Start Soketi Server

Start the Soketi WebSocket server:

```bash
# Using globally installed Soketi
soketi start

# Or using npx (no global installation needed)
npx @soketi/soketi start

# With custom config file
npx @soketi/soketi start --config=soketi.json
```

You should see output like:
```
Soketi is running on port 6001
```

**Keep this terminal running!** The WebSocket server needs to stay active.

### 8. Build Frontend Assets

In a separate terminal:

```bash
npm run dev
# or for production
npm run build
```

### 9. Start Laravel Development Server

In another terminal:

```bash
php artisan serve
```

## Running in Development

You'll need **3 terminal windows**:

1. **Terminal 1:** Soketi WebSocket server
   ```bash
   npx @soketi/soketi start
   ```

2. **Terminal 2:** Laravel development server
   ```bash
   php artisan serve
   ```

3. **Terminal 3:** Vite dev server (if using `npm run dev`)
   ```bash
   npm run dev
   ```

## Production Setup

For production, you can run Soketi as a service. Here's an example using PM2:

```bash
# Install PM2 globally
npm install -g pm2

# Start Soketi with PM2
pm2 start soketi --name "soketi" -- start

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
```

Or use a systemd service (Linux) or create a Windows service.

## Notification Flow

The system implements the following notification flow:

1. **FrontDesk creates ticket** (status: `pending`)
   - ✅ Notifies all Designers

2. **Designer reviews ticket**
   - **Approve** → Notifies FrontDesk + Production (status: `approved`)
   - **Reject** → Notifies FrontDesk (status: `rejected`)

3. **Production takes over**
   - Status: `in_production` → Optional notification to FrontDesk
   - Status: `completed` → Optional notification to FrontDesk

## Features

- ✅ Real-time notifications via WebSocket
- ✅ Notification badge with unread count on bell icon
- ✅ Mark notifications as read
- ✅ Mark all notifications as read
- ✅ Browser notifications (with permission)
- ✅ Click notification to navigate to ticket

## API Endpoints

- `GET /notifications` - Get all notifications (paginated)
- `GET /notifications/unread-count` - Get unread count
- `PATCH /notifications/{id}/read` - Mark notification as read
- `PATCH /notifications/read-all` - Mark all as read
- `DELETE /notifications/{id}` - Delete notification

## Troubleshooting

### WebSocket connection fails

1. **Check Soketi is running:**
   ```bash
   # Check if port 6001 is in use
   netstat -an | findstr 6001  # Windows
   lsof -i :6001                # Linux/Mac
   ```

2. **Verify `.env` configuration matches `soketi.json`** (if using config file)

3. **Check browser console for errors:**
   - Open browser DevTools (F12)
   - Check Console tab for WebSocket connection errors
   - Check Network tab for WebSocket connection attempts

4. **Ensure CSRF token is available:**
   - Check that `<meta name="csrf-token" content="...">` exists in your HTML head

5. **Check CORS settings:**
   - Soketi should allow connections from your Laravel app domain
   - Update `soketi.json` with `cors` settings if needed

### Notifications not appearing

1. Check that the user is authenticated
2. Verify the user has the correct role
3. Check Laravel logs: `storage/logs/laravel.log`
4. Verify the broadcasting channel authorization in `routes/channels.php`
5. Check Soketi logs for connection issues

### Browser notifications not showing

1. Check browser notification permissions
2. Some browsers require HTTPS for notifications
3. Check browser console for permission errors
4. Ensure the page is served over HTTPS in production

### Soketi connection issues

1. **Verify Soketi is listening:**
   ```bash
   # Test WebSocket connection
   curl http://127.0.0.1:6001
   ```

2. **Check firewall settings:**
   - Ensure port 6001 is not blocked
   - For production, ensure the port is open in your firewall

3. **Check app credentials:**
   - Verify `PUSHER_APP_ID`, `PUSHER_APP_KEY`, and `PUSHER_APP_SECRET` match in both `.env` and `soketi.json`

## Testing

1. Start Soketi server: `npx @soketi/soketi start`
2. Start Laravel server: `php artisan serve`
3. Start Vite (if needed): `npm run dev`
4. Create a ticket as FrontDesk user
5. Check Designer user's notifications (should see new ticket notification)
6. Approve ticket as Designer
7. Check FrontDesk and Production users' notifications (should see approval notification)

## Advantages of Soketi

- ✅ **No Laravel package required** - Standalone server
- ✅ **Lightweight and fast** - Built with performance in mind
- ✅ **Drop-in Pusher replacement** - Compatible with existing Laravel broadcasting
- ✅ **Easy to deploy** - Simple Node.js application
- ✅ **Active development** - Regularly updated and maintained
- ✅ **Free and open-source** - No licensing fees

## Production Considerations

For production, consider:

1. **Use HTTPS/WSS:** Configure SSL certificates for secure WebSocket connections
2. **Environment variables:** Use secure, randomly generated app credentials
3. **Process management:** Use PM2, systemd, or similar to keep Soketi running
4. **Monitoring:** Set up monitoring for Soketi server health
5. **Load balancing:** For high traffic, consider running multiple Soketi instances
6. **Queue workers:** Ensure Laravel queue workers are running for broadcasting events
7. **Redis:** Consider using Redis for better performance with multiple Soketi instances

## Additional Notes

- Notifications are stored in the database for persistence
- Real-time updates use WebSocket broadcasting via Soketi
- The notification badge updates automatically when new notifications arrive
- All notifications are user-specific and private
- Soketi uses the Pusher protocol, so it's compatible with Laravel's broadcasting system

## Resources

- Soketi GitHub: https://github.com/soketi/soketi
- Soketi Documentation: https://docs.soketi.app/
- Laravel Broadcasting: https://laravel.com/docs/broadcasting
