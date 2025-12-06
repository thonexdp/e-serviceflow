#!/bin/bash

# Password Reset Feature Setup Script
# This script helps you set up the password reset feature for RC PrintShoppe

echo "=========================================="
echo "Password Reset Feature Setup"
echo "=========================================="
echo ""

# Check if we're in the project root
if [ ! -f "artisan" ]; then
    echo "❌ Error: This script must be run from the project root directory"
    exit 1
fi

echo "✓ Project root detected"
echo ""

# Step 1: Create jobs table for queue
echo "Step 1: Setting up database queue..."
php artisan queue:table
if [ $? -eq 0 ]; then
    echo "✓ Queue table migration created"
else
    echo "⚠ Queue table migration may already exist"
fi
echo ""

# Step 2: Run migrations
echo "Step 2: Running migrations..."
php artisan migrate
if [ $? -eq 0 ]; then
    echo "✓ Migrations completed"
else
    echo "❌ Migration failed. Please check your database connection."
    exit 1
fi
echo ""

# Step 3: Clear config cache
echo "Step 3: Clearing configuration cache..."
php artisan config:clear
php artisan cache:clear
echo "✓ Cache cleared"
echo ""

# Step 4: Check mail configuration
echo "Step 4: Checking mail configuration..."
if grep -q "MAIL_HOST=smtp.gmail.com" .env 2>/dev/null; then
    echo "⚠ Warning: You're using the default mail configuration"
    echo "  Please update your .env file with your actual email credentials"
    echo "  See PASSWORD_RESET_SETUP.md for detailed instructions"
else
    echo "✓ Mail configuration appears to be customized"
fi
echo ""

# Step 5: Test email configuration (optional)
echo "Step 5: Would you like to test your email configuration? (y/n)"
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo "Enter your email address to receive a test email:"
    read -r test_email
    
    php artisan tinker --execute="
        use Illuminate\Support\Facades\Mail;
        Mail::raw('This is a test email from RC PrintShoppe password reset setup.', function(\$msg) use (\$test_email) {
            \$msg->to('$test_email')->subject('Test Email - RC PrintShoppe');
        });
        echo 'Test email sent to $test_email';
    "
    
    echo ""
    echo "✓ Test email sent! Check your inbox (and spam folder)"
fi
echo ""

# Step 6: Instructions for queue worker
echo "=========================================="
echo "Setup Complete! 🎉"
echo "=========================================="
echo ""
echo "Next Steps:"
echo ""
echo "1. Update your .env file with your email credentials"
echo "   See PASSWORD_RESET_SETUP.md for provider-specific instructions"
echo ""
echo "2. Start the queue worker to process password reset emails:"
echo "   php artisan queue:work"
echo ""
echo "   Or run it in the background:"
echo "   php artisan queue:work --daemon &"
echo ""
echo "3. Test the password reset flow:"
echo "   - Visit /login"
echo "   - Click 'Forgot password?'"
echo "   - Enter your email"
echo "   - Check your inbox for the reset link"
echo ""
echo "For detailed documentation, see:"
echo "  📄 PASSWORD_RESET_SETUP.md"
echo ""
echo "=========================================="
