# 🔐 Password Reset Feature - Quick Start

## What's Been Implemented

A complete, secure password reset system with:

-   ✅ Modern UI matching your login page design
-   ✅ Email-based password reset with secure tokens
-   ✅ Rate limiting to prevent abuse
-   ✅ Security logging for audit trails
-   ✅ Custom branded email notifications
-   ✅ Queue-based email delivery

## Quick Setup (3 Steps)

### 1. Run the Setup Script

**Windows (PowerShell):**

```powershell
.\setup-password-reset.ps1
```

**Mac/Linux:**

```bash
chmod +x setup-password-reset.sh
./setup-password-reset.sh
```

### 2. Configure Email

Update your `.env` file with email credentials:

**For Gmail (Quick Test):**

```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=your-email@gmail.com
MAIL_FROM_NAME="RC PrintShoppe"
```

**For Mailtrap (Development):**

```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=your-mailtrap-username
MAIL_PASSWORD=your-mailtrap-password
MAIL_ENCRYPTION=tls
```

### 3. Start Queue Worker

In a new terminal:

```bash
php artisan queue:work
```

## Test It Out

1. Go to `/login`
2. Click "Forgot password?"
3. Enter your email
4. Check your inbox
5. Click the reset link
6. Set a new password

## Files Modified/Created

### Frontend (React/Inertia)

-   ✏️ `resources/js/Pages/Auth/ForgotPassword.jsx` - Modern forgot password page
-   ✏️ `resources/js/Pages/Auth/ResetPassword.jsx` - Modern reset password page

### Backend (Laravel)

-   ✏️ `app/Http/Controllers/Auth/PasswordResetLinkController.php` - Enhanced with logging & rate limiting
-   ✏️ `app/Http/Controllers/Auth/NewPasswordController.php` - Enhanced with logging
-   ✏️ `routes/auth.php` - Added rate limiting middleware
-   ✏️ `app/Models/User.php` - Custom password reset notification
-   ✨ `app/Notifications/CustomResetPasswordNotification.php` - Branded email template

### Documentation

-   📄 `PASSWORD_RESET_SETUP.md` - Complete setup guide
-   📄 `PASSWORD_RESET_QUICKSTART.md` - This file
-   🔧 `setup-password-reset.ps1` - Windows setup script
-   🔧 `setup-password-reset.sh` - Mac/Linux setup script

## Security Features

| Feature              | Implementation                                               |
| -------------------- | ------------------------------------------------------------ |
| Rate Limiting        | 3 attempts/min for forgot password, 5 attempts/min for reset |
| Token Expiration     | 60 minutes (configurable)                                    |
| Security Logging     | All attempts logged with IP addresses                        |
| Single-Use Tokens    | Tokens invalidated after use                                 |
| Strong Passwords     | Laravel password rules enforced                              |
| No Email Enumeration | Errors don't reveal if email exists                          |

## Troubleshooting

**Emails not sending?**

-   Make sure queue worker is running: `php artisan queue:work`
-   Check logs: `storage/logs/laravel.log`
-   Verify email credentials in `.env`

**Rate limit errors?**

-   Wait 1 minute between attempts
-   Or adjust limits in `routes/auth.php`

**Token expired?**

-   Increase expiration in `config/auth.php`
-   Run `php artisan config:clear`

## Need More Help?

See the complete guide: **PASSWORD_RESET_SETUP.md**

---

**Version**: 1.0  
**Last Updated**: November 23, 2025
