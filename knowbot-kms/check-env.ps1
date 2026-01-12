# Save as check-env.ps1 in your project folder
Write-Host "=== ENVIRONMENT VARIABLES CHECK ===" -ForegroundColor Cyan

$envFile = ".env.local"
if (Test-Path $envFile) {
    Write-Host "✓ .env.local found" -ForegroundColor Green
    
    # Read and check each required variable
    $requiredVars = @(
        "NEXT_PUBLIC_SUPABASE_URL",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        "SUPABASE_SERVICE_ROLE_KEY",
        "PINECONE_API_KEY",
        "GOOGLE_CLIENT_ID",
        "GOOGLE_CLIENT_SECRET"
    )
    
    $optionalVars = @(
        "PINECONE_INDEX_NAME",
        "GOOGLE_REDIRECT_URI",
        "NEXT_PUBLIC_APP_URL",
        "LLAMAPARSE_API_KEY",
        "OPENAI_API_KEY",
        "PRESIDIO_API_URL",
        "GOOGLE_DRIVE_WEBHOOK_TOKEN"
    )
    
    $content = Get-Content $envFile
    
    Write-Host "`nRequired Variables:" -ForegroundColor Cyan
    foreach ($var in $requiredVars) {
        if ($content -match "^$var=") {
            Write-Host "  ✓ $var is set" -ForegroundColor Green
        } else {
            Write-Host "  ✗ $var is missing" -ForegroundColor Red
        }
    }
    
    Write-Host "`nOptional Variables:" -ForegroundColor Cyan
    foreach ($var in $optionalVars) {
        if ($content -match "^$var=") {
            Write-Host "  ✓ $var is set" -ForegroundColor Green
        } else {
            Write-Host "  ○ $var is not set (optional)" -ForegroundColor Gray
        }
    }
    
    # Check for placeholder values
    $placeholders = @("your-", "abc123", "eyJhbG", "sk-proj-", "pc-")
    foreach ($line in $content) {
        foreach ($placeholder in $placeholders) {
            if ($line -match $placeholder) {
                Write-Host "⚠️  Placeholder detected in: $line" -ForegroundColor Yellow
                break
            }
        }
    }
} else {
    Write-Host "✗ .env.local not found" -ForegroundColor Red
    Write-Host "Creating template..." -ForegroundColor Yellow
    # Create template here
}

Write-Host "`n=== NEXT STEPS ===" -ForegroundColor Cyan
Write-Host "1. Update .env.local with your actual API keys" -ForegroundColor White
Write-Host "2. Run: npm run dev" -ForegroundColor White
Write-Host "3. Test connection with: node -e \"console.log('Ready!')\"" -ForegroundColor White