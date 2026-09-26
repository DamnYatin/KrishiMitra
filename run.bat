@echo off
title KrishiMitra - Agricultural Market Estimator
color 0A
cd /d "%~dp0"

echo ================================================================
echo               KrishiMitra - Mandi Price Estimator
echo ================================================================
echo.

:: 1. Check Python installation
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not added to PATH.
    echo Please download and install Python from https://www.python.org/
    echo Make sure to check "Add Python to PATH" during installation.
    echo.
    pause
    exit /b 1
)

:: 2. Install / Verify dependencies
echo [1/3] Checking and installing required dependencies...
pip install -r requirements.txt --quiet
if %errorlevel% neq 0 (
    echo [WARNING] Dependency installation encountered an issue. Trying again with full output:
    pip install -r requirements.txt
)

:: 3. Open browser after short delay in background
echo [2/3] Opening browser at http://127.0.0.1:5000...
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://127.0.0.1:5000"

:: 4. Start Flask Server
echo [3/3] Starting KrishiMitra server on http://127.0.0.1:5000 ...
echo.
echo Press Ctrl+C in this window to stop the server anytime.
echo ================================================================
echo.

python backend/app.py

pause
