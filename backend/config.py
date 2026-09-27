"""
File: config.py
Purpose: Application configuration, constants, database paths, and API simulation flags.
Inputs:  None (reads environment variables or falls back to sensible defaults)
Outputs: Config class containing database paths, mock switches, and default parameters
Usage:   from config import Config
         print(Config.DB_PATH)
"""

import os
from pathlib import Path

# Base directories
BASE_DIR = Path(__file__).resolve().parent
DATABASE_DIR = BASE_DIR / "database"

# Auto-detect serverless environments (e.g. Vercel, AWS Lambda) where only /tmp is writable
if os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
    DEFAULT_DB = "/tmp/krishimitra.db"
else:
    DEFAULT_DB = str(DATABASE_DIR / "krishimitra.db")

DB_PATH = os.environ.get("KRISHIMITRA_DB_PATH", DEFAULT_DB)

class Config:
    """Application Configuration Settings"""
    DEBUG = os.environ.get("FLASK_DEBUG", "True").lower() in ("true", "1")
    SECRET_KEY = os.environ.get("SECRET_KEY", "krishimitra-secret-key-prod")
    DB_PATH = DB_PATH
    
    # Mock Data Toggle (When False or when keys present, connects to live APIs)
    USE_MOCK_DATA = os.environ.get("USE_MOCK_DATA", "False").lower() in ("true", "1")
    
    # External API Keys
    AGMARKNET_API_KEY = os.environ.get("AGMARKNET_API_KEY", "579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b")
    AGMARKNET_RESOURCE_ID = os.environ.get("AGMARKNET_RESOURCE_ID", "9ef84268-d588-465a-a308-a864a43d0070")
    AGMARKNET_FORMAT = "xml"
    
    GOOGLE_MAPS_API_KEY = os.environ.get("GOOGLE_MAPS_API_KEY", "AIzaSyDOkEUdOO0Lnb_7HpOZ41mBxc1RSO4QDeU")
    
    # Admin Panel Credentials & Auth Token
    ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME", "admin")
    ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin")
    ADMIN_AUTH_TOKEN = "krishimitra-admin-auth-token-secure"
    
    # Default transport rate per km per quintal (INR)
    DEFAULT_TRANSPORT_RATE = 0.80

    # Advisory & Forecasting Configuration (Phase 4 Sell vs. Hold)
    # When True, populates forecast_cache with plausible synthetic values for testing
    MOCK_FORECAST_MODE = os.environ.get("MOCK_FORECAST_MODE", "False").lower() in ("true", "1")
    
    # Minimum projected net profit gain (₹/qtl) required over selling now to trigger a HOLD recommendation.
    # Prevents trivial/noise-sized fluctuations from suggesting a wait.
    MINIMUM_GAIN_THRESHOLD = float(os.environ.get("MINIMUM_GAIN_THRESHOLD", "15.0"))
