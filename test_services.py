"""
Verification test suite for KrishiMitra backend services and calculation formulas.
"""

import sys
import os
from pathlib import Path

# Ensure UTF-8 output encoding on Windows console
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent / "backend"
sys.path.insert(0, str(backend_dir))

from database.db_init import init_db
from database.seed_data import seed_db
from services.transport_cost_calculator import calculate_transport_cost
from services.cost_estimation_service import estimate_other_costs
from services.net_price_calculator import calculate_net_price
from services.maps_distance_service import get_distance_km
from services.ranking_recommendation_engine import rank_and_recommend_mandis
from services.tts_engine import generate_speech
from services.analytics_reports_service import get_crop_analytics
from services.notification_service import get_active_notifications
from models.crop_model import CropModel
from models.mandi_model import MandiModel

def test_all():
    print("==================================================")
    print("Testing KrishiMitra Services & Mathematical Formulas")
    print("==================================================")

    # 1. DB Init & Seed
    init_db()
    seed_db(force_reseed=True)
    print("[PASS] DB initialization & seeding passed.")

    # 2. Crops & Mandis
    crops = CropModel.get_all()
    mandis = MandiModel.get_all()
    print(f"[PASS] Retrieved {len(crops)} crops and {len(mandis)} mandis.")
    assert len(crops) >= 5, "Should have at least 5 crops"
    assert len(mandis) >= 5, "Should have at least 5 mandis"

    # 3. Transport Cost Calculator
    # Nagpur to Amravati: 145km * 0.80 = 116.0
    t_res = calculate_transport_cost(distance_km=145.0, rate_per_km_per_quintal=0.80, quantity_quintal=10)
    assert t_res["per_quintal"] == 116.0, f"Expected 116.0, got {t_res['per_quintal']}"
    assert t_res["total"] == 1160.0, f"Expected 1160.0, got {t_res['total']}"
    print("[PASS] Transport Cost Calculator formula verified (145km x Rs 0.80 = Rs 116/qtl).")

    # 4. Net Price Calculator
    # Mandi 7250 - (Transport 116 + Other 0) = 7134
    net_res = calculate_net_price(mandi_price_per_qtl=7250.0, transport_cost_per_qtl=116.0, other_costs_per_qtl=0.0, quantity_quintal=10)
    assert net_res["net_price_per_qtl"] == 7134.0, f"Expected 7134.0, got {net_res['net_price_per_qtl']}"
    assert net_res["total_net_return"] == 71340.0, f"Expected 71340.0, got {net_res['total_net_return']}"
    print("[PASS] Net Price Calculator verified (Rs 7,250 - Rs 116 = Rs 7,134/qtl).")

    # 5. Full Ranking Engine on benchmark scenario (Cotton + Nagpur)
    cotton = next((c for c in crops if "cotton" in c["name"].lower()), crops[0])
    nagpur = next((m for m in mandis if "nagpur" in m["name"].lower()), mandis[0])

    ranking_res = rank_and_recommend_mandis(crop_id=cotton["id"], home_mandi_id=nagpur["id"], quantity_quintal=10)
    winner = ranking_res["recommended_mandi"]
    summary = ranking_res["effective_price_summary"]

    print("\n--- Benchmark Scenario Ranking Output ---")
    for m in ranking_res["ranked_mandis"]:
        print(f"Rank {m['rank']}: {m['mandi_name']} | Distance: {m['distance_km']}km | Listing: Rs {m['mandi_price_per_qtl']} | Trans: Rs {m['transport_cost_per_qtl']} | Other: Rs {m['other_costs_per_qtl']} | NET: Rs {m['net_price_per_qtl']}/qtl")

    assert "amravati" in winner["mandi_name"].lower(), f"Expected Amravati as winner, got {winner['mandi_name']}"
    assert winner["net_price_per_qtl"] == 7134.0, f"Expected 7134.0, got {winner['net_price_per_qtl']}"
    print(f"\n[PASS] Winner correctly determined: {winner['mandi_name']} with net price Rs {winner['net_price_per_qtl']}/qtl")

    # 6. Multilingual TTS
    mr_tts = generate_speech("Amravati", "Cotton", 7134, language="mr")
    print(f"[PASS] Multilingual Marathi TTS script generated successfully.")

    # 7. Analytics & Notifications
    analytics = get_crop_analytics(cotton["id"])
    notifications = get_active_notifications()
    assert "summary" in analytics, "Analytics should have summary"
    assert len(notifications) > 0, "Should have notifications"
    print(f"[PASS] Analytics and notifications verified. {len(notifications)} active alerts.")

    # 8. Direct Farmer-Buyer Marketplace Flow
    from services.deal_listing_service import create_deal_listing
    from services.buyer_feed_service import get_buyer_feed
    from services.deal_inquiry_service import register_inquiry
    from models.deal_model import DealModel

    # Test deal creation
    new_deal_res = create_deal_listing(
        farmer_name="Babanrao More",
        farmer_phone="9890123456",
        crop_id=cotton["id"],
        quantity_quintal=12.0,
        price_per_quintal=7300.0,
        location_name="Nagpur"
    )
    assert new_deal_res["status"] == "success", "Deal creation failed"
    created_id = new_deal_res["deal"]["id"]
    print(f"[PASS] Deal listing created successfully (ID: {created_id}).")

    # Test Buyer Feed and strict phone number privacy exclusion
    buyer_deals = get_buyer_feed(crop_filter="Cotton")
    assert len(buyer_deals) > 0, "Buyer feed should return active cotton deals"
    for d in buyer_deals:
        assert "farmer_phone" not in d, "CRITICAL: farmer_phone must NEVER be exposed in public buyer feed!"
        assert "price_per_quintal" in d
        assert "posted_ago" in d
    print(f"[PASS] Buyer feed verified ({len(buyer_deals)} deals). Farmer phone numbers are safely protected and excluded from feed.")

    # Test Inquiry Registration & Contact Unlocking
    inquiry_res = register_inquiry(deal_id=created_id, buyer_name="Suresh Agro Exports", buyer_phone="9988776655")
    assert inquiry_res["status"] == "success"
    assert inquiry_res["farmer_phone"] == "9890123456", "Inquiry must unlock the farmer phone number"
    print(f"[PASS] Deal inquiry registered and farmer phone unlocked successfully for verified buyer.")

    # Test Mark Deal as Sold
    DealModel.mark_deal_sold(created_id)
    inactive_inquiry = register_inquiry(deal_id=created_id, buyer_name="Another Buyer", buyer_phone="9900011223")
    assert inactive_inquiry["status"] == "error", "Inactive/sold deal must reject new inquiries"
    print(f"[PASS] Deal marked as sold and correctly rejected subsequent inquiries.")

    print("\n==================================================")
    print("🎉 ALL KRISHIMITRA SERVICE & MARKETPLACE TESTS PASSED!")
    print("==================================================")

if __name__ == "__main__":
    test_all()
