@echo off
title KrishiMitra - Sell vs. Hold AI Advisory & Market Estimator
color 0A
chcp 65001 >nul
cd /d "%~dp0"

echo ==============================================================================
echo           KrishiMitra - Sell vs. Hold AI Advisory & Mandi Estimator
echo ==============================================================================
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
echo [1/3] Checking and installing required Python packages...
pip install -r requirements.txt --quiet
if %errorlevel% neq 0 (
    echo [WARNING] Dependency installation encountered an issue. Retrying with full output:
    pip install -r requirements.txt
)

:: 3. Launch Default Web Browser
echo [2/3] Launching web browser at http://127.0.0.1:5000 ...
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://127.0.0.1:5000"

:: 4. Start KrishiMitra Server
echo [3/3] Starting KrishiMitra Flask Server...
echo.
echo ==============================================================================
echo  🌾 Farmer Estimator:    http://127.0.0.1:5000/
echo  📊 Mandi Compare:       http://127.0.0.1:5000/dashboard
echo  🛒 Buyer Marketplace:   http://127.0.0.1:5000/buyer
echo  ⚙️ System Settings:     http://127.0.0.1:5000/settings
echo ==============================================================================
echo Press Ctrl+C in this window to stop the server anytime.
echo.

python backend/app.py

pause
