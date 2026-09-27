"""
File: forecast_service.py
Purpose: Offline batch training and price forecasting service using SARIMAX (Seasonal ARIMA
         with Exogenous Regressors) via statsmodels. Generates multi-horizon forecasts (7, 14, 30 days)
         and populates `forecast_cache`. Also supports MOCK_FORECAST_MODE for synthetic demo testing.
Inputs:  Historical time series from `price_history_extended` (date, listing_price, rainfall_index, fuel_price_index)
Outputs: Cached predicted listing prices (P_t) in `forecast_cache`
Usage:   from services.forecast_service import train_sarimax_models, get_cached_forecast
         train_sarimax_models()
"""

import datetime
import logging
import random
import numpy as np
import pandas as pd
from database.db_connection import get_db_connection
from config import Config

logger = logging.getLogger("krishimitra.forecast")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

# Minimum daily historical records required per crop-mandi pair to train SARIMAX
MIN_TRAIN_SAMPLES = 15

# Supported forecast horizons in days
FORECAST_HORIZONS = [7, 14, 30]

def train_sarimax_models(db_path=None, force_mock=False):
    """
    Offline/batch training job.
    1. Iterates over all crop-mandi pairs.
    2. Loads price_history_extended.
    3. Fits SARIMAX model per pair using statsmodels (or generates synthetic predictions if mock mode).
    4. Writes 7, 14, 30 day forecasts into forecast_cache, replacing prior entries for today.

    Granularity Note:
    - We train one model per (crop, mandi) pair. This captures distinct local market dynamics
      (e.g., Nashik onion pricing has different seasonal surges than Nagpur).
    - If a specific pair has fewer than MIN_TRAIN_SAMPLES (e.g. sparse demo entries), it is skipped
      and logged clearly, returning UNAVAILABLE when queried at runtime.
    """
    is_mock = force_mock or Config.MOCK_FORECAST_MODE
    today = datetime.date.today().isoformat()

    logger.info(f"=== Starting Forecast Training Job (Mode: {'MOCK' if is_mock else 'REAL SARIMAX'}) ===")

    stats = {
        "mode": "MOCK" if is_mock else "REAL_SARIMAX",
        "total_pairs": 0,
        "trained_pairs": 0,
        "skipped_pairs": 0,
        "forecasts_cached": 0,
        "details": []
    }

    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()

        # Fetch all crops and mandis
        cursor.execute("SELECT id, name FROM crops")
        crops = cursor.fetchall()
        cursor.execute("SELECT id, name FROM mandis")
        mandis = cursor.fetchall()

        stats["total_pairs"] = len(crops) * len(mandis)

        # Pre-fetch current baseline prices
        cursor.execute("SELECT crop_id, mandi_id, price_per_quintal FROM prices")
        current_prices = {(r["crop_id"], r["mandi_id"]): r["price_per_quintal"] for r in cursor.fetchall()}

        for crop in crops:
            c_id = crop["id"]
            c_name = crop["name"]

            for mandi in mandis:
                m_id = mandi["id"]
                m_name = mandi["name"]
                pair_label = f"Crop '{c_name}' (id={c_id}) @ Mandi '{m_name}' (id={m_id})"

                if is_mock:
                    # Mock Mode: Produce realistic synthetic forecast based on crop type
                    base_price = current_prices.get((c_id, m_id), 4500.0)
                    # Varied bias: Cotton/Soybean positive drift (+5% to +12%), Onion/Wheat slight drop (-4% to -8%)
                    bias = 0.08 if ("Cotton" in c_name or "Soybean" in c_name) else -0.04
                    
                    forecast_records = []
                    for h in FORECAST_HORIZONS:
                        factor = 1.0 + (bias * (h / 7.0)) + random.uniform(-0.015, 0.015)
                        pred_price = round(base_price * factor, 2)
                        forecast_records.append((c_id, m_id, today, h, pred_price))

                    # Replace prior entries for today
                    cursor.execute(
                        "DELETE FROM forecast_cache WHERE crop_id = ? AND mandi_id = ? AND forecast_date = ?",
                        (c_id, m_id, today)
                    )
                    cursor.executemany(
                        """INSERT INTO forecast_cache 
                           (crop_id, mandi_id, forecast_date, horizon_days, predicted_price) 
                           VALUES (?, ?, ?, ?, ?)""",
                        forecast_records
                    )
                    stats["trained_pairs"] += 1
                    stats["forecasts_cached"] += len(forecast_records)
                    stats["details"].append({"pair": pair_label, "status": "MOCK_TRAINED", "samples": "N/A"})
                    continue

                # Real SARIMAX Training Mode
                cursor.execute(
                    """SELECT date, listing_price, rainfall_index, fuel_price_index 
                       FROM price_history_extended 
                       WHERE crop_id = ? AND mandi_id = ? 
                       ORDER BY date ASC""",
                    (c_id, m_id)
                )
                rows = cursor.fetchall()
                sample_count = len(rows)

                if sample_count < MIN_TRAIN_SAMPLES:
                    logger.warning(f"SKIPPED {pair_label}: Insufficient historical data ({sample_count} < {MIN_TRAIN_SAMPLES} samples)")
                    stats["skipped_pairs"] += 1
                    stats["details"].append({"pair": pair_label, "status": "SKIPPED_INSUFFICIENT_DATA", "samples": sample_count})
                    continue

                try:
                    df = pd.DataFrame(rows, columns=["date", "listing_price", "rainfall_index", "fuel_price_index"])
                    df["date"] = pd.to_datetime(df["date"])
                    df = df.set_index("date").asfreq("D").ffill().bfill()

                    y = df["listing_price"].astype(float)
                    exog = df[["rainfall_index", "fuel_price_index"]].astype(float)

                    # Import SARIMAX
                    from statsmodels.tsa.statespace.sarimax import SARIMAX

                    # Order (p=1, d=1, q=1) with 7-day seasonality (P=1, D=1, Q=0, s=7)
                    model = SARIMAX(
                        endog=y,
                        exog=exog,
                        order=(1, 1, 1),
                        seasonal_order=(1, 1, 0, 7),
                        enforce_stationarity=False,
                        enforce_invertibility=False
                    )
                    fit_result = model.fit(disp=False, maxiter=50)

                    # Prepare future exog extrapolation
                    last_rain = exog["rainfall_index"].iloc[-1]
                    last_fuel = exog["fuel_price_index"].iloc[-1]

                    max_h = max(FORECAST_HORIZONS)
                    future_exog = pd.DataFrame({
                        "rainfall_index": [last_rain] * max_h,
                        "fuel_price_index": [last_fuel] * max_h
                    })

                    forecast_values = fit_result.forecast(steps=max_h, exog=future_exog)

                    forecast_records = []
                    for h in FORECAST_HORIZONS:
                        pred_p = round(float(forecast_values.iloc[h - 1]), 2)
                        forecast_records.append((c_id, m_id, today, h, pred_p))

                    # Replace prior cache entries for today
                    cursor.execute(
                        "DELETE FROM forecast_cache WHERE crop_id = ? AND mandi_id = ? AND forecast_date = ?",
                        (c_id, m_id, today)
                    )
                    cursor.executemany(
                        """INSERT INTO forecast_cache 
                           (crop_id, mandi_id, forecast_date, horizon_days, predicted_price) 
                           VALUES (?, ?, ?, ?, ?)""",
                        forecast_records
                    )

                    stats["trained_pairs"] += 1
                    stats["forecasts_cached"] += len(forecast_records)
                    stats["details"].append({"pair": pair_label, "status": "SARIMAX_SUCCESS", "samples": sample_count})
                    logger.info(f"TRAINED {pair_label}: 7d=₹{forecast_records[0][4]}, 14d=₹{forecast_records[1][4]}, 30d=₹{forecast_records[2][4]}")

                except Exception as e:
                    logger.error(f"FAILED training for {pair_label}: {str(e)}")
                    stats["skipped_pairs"] += 1
                    stats["details"].append({"pair": pair_label, "status": f"ERROR: {str(e)}", "samples": sample_count})

        conn.commit()

    logger.info(f"=== Training Complete: {stats['trained_pairs']} trained, {stats['skipped_pairs']} skipped, {stats['forecasts_cached']} cache entries ===")
    return stats


def get_cached_forecast(crop_id, mandi_id, horizon_days=7, db_path=None):
    """
    Reads the latest precomputed forecast listing price (P_t) for a crop-mandi pair from forecast_cache.
    Returns:
        dict: {"predicted_price": float, "forecast_date": str, "horizon_days": int} or None if unavailable.
    """
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute(
            """SELECT predicted_price, forecast_date, horizon_days, generated_at 
               FROM forecast_cache 
               WHERE crop_id = ? AND mandi_id = ? AND horizon_days = ? 
               ORDER BY generated_at DESC, id DESC 
               LIMIT 1""",
            (crop_id, mandi_id, horizon_days)
        )
        row = cursor.fetchone()
        if row:
            return {
                "predicted_price": float(row["predicted_price"]),
                "forecast_date": row["forecast_date"],
                "horizon_days": int(row["horizon_days"]),
                "generated_at": row["generated_at"]
            }
        return None
