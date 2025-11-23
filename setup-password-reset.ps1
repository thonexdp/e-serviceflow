# Password Reset Feature Setup Script (PowerShell)
# This script helps you set up the password reset feature for RC PrintShoppe

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Password Reset Feature Setup" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the project root
if (-not (Test-Path "artisan")) {
    Write-Host "❌ Error: This script must be run from the project root directory" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Project root detected" -ForegroundColor Green
Write-Host ""

# Step 1: Create jobs table for queue
Write-Host "Step 1: Setting up database queue..." -ForegroundColor Yellow
php artisan queue:table
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Queue table migration created" -ForegroundColor Green
} else {
    Write-Host "⚠ Queue table migration may already exist" -ForegroundColor Yellow
}
Write-Host ""

# Step 2: Run migrations
Write-Host "Step 2: Running migrations..." -ForegroundColor Yellow
php artisan migrate
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Migrations completed" -ForegroundColor Green
} else {
    Write-Host "❌ Migration failed. Please check your database connection." -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 3: Clear config cache
Write-Host "Step 3: Clearing configuration cache..." -ForegroundColor Yellow
php artisan config:clear
php artisan cache:clear
Write-Host "✓ Cache cleared" -ForegroundColor Green
Write-Host ""

# Step 4: Check mail configuration
Write-Host "Step 4: Checking mail configuration..." -ForegroundColor Yellow
if (Test-Path ".env") {
    $envContent = Get-Content ".env" -Raw
    if ($envContent -match "MAIL_HOST=smtp.gmail.com") {
        Write-Host "⚠ Warning: You're using the default mail configuration" -ForegroundColor Yellow
        Write-Host "  Please update your .env file with your actual email credentials" -ForegroundColor Yellow
        Write-Host "  See PASSWORD_RESET_SETUP.md for detailed instructions" -ForegroundColor Yellow
    } else {
        Write-Host "✓ Mail configuration appears to be customized" -ForegroundColor Green
    }
} else {
    Write-Host "⚠ Warning: .env file not found. Please copy .env.example to .env" -ForegroundColor Yellow
}
Write-Host ""

# Step 5: Test email configuration (optional)
Write-Host "Step 5: Would you like to test your email configuration? (y/n)" -ForegroundColor Yellow
$response = Read-Host
if ($response -match "^[yY]") {
    Write-Host "Enter your email address to receive a test email:" -ForegroundColor Yellow
    $testEmail = Read-Host
    
    $tinkerCommand = @"
use Illuminate\Support\Facades\Mail;
Mail::raw('This is a test email from RC PrintShoppe password reset setup.', function(`$msg) {
    `$msg->to('$testEmail')->subject('Test Email - RC PrintShoppe');
});
echo 'Test email sent to $testEmail';
"@
    
    $tinkerCommand | php artisan tinker
    
    Write-Host ""
    Write-Host "✓ Test email sent! Check your inbox (and spam folder)" -ForegroundColor Green
}
Write-Host ""

# Step 6: Instructions for queue worker
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Setup Complete! 🎉" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Update your .env file with your email credentials"
Write-Host "   See PASSWORD_RESET_SETUP.md for provider-specific instructions"
Write-Host ""
Write-Host "2. Start the queue worker to process password reset emails:"
Write-Host "   php artisan queue:work" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Or run it in a new terminal window/tab"
Write-Host ""
Write-Host "3. Test the password reset flow:"
Write-Host "   - Visit /login"
Write-Host "   - Click 'Forgot password?'"
Write-Host "   - Enter your email"
Write-Host "   - Check your inbox for the reset link"
Write-Host ""
Write-Host "For detailed documentation, see:"
Write-Host "  📄 PASSWORD_RESET_SETUP.md" -ForegroundColor Cyan
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
