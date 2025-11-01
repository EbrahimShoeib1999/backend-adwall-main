# PowerShell script to test and fix database issues
Write-Host "Testing database connection and fixing issues..." -ForegroundColor Green

# Test database connection
Write-Host "1. Testing database connection..." -ForegroundColor Yellow
node test-db.js

Write-Host "`n2. Starting server..." -ForegroundColor Yellow
# You can uncomment the next line to start the server automatically
# npm start

Write-Host "`nDatabase test completed. Check the output above for any errors." -ForegroundColor Green
Write-Host "If successful, you should see user statistics and the server should work properly." -ForegroundColor Cyan

Read-Host "Press Enter to continue"
