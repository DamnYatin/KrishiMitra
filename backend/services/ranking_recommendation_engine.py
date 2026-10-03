"""
File: ranking_recommendation_engine.py
Purpose: Evaluates all candidate mandis for a given crop, farmer location, and harvest quantity.
         Calculates transport, loading/unloading, and market fees, computes net returns,
         and ranks mandis descending by net price per quintal to recommend the most profitable mandi.
Inputs:  crop_id (int), home_mandi_id (int), quantity_quintal (float, default=1.0)
Outputs: dict containing ranked mandi list, top recommended mandi, and effective price summary
Usage:   from services.ranking_recommendation_engine import rank_and_recommend_mandis
         result = rank_and_recommend_mandis(crop_id=1, home_mandi_id=1, quantity_quintal=10)
"""

from models.crop_model import CropModel
from models.mandi_model import MandiModel
from models.cost_model import CostModel
from services.price_comparison_engine import get_aligned_mandi_prices
from services.transport_cost_calculator import calculate_transport_cost
from services.cost_estimation_service import estimate_other_costs
from services.net_price_calculator import calculate_net_price

def rank_and_recommend_mandis(crop_id, home_mandi_id, quantity_quintal=1.0):
    """
    Ranks mandis by net realized price per quintal and generates recommendations.

    Parameters:
        crop_id (int): Crop identifier
        home_mandi_id (int): Home/origin mandi identifier
        quantity_quintal (float): Quantity of produce to sell in quintals

    Returns:
        dict: {
            "crop": dict,
            "home_mandi": dict,
            "quantity_quintal": float,
            "rate_per_km_per_quintal": float,
            "ranked_mandis": list[dict],
            "recommended_mandi": dict,
            "effective_price_summary": dict
        }
    """
    try:
        qty = float(quantity_quintal) if quantity_quintal and float(quantity_quintal) > 0 else 1.0
    except (ValueError, TypeError):
        qty = 1.0

    crop = CropModel.get_by_id(crop_id)
    home_mandi = MandiModel.get_by_id(home_mandi_id)
    transport_rate = CostModel.get_transport_rate()

    candidates = get_aligned_mandi_prices(crop_id, home_mandi_id)
    evaluated_mandis = []

    for item in candidates:
        mandi_id = item["mandi_id"]
        distance_km = item["distance_km"]
        gross_price = item["mandi_price_per_qtl"]
        data_available = item.get("data_available", True)

        if not data_available or gross_price is None or gross_price <= 0:
            # Data is unavailable for this district/mandi
            evaluated_mandis.append({
                "mandi_id": mandi_id,
                "mandi_name": item["mandi_name"],
                "latitude": item.get("latitude"),
                "longitude": item.get("longitude"),
                "distance_km": distance_km,
                "distance_source": item["distance_source"],
                "data_available": False,
                "mandi_price_per_qtl": None,
                "transport_cost_per_qtl": None,
                "other_costs_per_qtl": None,
                "loading_per_qtl": None,
                "unloading_per_qtl": None,
                "market_charge_per_qtl": None,
                "total_cost_per_qtl": None,
                "net_price_per_qtl": None,
                "gross_mandi_revenue": None,
                "total_expenses": None,
                "total_net_return": None,
                "is_home_mandi": (mandi_id == home_mandi_id)
            })
            continue

        # 1. Transport Cost
        transport_calc = calculate_transport_cost(distance_km, transport_rate, qty)

        # 2. Other Handling Costs
        other_costs_calc = estimate_other_costs(mandi_id, qty)

        # 3. Net Price & Total Return
        net_calc = calculate_net_price(
            mandi_price_per_qtl=gross_price,
            transport_cost_per_qtl=transport_calc["per_quintal"],
            other_costs_per_qtl=other_costs_calc["per_quintal"],
            quantity_quintal=qty
        )

        evaluated_mandis.append({
            "mandi_id": mandi_id,
            "mandi_name": item["mandi_name"],
            "latitude": item.get("latitude"),
            "longitude": item.get("longitude"),
            "distance_km": distance_km,
            "distance_source": item["distance_source"],
            "data_available": True,
            "mandi_price_per_qtl": gross_price,
            "transport_cost_per_qtl": transport_calc["per_quintal"],
            "other_costs_per_qtl": other_costs_calc["per_quintal"],
            "loading_per_qtl": other_costs_calc["loading_per_qtl"],
            "unloading_per_qtl": other_costs_calc["unloading_per_qtl"],
            "market_charge_per_qtl": other_costs_calc["market_charge_per_qtl"],
            "total_cost_per_qtl": net_calc["total_cost_per_qtl"],
            "net_price_per_qtl": net_calc["net_price_per_qtl"],
            "gross_mandi_revenue": net_calc["gross_mandi_revenue"],
            "total_expenses": net_calc["total_expenses"],
            "total_net_return": net_calc["total_net_return"],
            "is_home_mandi": (mandi_id == home_mandi_id)
        })

    # Separate verified available mandis from unavailable ones
    available_mandis = [m for m in evaluated_mandis if m["data_available"]]
    unavailable_mandis = [m for m in evaluated_mandis if not m["data_available"]]

    # Sort available descending by net price per quintal
    available_mandis.sort(key=lambda x: x["net_price_per_qtl"], reverse=True)

    # Assign ranks and badges
    for index, mandi in enumerate(available_mandis):
        mandi["rank"] = index + 1
        mandi["is_recommended"] = (index == 0)

    for mandi in unavailable_mandis:
        mandi["rank"] = None
        mandi["is_recommended"] = False

    evaluated_mandis = available_mandis + unavailable_mandis
    recommended = available_mandis[0] if available_mandis else None

    # Calculate net profit gain compared to selling at home mandi (if home mandi data is available)
    home_mandi_entry = next((m for m in available_mandis if m["is_home_mandi"]), None)
    profit_gain_per_qtl = 0.0
    total_profit_gain = 0.0
    if recommended and home_mandi_entry and home_mandi_entry.get("net_price_per_qtl") is not None:
        profit_gain_per_qtl = round(recommended["net_price_per_qtl"] - home_mandi_entry["net_price_per_qtl"], 2)
        total_profit_gain = round(recommended["total_net_return"] - home_mandi_entry["total_net_return"], 2)

    # Effective Price Summary for the recommended mandi
    effective_price_summary = {}
    if recommended:
        effective_price_summary = {
            "mandi_name": recommended["mandi_name"],
            "distance_km": recommended["distance_km"],
            "mandi_price_per_qtl": recommended["mandi_price_per_qtl"],
            "transport_cost_per_qtl": recommended["transport_cost_per_qtl"],
            "other_costs_per_qtl": recommended["other_costs_per_qtl"],
            "total_cost_per_qtl": recommended["total_cost_per_qtl"],
            "net_price_per_qtl": recommended["net_price_per_qtl"],
            "quantity_quintal": qty,
            "total_net_return": recommended["total_net_return"],
            "profit_gain_per_qtl": max(0.0, profit_gain_per_qtl),
            "total_profit_gain": max(0.0, total_profit_gain),
            "is_different_from_home": (home_mandi_entry is not None and recommended["mandi_id"] != home_mandi_id)
        }

    return {
        "crop": crop,
        "home_mandi": home_mandi,
        "quantity_quintal": qty,
        "rate_per_km_per_quintal": transport_rate,
        "ranked_mandis": evaluated_mandis,
        "recommended_mandi": recommended,
        "effective_price_summary": effective_price_summary
    }

if __name__ == "__main__":
    res = rank_and_recommend_mandis(crop_id=1, home_mandi_id=1, quantity_quintal=1.0)
    print("Ranking Result Summary:")
    print(f"Top Mandi: {res['recommended_mandi']['mandi_name']} at Rs {res['recommended_mandi']['net_price_per_qtl']}/qtl")
