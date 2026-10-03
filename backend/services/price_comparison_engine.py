"""
File: price_comparison_engine.py
Purpose: Aggregates and aligns prices across all candidate mandis for a chosen crop,
         matching each mandi with its distance from the farmer's home mandi.
Inputs:  crop_id (int), home_mandi_id (int)
Outputs: list of dicts with mandi details, gross mandi prices, and distances from origin
Usage:   from services.price_comparison_engine import get_aligned_mandi_prices
         candidate_list = get_aligned_mandi_prices(crop_id=1, home_mandi_id=1)
"""

from models.price_model import PriceModel
from models.mandi_model import MandiModel
from services.maps_distance_service import get_distance_km

def get_aligned_mandi_prices(crop_id, home_mandi_id):
    """
    Fetches candidate mandi prices for a crop and pairs them with distance from home mandi.
    Explicitly flags if data for a certain mandi / district is unavailable.

    Parameters:
        crop_id (int): Selected crop ID
        home_mandi_id (int): Farmer's origin/home mandi ID

    Returns:
        list[dict]: List of candidate mandi listings with distance, price, and availability info
    """
    all_mandis = MandiModel.get_all()
    prices_list = PriceModel.get_by_crop_id(crop_id)
    price_map = {p["mandi_id"]: p for p in prices_list}

    aligned_results = []

    for mandi in all_mandis:
        mandi_id = mandi["id"]
        distance_km, distance_source = get_distance_km(home_mandi_id, mandi_id)
        price_record = price_map.get(mandi_id)

        has_price = (
            price_record is not None and 
            price_record.get("price_per_quintal") is not None and 
            float(price_record["price_per_quintal"]) > 0
        )
        gross_price = float(price_record["price_per_quintal"]) if has_price else None

        aligned_results.append({
            "mandi_id": mandi_id,
            "mandi_name": mandi["name"],
            "crop_id": crop_id,
            "crop_name": price_record["crop_name"] if price_record else "",
            "latitude": mandi.get("latitude"),
            "longitude": mandi.get("longitude"),
            "data_available": has_price,
            "mandi_price_per_qtl": gross_price,
            "distance_km": distance_km,
            "distance_source": distance_source,
            "last_updated": price_record.get("last_updated") if price_record else None
        })

    return aligned_results

if __name__ == "__main__":
    candidates = get_aligned_mandi_prices(crop_id=1, home_mandi_id=1)
    print(f"Aligned {len(candidates)} mandis for comparison.")
