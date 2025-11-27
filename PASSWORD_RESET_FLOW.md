# Password Reset Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         PASSWORD RESET FLOW                              │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────┐
│   User at    │
│  Login Page  │
│  (/login)    │
└──────┬───────┘
       │
       │ Clicks "Forgot password?"
       │
       ▼
┌──────────────────┐
│  Forgot Password │
│      Page        │
│ (/forgot-password)│
└──────┬───────────┘
       │
       │ Enters email
       │ Submits form
       │
       ▼
┌────────────────────────────────────────────────────────────────┐
│  PasswordResetLinkController::store                            │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ 1. Validate email                                        │ │
│  │ 2. Check rate limit (3 attempts/min)                     │ │
│  │ 3. Log attempt (IP, user agent)                          │ │
│  │ 4. Generate secure token                                 │ │
│  │ 5. Save to password_reset_tokens table                   │ │
│  │ 6. Queue email notification                              │ │
│  │ 7. Log success/failure                                   │ │
│  └──────────────────────────────────────────────────────────┘ │
└────────────────────────────┬───────────────────────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  Queue Worker   │
                    │  Processes Job  │
                    └────────┬────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────────┐
│  CustomResetPasswordNotification                               │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ 1. Build reset URL with token                            │ │
│  │ 2. Create branded email                                  │ │
│  │ 3. Send via configured mail driver                       │ │
│  └──────────────────────────────────────────────────────────┘ │
└────────────────────────────┬───────────────────────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │   User Email    │
                    │   Inbox         │
                    └────────┬────────┘
                             │
                             │ User clicks reset link
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│  Reset Password Page                                             │
│  (/reset-password/{token}?email=user@example.com)                │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ - Email field (pre-filled)                                 │ │
│  │ - New password field                                       │ │
│  │ - Confirm password field                                   │ │
│  └────────────────────────────────────────────────────────────┘ │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             │ User enters new password
                             │ Submits form
                             │
                             ▼
┌────────────────────────────────────────────────────────────────┐
│  NewPasswordController::store                                  │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ 1. Validate input (token, email, password)               │ │
│  │ 2. Check rate limit (5 attempts/min)                     │ │
│  │ 3. Log attempt (IP, user agent)                          │ │
│  │ 4. Verify token is valid and not expired                 │ │
│  │ 5. Find user by email                                    │ │
│  │ 6. Hash new password                                     │ │
│  │ 7. Update user password                                  │ │
│  │ 8. Invalidate token                                      │ │
│  │ 9. Generate new remember token                           │ │
│  │ 10. Fire PasswordReset event                             │ │
│  │ 11. Log success                                          │ │
│  └──────────────────────────────────────────────────────────┘ │
└────────────────────────────┬───────────────────────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  Redirect to    │
                    │  Login Page     │
                    │  with success   │
                    │  message        │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  User logs in   │
                    │  with new       │
                    │  password       │
                    └─────────────────┘


═══════════════════════════════════════════════════════════════════
                         SECURITY LAYERS
═══════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────┐
│  Layer 1: Rate Limiting                                         │
│  ─────────────────────────────────────────────────────────────  │
│  • Forgot Password: 3 attempts per minute                       │
│  • Reset Password: 5 attempts per minute                        │
│  • Prevents brute-force attacks                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Layer 2: Token Security                                        │
│  ─────────────────────────────────────────────────────────────  │
│  • Cryptographically secure random tokens                       │
│  • 60-minute expiration                                         │
│  • Single-use (invalidated after reset)                         │
│  • Stored hashed in database                                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Layer 3: Security Logging                                      │
│  ─────────────────────────────────────────────────────────────  │
│  • All attempts logged with timestamps                          │
│  • IP addresses tracked                                         │
│  • User agents recorded                                         │
│  • Success/failure status logged                                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Layer 4: No Email Enumeration                                  │
│  ─────────────────────────────────────────────────────────────  │
│  • Same response for valid/invalid emails                       │
│  • Prevents attackers from discovering valid accounts           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Layer 5: Strong Password Requirements                          │
│  ─────────────────────────────────────────────────────────────  │
│  • Minimum length enforced                                      │
│  • Password confirmation required                               │
│  • Laravel password rules applied                               │
└─────────────────────────────────────────────────────────────────┘


═══════════════════════════════════════════════════════════════════
                         DATABASE TABLES
═══════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────┐
│  password_reset_tokens                                          │
│  ─────────────────────────────────────────────────────────────  │
│  • email (string, indexed)                                      │
│  • token (string, hashed)                                       │
│  • created_at (timestamp)                                       │
│                                                                 │
│  Purpose: Store password reset tokens with expiration          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  jobs (queue table)                                             │
│  ─────────────────────────────────────────────────────────────  │
│  • id (bigint, auto-increment)                                  │
│  • queue (string)                                               │
│  • payload (longtext)                                           │
│  • attempts (tinyint)                                           │
│  • reserved_at (int, nullable)                                  │
│  • available_at (int)                                           │
│  • created_at (int)                                             │
│                                                                 │
│  Purpose: Queue password reset emails for async processing     │
└─────────────────────────────────────────────────────────────────┘


═══════════════════════════════════════════════════════════════════
                         ERROR SCENARIOS
═══════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────┐
│  Scenario 1: Invalid Email                                      │
│  ─────────────────────────────────────────────────────────────  │
│  User enters: nonexistent@example.com                           │
│  Response: "We have emailed your password reset link!"         │
│  (Same as valid email - prevents enumeration)                   │
│  Action: No email sent, attempt logged                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Scenario 2: Rate Limit Exceeded                                │
│  ─────────────────────────────────────────────────────────────  │
│  User submits: 4 requests in 1 minute                           │
│  Response: "Too many attempts. Please try again later."         │
│  Action: Request blocked, attempt logged                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Scenario 3: Expired Token                                      │
│  ─────────────────────────────────────────────────────────────  │
│  User clicks: Link after 60+ minutes                            │
│  Response: "This password reset token is invalid."              │
│  Action: Reset rejected, user must request new link             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Scenario 4: Token Already Used                                 │
│  ─────────────────────────────────────────────────────────────  │
│  User clicks: Same link twice                                   │
│  Response: "This password reset token is invalid."              │
│  Action: Reset rejected, token was deleted after first use      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Scenario 5: Password Mismatch                                  │
│  ─────────────────────────────────────────────────────────────  │
│  User enters: Different passwords in fields                     │
│  Response: "The password field confirmation does not match."    │
│  Action: Form validation error, no password change              │
└─────────────────────────────────────────────────────────────────┘
```
