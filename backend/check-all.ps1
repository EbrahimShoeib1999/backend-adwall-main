# سكريبت شامل لفحص حالة الباك إند
Write-Host "🔍 AddWall Backend Status Check" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

# التحقق من وجود Node.js
Write-Host "`n1️⃣ Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js" -ForegroundColor Red
    exit 1
}

# التحقق من وجود npm
Write-Host "`n2️⃣ Checking npm..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Write-Host "✅ npm version: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm not found" -ForegroundColor Red
    exit 1
}

# التحقق من وجود ملف package.json
Write-Host "`n3️⃣ Checking package.json..." -ForegroundColor Yellow
if (Test-Path "package.json") {
    Write-Host "✅ package.json found" -ForegroundColor Green
} else {
    Write-Host "❌ package.json not found" -ForegroundColor Red
    exit 1
}

# التحقق من وجود ملف البيئة
Write-Host "`n4️⃣ Checking environment file..." -ForegroundColor Yellow
if (Test-Path "env.txt") {
    Write-Host "✅ env.txt found" -ForegroundColor Green
} else {
    Write-Host "❌ env.txt not found" -ForegroundColor Red
    exit 1
}

# تشغيل الاختبار الشامل
Write-Host "`n5️⃣ Running full backend test..." -ForegroundColor Yellow
Write-Host "================================" -ForegroundColor Cyan
node full-test.js

Write-Host "`n6️⃣ Ready to start server!" -ForegroundColor Green
Write-Host "Run: npm start" -ForegroundColor Cyan

Read-Host "`nPress Enter to continue"

