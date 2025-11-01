@echo off
cd /d %~dp0
echo Testing database connection and creating sample data...
node test-db.js
echo.
echo Press any key to continue...
pause
