# Password Reset Feature - Setup & Configuration Guide

## Overview

The password reset feature has been implemented with industry-standard security best practices, including:

-   ✅ **Rate Limiting**: Prevents brute-force attacks
-   ✅ **Security Logging**: Tracks all password reset attempts
-   ✅ **Custom Branded Emails**: Professional email notifications
-   ✅ **Token Expiration**: Reset links expire after 60 minutes
-   ✅ **Queued Email Delivery**: Better performance and reliability
-   ✅ **Modern UI**: Consistent design with the login page

## Features Implemented

### 1. Frontend Pages

-   **Forgot Password Page** (`/forgot-password`): Modern, branded design matching the login page
-   **Reset Password Page** (`/reset-password/{token}`): Secure password reset form
-   Both pages include proper validation, error handling, and user feedback

### 2. Backend Security

-   **Rate Limiting**:
    -   Forgot Password: 3 attempts per minute
    -   Reset Password: 5 attempts per minute
-   **Security Logging**: All attempts are logged with IP addresses and user agents
-   **Token-based Reset**: Secure, time-limited tokens (60 minutes)

### 3. Email Notifications

-   Custom branded email notification
-   Queued for better performance
-   Clear security messaging
-   Professional formatting

## Email Configuration

### Required Environment Variables

Add these to your `.env` file:

```env
# Mail Configuration
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=your-email@gmail.com
MAIL_FROM_NAME="RC PrintShoppe"
```

### Email Provider Options

#### Option 1: Gmail (Recommended for Testing)

1. Go to your Google Account settings
2. Enable 2-Factor Authentication
3. Generate an App Password:
    - Go to Security → 2-Step Verification → App passwords
    - Select "Mail" and your device
    - Copy the 16-character password
4. Use this password in `MAIL_PASSWORD`

**Configuration:**

```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-16-char-app-password
MAIL_ENCRYPTION=tls
```

#### Option 2: Mailtrap (Recommended for Development)

Mailtrap is perfect for testing emails without sending real emails.

1. Sign up at [mailtrap.io](https://mailtrap.io)
2. Create an inbox
3. Copy the SMTP credentials

**Configuration:**

```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=your-mailtrap-username
MAIL_PASSWORD=your-mailtrap-password
MAIL_ENCRYPTION=tls
```

#### Option 3: SendGrid (Recommended for Production)

1. Sign up at [sendgrid.com](https://sendgrid.com)
2. Create an API key
3. Verify your sender identity

**Configuration:**

```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.sendgrid.net
MAIL_PORT=587
MAIL_USERNAME=apikey
MAIL_PASSWORD=your-sendgrid-api-key
MAIL_ENCRYPTION=tls
```

#### Option 4: Amazon SES (Enterprise Production)

1. Set up AWS SES
2. Verify your domain
3. Get SMTP credentials

**Configuration:**

```env
MAIL_MAILER=smtp
MAIL_HOST=email-smtp.us-east-1.amazonaws.com
MAIL_PORT=587
MAIL_USERNAME=your-ses-username
MAIL_PASSWORD=your-ses-password
MAIL_ENCRYPTION=tls
```

#### Option 5: Mailgun

**Configuration:**

```env
MAIL_MAILER=mailgun
MAILGUN_DOMAIN=your-domain.mailgun.org
MAILGUN_SECRET=your-mailgun-api-key
MAIL_FROM_ADDRESS=noreply@yourdomain.com
MAIL_FROM_NAME="RC PrintShoppe"
```

## Queue Configuration

The password reset emails are queued for better performance. You need to set up a queue worker.

### Option 1: Database Queue (Recommended for Small Apps)

1. Update `.env`:

```env
QUEUE_CONNECTION=database
```

2. Create the jobs table:

```bash
php artisan queue:table
php artisan migrate
```

3. Run the queue worker:

```bash
php artisan queue:work
```

### Option 2: Redis Queue (Recommended for Production)

1. Install Redis and the PHP Redis extension
2. Update `.env`:

```env
QUEUE_CONNECTION=redis
REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379
```

3. Run the queue worker:

```bash
php artisan queue:work redis
```

### Option 3: Sync Queue (For Testing Only)

For immediate email sending without a queue worker:

```env
QUEUE_CONNECTION=sync
```

**Note:** This is only recommended for local development/testing.

## Testing the Feature

### 1. Test Forgot Password Flow

1. Navigate to `/login`
2. Click "Forgot password?"
3. Enter a valid email address
4. Check your email inbox (or Mailtrap)
5. Click the reset link
6. Enter a new password
7. Confirm the password
8. Submit and verify you can login

### 2. Test Rate Limiting

Try submitting the forgot password form more than 3 times in a minute. You should see a rate limit error.

### 3. Test Token Expiration

The reset token expires after 60 minutes. You can change this in `config/auth.php`:

```php
'passwords' => [
    'users' => [
        'provider' => 'users',
        'table' => 'password_reset_tokens',
        'expire' => 60, // Change this value (in minutes)
        'throttle' => 60,
    ],
],
```

## Security Best Practices Implemented

1. **Rate Limiting**: Prevents brute-force attacks
2. **Token Expiration**: Reset links are time-limited
3. **Secure Logging**: All attempts are logged for audit trails
4. **HTTPS Only**: Ensure your production app uses HTTPS
5. **Strong Password Requirements**: Enforced by Laravel's password rules
6. **No Email Enumeration**: Error messages don't reveal if email exists
7. **Single-Use Tokens**: Tokens are invalidated after use
8. **IP Tracking**: All attempts logged with IP addresses

## Monitoring & Logs

Password reset attempts are logged in `storage/logs/laravel.log`:

-   **Info**: Successful operations
-   **Warning**: Failed attempts

Example log entries:

```
[2025-11-23 12:00:00] local.INFO: Password reset link requested {"email":"user@example.com","ip":"127.0.0.1"}
[2025-11-23 12:00:05] local.INFO: Password reset link sent successfully {"email":"user@example.com"}
[2025-11-23 12:05:00] local.INFO: Password reset successful {"user_id":1,"email":"user@example.com","ip":"127.0.0.1"}
```

## Troubleshooting

### Emails Not Sending

1. **Check Queue Worker**: Make sure `php artisan queue:work` is running
2. **Check Logs**: Look in `storage/logs/laravel.log` for errors
3. **Test Mail Config**: Run `php artisan tinker` and try:
    ```php
    Mail::raw('Test email', function($msg) {
        $msg->to('test@example.com')->subject('Test');
    });
    ```
4. **Check Firewall**: Ensure port 587 (or your SMTP port) is not blocked

### Rate Limit Errors

If you're hitting rate limits during testing:

1. Wait 1 minute between attempts, or
2. Temporarily increase limits in `routes/auth.php`

### Token Expired Errors

If tokens expire too quickly:

1. Increase the expiration time in `config/auth.php`
2. Clear config cache: `php artisan config:clear`

## Production Checklist

Before deploying to production:

-   [ ] Configure a production email service (SendGrid, SES, etc.)
-   [ ] Set up Redis for queue management
-   [ ] Configure queue workers to run as a service (Supervisor)
-   [ ] Enable HTTPS on your domain
-   [ ] Set `APP_ENV=production` in `.env`
-   [ ] Set `APP_DEBUG=false` in `.env`
-   [ ] Configure proper `MAIL_FROM_ADDRESS` with your domain
-   [ ] Test the complete flow on production
-   [ ] Set up monitoring for failed jobs
-   [ ] Review and adjust rate limits if needed

## Additional Security Recommendations

1. **Enable 2FA**: Consider implementing two-factor authentication
2. **Password Policies**: Enforce strong password requirements
3. **Account Lockout**: Lock accounts after multiple failed attempts
4. **Email Verification**: Require email verification for new accounts
5. **Security Headers**: Implement CSP, HSTS, etc.
6. **Regular Audits**: Review password reset logs regularly

## Support

For issues or questions:

1. Check Laravel logs: `storage/logs/laravel.log`
2. Review queue failed jobs: `php artisan queue:failed`
3. Test email configuration: `php artisan tinker`

---

**Last Updated**: November 23, 2025
**Version**: 1.0
