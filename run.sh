#!/usr/bin/env bash
# ==============================================================================
# KrishiMitra - Sell vs. Hold AI Advisory & Mandi Estimator
# Linux / Arch Linux Startup Script
# ==============================================================================

set -e

# Change directory to the repository root
cd "$(dirname "$0")"

echo "=============================================================================="
echo "          🌾 KrishiMitra - Sell vs. Hold AI Advisory & Mandi Estimator"
echo "=============================================================================="
echo ""

# 1. Check Python 3 installation
if command -v python3 &>/dev/null; then
    PYTHON_CMD="python3"
elif command -v python &>/dev/null; then
    PYTHON_CMD="python"
else
    echo "❌ [ERROR] Python 3 is not installed or not in PATH."
    echo "On Arch Linux, install it via: sudo pacman -S python python-pip"
    exit 1
fi

echo "✔ Detected Python: $($PYTHON_CMD --version)"

# 2. Setup / Activate Virtual Environment (Arch Linux PEP 668 compliance)
if [ ! -d ".venv" ]; then
    echo "📦 [1/3] Creating virtual environment (.venv)..."
    $PYTHON_CMD -m venv .venv
fi

# Activate virtual environment
source .venv/bin/activate

# 3. Install / Verify dependencies
echo "📦 [2/3] Verifying and installing dependencies from requirements.txt..."
pip install -r requirements.txt --quiet

# 4. Launch Default Web Browser (if desktop environment / xdg-open is available)
if command -v xdg-open &>/dev/null; then
    (sleep 2 && xdg-open "http://127.0.0.1:5000" >/dev/null 2>&1 || true) &
fi

# 5. Start KrishiMitra Server
echo "🚀 [3/3] Starting KrishiMitra Server..."
echo ""
echo "=============================================================================="
echo "  🌾 Farmer Estimator:    http://127.0.0.1:5000/"
echo "  📊 Mandi Compare:       http://127.0.0.1:5000/dashboard"
echo "  🛒 Buyer Marketplace:   http://127.0.0.1:5000/buyer"
echo "  ⚙️ System Settings:     http://127.0.0.1:5000/settings"
echo "=============================================================================="
echo "Press Ctrl+C anytime to stop the server."
echo ""

python backend/app.py
