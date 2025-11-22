# Quick Start Guide - Real-Time Notifications

## Step 1: Generate Your App Credentials

**You DON'T need Pusher.com!** These are just random values for Soketi.

Run this command to generate secure random values:

```bash
php artisan tinker --execute="echo 'PUSHER_APP_ID=' . Str::random(20) . PHP_EOL; echo 'PUSHER_APP_KEY=' . Str::random(20) . PHP_EOL; echo 'PUSHER_APP_SECRET=' . Str::random(40) . PHP_EOL;"
```

Copy the output and add to your `.env` file.

## Step 2: Update Your .env File

Add these lines to your `.env` file (use the values from Step 1):

```env
BROADCAST_DRIVER=pusher

PUSHER_APP_ID=your-generated-app-id
PUSHER_APP_KEY=your-generated-app-key
PUSHER_APP_SECRET=your-generated-app-secret
PUSHER_HOST=127.0.0.1
PUSHER_PORT=6001
PUSHER_SCHEME=http
```

## Step 3: Install Pusher PHP SDK

Laravel needs this package to send messages to Soketi:

```bash
composer require pusher/pusher-php-server
```

## Step 4: Install Soketi

```bash
npm install -g @soketi/soketi
```

Or use npx (no installation needed):
```bash
npx @soketi/soketi start
```

## Step 5: Start Soketi Server

In a separate terminal:

```bash
npx @soketi/soketi start
```

You should see: `Soketi is running on port 6001`

## Step 6: Rebuild Frontend

```bash
npm run dev
```

## Step 7: Start Laravel

```bash
php artisan serve
```

## Step 8: Test It!

1. Open your app in browser
2. Open browser DevTools (F12) → Console tab
3. Look for: `✅ WebSocket connected to Soketi`
4. Create a ticket as FrontDesk user
5. Check Designer user's notifications - should appear instantly!

## Troubleshooting

**Not seeing "WebSocket connected"?**

1. Check Soketi is running: `npx @soketi/soketi start`
2. Check `.env` values are set correctly
3. Check browser console for errors
4. Make sure `BROADCAST_DRIVER=pusher` in `.env`

**Still not working?**

See `TROUBLESHOOTING_NOTIFICATIONS.md` for detailed help.

