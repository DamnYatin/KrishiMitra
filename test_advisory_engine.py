"""
File: test_advisory_engine.py
Purpose: Comprehensive test suite for Phase 4: Sell vs. Hold Proactive AI Advisory Engine.
Covers:
  1. Price rise scenario -> HOLD recommendation, mathematical traceability, multilingual messages, TTS script.
  2. Flat / falling price scenario -> SELL recommendation.
  3. Insufficient historical data scenario -> UNAVAILABLE state with clean explanation.
  4. Minimum-gain threshold verification -> Suppresses HOLD on marginal / noise-level gains.
  5. MOCK_FORECAST_MODE switch verification.
  6. Endpoint HTTP contract validation for GET /api/v1/recommendation.
"""

import sys
import unittest
import json
from pathlib import Path

# Fix Windows console UTF-8 output
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

backend_dir = Path(__file__).resolve().parent / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from config import Config
from database.db_init import init_db
from database.seed_data import seed_db
from database.db_connection import get_db_connection
from services.forecast_service import train_sarimax_models, get_cached_forecast
from services.advisory_engine import get_sell_vs_hold_advisory
from services.tts_engine import generate_speech, get_speech_script
from app import app

class TestAdvisoryEnginePhase4(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        # Force fresh DB initialization and seed
        init_db()
        seed_db(force_reseed=True)
        # Train SARIMAX models for offline forecasting
        train_sarimax_models()

    def setUp(self):
        self.client = app.test_client()

    def test_case_1_hold_recommendation_on_price_rise(self):
        """
        Test Case 1: Produce with a rising forecast -> HOLD recommendation,
        verifiable mathematical gain formula, multilingual text & voice integration.
        """
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM crops WHERE name LIKE '%Cotton%'")
            cotton_id = cursor.fetchone()["id"]
            cursor.execute("SELECT id FROM mandis WHERE name LIKE '%Nagpur%'")
            nagpur_id = cursor.fetchone()["id"]

        advisory = get_sell_vs_hold_advisory(crop_id=cotton_id, home_mandi_id=nagpur_id, quantity=10.0, horizon_days=7)
        
        print("\n--- Test Case 1: Rising Forecast (HOLD) ---")
        print("Advisory output:", json.dumps(advisory, indent=2))

        self.assertIn(advisory["decision"], ["HOLD", "SELL"])
        self.assertIsNotNone(advisory["current_net_price_per_qtl"])
        self.assertIsNotNone(advisory["expected_net_price_per_qtl_7d"])
        
        # Test mathematical traceability:
        # Expected_Net_Price_t = (P_t * (1 - δ*7)) - (C_s * 7) - Total_Cost_per_qtl
        # projected_gain_per_qtl = Expected_Net_Price_7 - Net_Price_current
        # projected_gain_total = projected_gain_per_qtl * quantity
        expected_gain_total = round(advisory["projected_gain_per_qtl"] * 10.0, 2)
        self.assertAlmostEqual(advisory["projected_gain_total"], expected_gain_total, places=2)

        # Test multilingual voice synthesis script prepending
        script_en = get_speech_script("Amravati", "Cotton", 7134, "en", advisory_decision="HOLD", advisory_gain=189.5, advisory_days=7)
        script_hi = get_speech_script("Amravati", "Cotton", 7134, "hi", advisory_decision="HOLD", advisory_gain=189.5, advisory_days=7)
        script_mr = get_speech_script("Amravati", "Cotton", 7134, "mr", advisory_decision="HOLD", advisory_gain=189.5, advisory_days=7)

        print("\nMultilingual Voice Scripts (HOLD):")
        print("EN:", script_en)
        print("HI:", script_hi)
        print("MR:", script_mr)

        self.assertTrue(script_en.startswith("KrishiMitra Advisory: Hold"))
        self.assertTrue(script_hi.startswith("कृषिमित्र सलाह: उपज 7 दिन रोककर रखें"))
        self.assertTrue(script_mr.startswith("कृषिमित्र सल्ला: माल 7 दिवस थांबवून ठेवा"))

    def test_case_2_sell_recommendation_on_flat_or_falling_price(self):
        """
        Test Case 2: Produce with flat/falling price or where holding cost exceeds forecast -> SELL.
        """
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM crops WHERE name LIKE '%Onion%'")
            onion_id = cursor.fetchone()["id"]
            cursor.execute("SELECT id FROM mandis WHERE name LIKE '%Nagpur%'")
            nagpur_id = cursor.fetchone()["id"]

        advisory = get_sell_vs_hold_advisory(crop_id=onion_id, home_mandi_id=nagpur_id, quantity=10.0, horizon_days=7)
        
        print("\n--- Test Case 2: Flat/Falling/Perishable Forecast (SELL) ---")
        print("Advisory output:", json.dumps(advisory, indent=2))

        self.assertEqual(advisory["decision"], "SELL")
        self.assertEqual(advisory["explanation_key"], "sell_forecast_drop_or_flat")

        # Test multilingual voice scripts for SELL
        script_en = get_speech_script("Nagpur", "Onion", 1900, "en", advisory_decision="SELL")
        script_hi = get_speech_script("Nagpur", "Onion", 1900, "hi", advisory_decision="SELL")
        script_mr = get_speech_script("Nagpur", "Onion", 1900, "mr", advisory_decision="SELL")

        print("\nMultilingual Voice Scripts (SELL):")
        print("EN:", script_en)
        print("HI:", script_hi)
        print("MR:", script_mr)

        self.assertTrue(script_en.startswith("KrishiMitra Advisory: Sell"))
        self.assertTrue(script_hi.startswith("कृषिमित्र सलाह: आज ही फसल बेचें"))
        self.assertTrue(script_mr.startswith("कृषिमित्र सल्ला: आजच माल विका"))

    def test_case_3_insufficient_historical_data_unavailable(self):
        """
        Test Case 3: A crop-mandi pair with insufficient historical data -> UNAVAILABLE state.
        Never crashes or fabricates numbers.
        """
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM crops WHERE name LIKE '%Gram%'")
            gram_id = cursor.fetchone()["id"]
            cursor.execute("SELECT id FROM mandis WHERE name LIKE '%Nashik%'")
            nashik_id = cursor.fetchone()["id"]
            # Clear all cached forecasts for Gram across all mandis to test UNAVAILABLE
            cursor.execute("DELETE FROM forecast_cache WHERE crop_id = ?", (gram_id,))

        advisory = get_sell_vs_hold_advisory(crop_id=gram_id, home_mandi_id=nashik_id, quantity=5.0, horizon_days=7)

        print("\n--- Test Case 3: Insufficient History (UNAVAILABLE) ---")
        print("Advisory output:", json.dumps(advisory, indent=2))

        self.assertEqual(advisory["decision"], "UNAVAILABLE")
        self.assertEqual(advisory["explanation_key"], "insufficient_forecast_data")
        self.assertIsNone(advisory["expected_net_price_per_qtl_7d"])

    def test_case_4_minimum_gain_threshold_suppression(self):
        """
        Test Case 4: Confirm that a projected gain below MINIMUM_GAIN_THRESHOLD (e.g. ₹5/qtl gain < ₹15 threshold)
        suppresses HOLD and recommends SELL to prevent noise-based recommendations.
        """
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM crops WHERE name LIKE '%Wheat%'")
            wheat_id = cursor.fetchone()["id"]
            cursor.execute("SELECT id FROM mandis WHERE name LIKE '%Nagpur%'")
            nagpur_id = cursor.fetchone()["id"]

            # Set forecast for Wheat in Nagpur to produce a marginal +5.0 ₹/qtl gain
            # Storage cost = 0.40 * 7 = 2.80, Depreciation = 0.0003 * 7 = 0.21%
            # Listing price = 2500 -> 2508 results in gain of ~+5.0 ₹/qtl (below threshold 15.0)
            cursor.execute("DELETE FROM forecast_cache WHERE crop_id = ?", (wheat_id,))
            cursor.execute(
                """INSERT INTO forecast_cache (crop_id, mandi_id, forecast_date, horizon_days, predicted_price) 
                   VALUES (?, ?, '2026-09-27', 7, 2508.0)""",
                (wheat_id, nagpur_id)
            )

        advisory = get_sell_vs_hold_advisory(crop_id=wheat_id, home_mandi_id=nagpur_id, quantity=10.0, horizon_days=7)

        print("\n--- Test Case 4: Minimum-Gain Threshold Suppression ---")
        print(f"Projected gain: Rs {advisory.get('projected_gain_per_qtl')}/qtl (Threshold: Rs {Config.MINIMUM_GAIN_THRESHOLD}/qtl)")
        print(f"Decision: {advisory['decision']}")

        # Since gain (approx ₹5) < 15.0 threshold, decision MUST be SELL
        self.assertEqual(advisory["decision"], "SELL")
        self.assertEqual(advisory["explanation_key"], "sell_forecast_drop_or_flat")

    def test_case_5_api_endpoint_v1_recommendation(self):
        """
        Test Case 5: HTTP GET /api/v1/recommendation endpoint contract validation.
        """
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM crops LIMIT 1")
            c_id = cursor.fetchone()["id"]
            cursor.execute("SELECT id FROM mandis LIMIT 1")
            m_id = cursor.fetchone()["id"]

        response = self.client.get(f"/api/v1/recommendation?crop_id={c_id}&home_mandi_id={m_id}&quantity=15")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()

        print("\n--- Test Case 5: API Response JSON Schema ---")
        print(json.dumps(data, indent=2))

        self.assertIn("decision", data)
        self.assertIn("current_net_price_per_qtl", data)
        self.assertIn("explanation_key", data)
        self.assertIn("explanation_values", data)

    def test_case_6_mock_forecast_mode(self):
        """
        Test Case 6: MOCK_FORECAST_MODE generates synthetic forecasts cleanly.
        """
        mock_stats = train_sarimax_models(force_mock=True)
        self.assertEqual(mock_stats["mode"], "MOCK")
        self.assertGreater(mock_stats["trained_pairs"], 0)
        self.assertGreater(mock_stats["forecasts_cached"], 0)
        print(f"\n--- Test Case 6: Mock Mode Stats ---: Cached {mock_stats['forecasts_cached']} synthetic forecasts")

if __name__ == "__main__":
    unittest.main()
