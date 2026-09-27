"""
File: train_forecast_models.py
Purpose: Offline / batch job to train SARIMAX forecasting models for all crop-mandi pairs
         and write predictions into `forecast_cache`.
Usage:
    python backend/jobs/train_forecast_models.py
    python backend/jobs/train_forecast_models.py --mock
"""

import sys
import argparse
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from database.db_init import init_db
from database.seed_data import seed_db
from services.forecast_service import train_sarimax_models

def main():
    parser = argparse.ArgumentParser(description="Train SARIMAX Price Forecasting Models for KrishiMitra")
    parser.add_argument("--mock", action="store_true", help="Force synthetic mock forecasting mode")
    args = parser.parse_args()

    # Ensure DB tables and seed data exist
    init_db()
    seed_db()

    print("Executing batch SARIMAX training job...")
    result = train_sarimax_models(force_mock=args.mock)
    print("\nTraining Job Summary:")
    print(f"- Mode: {result['mode']}")
    print(f"- Total Pairs: {result['total_pairs']}")
    print(f"- Successfully Trained: {result['trained_pairs']}")
    print(f"- Skipped / Insufficient Data: {result['skipped_pairs']}")
    print(f"- Forecast Entries Cached: {result['forecasts_cached']}")

if __name__ == "__main__":
    main()
