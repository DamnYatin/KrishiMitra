"""
File: advisory_engine.py
Purpose: Core Sell vs. Hold Proactive AI Advisory Engine (KrishiMitra Phase 4).
         Evaluates whether a farmer should sell at the current champion mandi today
         or hold produce for t days (default 7 days) based on SARIMAX price forecasts,
         storage costs, and daily depreciation/spoilage.
Formula:
    Storage_Cost_t = C_s * t
    Depreciation_Loss_t = δ * t
    Expected_Net_Price_t = (P_t * (1 - Depreciation_Loss_t)) - Storage_Cost_t - Total_Cost_per_qtl
    Decision:
      - If Expected_Net_Price_t - Net_Price_current > MINIMUM_GAIN_THRESHOLD => HOLD
      - Else => SELL
      - If no forecast available => UNAVAILABLE
Inputs:  crop_id (int), home_mandi_id (int), quantity (float, default=1.0), horizon_days (int, default=7)
Outputs: Dict containing decision, current_net_price, expected_net_price, projected_gains, and explanation keys
"""

from config import Config
from database.db_connection import get_db_connection
from services.ranking_recommendation_engine import rank_and_recommend_mandis
from services.forecast_service import get_cached_forecast

def get_crop_holding_parameters(crop_id, db_path=None):
    """
    Retrieves storage cost per qtl per day (C_s) and daily depreciation rate (δ) for a crop.
    Falls back to safe defaults if not found in database.
    """
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT daily_storage_cost, daily_depreciation_rate FROM crop_holding_parameters WHERE crop_id = ?",
            (crop_id,)
        )
        row = cursor.fetchone()
        if row:
            return {
                "daily_storage_cost": float(row["daily_storage_cost"]),
                "daily_depreciation_rate": float(row["daily_depreciation_rate"])
            }
        
        # Fallback reasonable defaults
        return {
            "daily_storage_cost": 0.50,
            "daily_depreciation_rate": 0.0005
        }

def get_sell_vs_hold_advisory(crop_id, home_mandi_id, quantity=1.0, horizon_days=7, db_path=None):
    """
    Computes proactive Sell vs. Hold recommendation for the given crop and mandi.

    Parameters:
        crop_id (int): Crop ID
        home_mandi_id (int): Farmer's home mandi ID
        quantity (float): Harvest quantity in quintals (default: 1.0)
        horizon_days (int): Future holding duration in days (default: 7)

    Returns:
        dict: {
            "decision": "HOLD" | "SELL" | "UNAVAILABLE",
            "current_net_price_per_qtl": float,
            "expected_net_price_per_qtl_7d": float | None,
            "projected_gain_per_qtl": float | None,
            "projected_gain_total": float | None,
            "holding_cost_per_qtl": float | None,
            "depreciation_rate_total": float | None,
            "forecast_listing_price": float | None,
            "recommended_mandi_id": int | None,
            "recommended_mandi_name": str | None,
            "explanation_key": str,
            "explanation_values": dict
        }
    """
    try:
        c_id = int(crop_id)
        h_mandi_id = int(home_mandi_id)
        qty = float(quantity) if quantity and float(quantity) > 0 else 1.0
        h_days = int(horizon_days) if horizon_days else 7
    except (ValueError, TypeError):
        return {
            "decision": "UNAVAILABLE",
            "current_net_price_per_qtl": 0.0,
            "expected_net_price_per_qtl_7d": None,
            "projected_gain_per_qtl": 0.0,
            "projected_gain_total": 0.0,
            "explanation_key": "invalid_parameters",
            "explanation_values": {}
        }

    # 1. Reuse existing Mandi Compare service to evaluate current net prices
    compare_result = rank_and_recommend_mandis(
        crop_id=c_id,
        home_mandi_id=h_mandi_id,
        quantity_quintal=qty
    )

    winner = compare_result.get("recommended_mandi")
    if not winner:
        return {
            "decision": "UNAVAILABLE",
            "current_net_price_per_qtl": 0.0,
            "expected_net_price_per_qtl_7d": None,
            "projected_gain_per_qtl": 0.0,
            "projected_gain_total": 0.0,
            "explanation_key": "no_market_data",
            "explanation_values": {}
        }

    current_net_price = float(winner["net_price_per_qtl"])
    total_logistics_cost = float(winner["total_cost_per_qtl"])
    current_gross_price = float(winner["mandi_price_per_qtl"])
    target_mandi_id = winner["mandi_id"]
    target_mandi_name = winner["mandi_name"]

    # 2. Query forecast_cache for horizon_days (default 7 days)
    forecast_data = get_cached_forecast(
        crop_id=c_id,
        mandi_id=target_mandi_id,
        horizon_days=h_days,
        db_path=db_path
    )

    # If target mandi has no cached forecast, check if home mandi has one
    if not forecast_data and target_mandi_id != h_mandi_id:
        forecast_data = get_cached_forecast(
            crop_id=c_id,
            mandi_id=h_mandi_id,
            horizon_days=h_days,
            db_path=db_path
        )

    # If still no forecast (e.g. insufficient history), return UNAVAILABLE
    if not forecast_data:
        return {
            "decision": "UNAVAILABLE",
            "current_net_price_per_qtl": current_net_price,
            "current_gross_price_per_qtl": current_gross_price,
            "expected_net_price_per_qtl_7d": None,
            "projected_gain_per_qtl": 0.0,
            "projected_gain_total": 0.0,
            "forecast_listing_price": None,
            "price_change_per_qtl": 0.0,
            "storage_cost_per_qtl": 0.0,
            "depreciation_cost_per_qtl": 0.0,
            "total_holding_cost_per_qtl": 0.0,
            "loss_avoided_per_qtl": 0.0,
            "loss_avoided_total": 0.0,
            "recommended_mandi_id": target_mandi_id,
            "recommended_mandi_name": target_mandi_name,
            "reasons": [
                "Insufficient historical price data to generate a reliable 7-day predictive forecast for this market."
            ],
            "explanation_key": "insufficient_forecast_data",
            "explanation_values": {
                "days": h_days,
                "mandi_name": target_mandi_name
            }
        }

    p_t = float(forecast_data["predicted_price"])

    # 3. Retrieve holding & depreciation parameters
    holding_params = get_crop_holding_parameters(c_id, db_path=db_path)
    c_s = holding_params["daily_storage_cost"]
    delta = holding_params["daily_depreciation_rate"]

    # 4. Holding Cost & Spoilage Formulas
    # Storage_Cost_t = C_s * t (₹/qtl)
    storage_cost_t = round(c_s * h_days, 2)
    
    # Depreciation_Loss_t = δ * t (fractional loss)
    depreciation_loss_rate = round(delta * h_days, 4)
    # Monetary impact of physical degradation per qtl
    depreciation_cost_t = round(p_t * depreciation_loss_rate, 2)
    total_holding_cost = round(storage_cost_t + depreciation_cost_t, 2)
    
    # Expected_Net_Price_t = (P_t * (1 - Depreciation_Loss_t)) - Storage_Cost_t - Total_Cost_per_qtl
    expected_net_price_t = round((p_t * (1.0 - depreciation_loss_rate)) - storage_cost_t - total_logistics_cost, 2)

    # 5. Projected Gains & Price Differences
    gross_price_change = round(p_t - current_gross_price, 2)
    gain_per_qtl = round(expected_net_price_t - current_net_price, 2)
    gain_total = round(gain_per_qtl * qty, 2)

    # Minimum gain threshold prevents recommending HOLD on trivial / noise gains
    min_threshold = Config.MINIMUM_GAIN_THRESHOLD

    if gain_per_qtl > min_threshold:
        decision = "HOLD"
        explanation_key = "hold_forecast_rise"
        reasons = [
            f"Forecast predicts prices in {target_mandi_name} will increase from ₹{current_gross_price:,.2f} to ₹{p_t:,.2f} (+₹{gross_price_change:,.2f}/qtl) over {h_days} days.",
            f"Holding costs are moderate: storage fee is ₹{storage_cost_t:,.2f}/qtl and estimated moisture/spoilage loss is ₹{depreciation_cost_t:,.2f}/qtl.",
            f"Net financial outcome: Waiting yields an extra profit of ₹{gain_per_qtl:,.2f}/qtl (+₹{gain_total:,.2f} total for {qty:g} quintals) compared to selling today."
        ]
        loss_avoided_per_qtl = 0.0
        loss_avoided_total = 0.0
        explanation_values = {
            "gain_per_qtl": gain_per_qtl,
            "gain_total": gain_total,
            "days": h_days,
            "current_gross": current_gross_price,
            "forecast_price": p_t,
            "price_diff": gross_price_change,
            "storage_cost": storage_cost_t,
            "depreciation_cost": depreciation_cost_t,
            "total_holding_cost": total_holding_cost,
            "expected_net": expected_net_price_t,
            "current_net": current_net_price,
            "quantity": qty,
            "mandi_name": target_mandi_name
        }
    else:
        decision = "SELL"
        explanation_key = "sell_forecast_drop_or_flat"
        loss_avoided_per_qtl = max(0.0, round(-gain_per_qtl, 2))
        loss_avoided_total = round(loss_avoided_per_qtl * qty, 2)
        reasons = [
            f"Forecast predicts prices in {target_mandi_name} will move from ₹{current_gross_price:,.2f} to ₹{p_t:,.2f} ({'+' if gross_price_change >= 0 else ''}₹{gross_price_change:,.2f}/qtl) over {h_days} days, which does not outpace holding costs.",
            f"Holding produce incurs unnecessary expenses: ₹{storage_cost_t:,.2f}/qtl storage and ₹{depreciation_cost_t:,.2f}/qtl spoilage/moisture loss (total ₹{total_holding_cost:,.2f}/qtl).",
            f"Net financial outcome: Selling today locks in your top net return of ₹{current_net_price:,.2f}/qtl and protects you from an estimated loss of ₹{loss_avoided_per_qtl:,.2f}/qtl (₹{loss_avoided_total:,.2f} total loss avoided)."
        ]
        explanation_values = {
            "gain_per_qtl": gain_per_qtl,
            "gain_total": gain_total,
            "loss_avoided_per_qtl": loss_avoided_per_qtl,
            "loss_avoided_total": loss_avoided_total,
            "days": h_days,
            "current_gross": current_gross_price,
            "forecast_price": p_t,
            "price_diff": abs(gross_price_change),
            "storage_cost": storage_cost_t,
            "depreciation_cost": depreciation_cost_t,
            "total_holding_cost": total_holding_cost,
            "expected_net": expected_net_price_t,
            "current_net": current_net_price,
            "quantity": qty,
            "mandi_name": target_mandi_name
        }

    return {
        "decision": decision,
        "current_net_price_per_qtl": current_net_price,
        "current_gross_price_per_qtl": current_gross_price,
        "expected_net_price_per_qtl_7d": expected_net_price_t,
        "projected_gain_per_qtl": gain_per_qtl,
        "projected_gain_total": gain_total,
        "loss_avoided_per_qtl": loss_avoided_per_qtl,
        "loss_avoided_total": loss_avoided_total,
        "price_change_per_qtl": gross_price_change,
        "holding_cost_per_qtl": storage_cost_t,
        "depreciation_cost_per_qtl": depreciation_cost_t,
        "total_holding_cost_per_qtl": total_holding_cost,
        "depreciation_rate_total": depreciation_loss_rate,
        "forecast_listing_price": p_t,
        "recommended_mandi_id": target_mandi_id,
        "recommended_mandi_name": target_mandi_name,
        "reasons": reasons,
        "explanation_key": explanation_key,
        "explanation_values": explanation_values
    }
