"""
File: data_fetcher_service.py
Purpose: Data fetcher service simulating periodic / real-time price feeds from Agmarknet & e-NAM.
         Applies realistic market fluctuations and provides a clean integration seam for Phase 2
         real government Agmarknet / data.gov.in API keys.
Inputs:  None (optional crop_id to refresh specific crop)
Outputs: dict with summary of updated prices and timestamp
Usage:   from services.data_fetcher_service import DataFetcherService
         result = DataFetcherService.fetch_and_update_prices()
"""

import random
import re
import datetime
import xml.etree.ElementTree as ET
import requests
from models.crop_model import CropModel, RECOMMENDED_CROPS_CATALOG
from models.mandi_model import MandiModel
from models.price_model import PriceModel
from database.db_connection import execute_db
from config import Config

class DataFetcherService:
    """Service to ingest or simulate live Mandi prices from Agmarknet / e-NAM."""

    @staticmethod
    def _clean_keyword(raw_name):
        """Extracts primary English search keyword from bilingual names (e.g. 'Cotton (कपास / कापूस)' -> 'Cotton')."""
        if not raw_name:
            return ""
        return raw_name.split("(")[0].strip()

    @staticmethod
    def _get_baseline_price(crop_name):
        """Looks up realistic benchmark baseline price from recommended catalog if available."""
        if not crop_name:
            return 5000.0
        clean_input = re.sub(r"\(.*?\)", "", crop_name).lower().strip()
        tokens = [t.strip() for t in clean_input.replace("/", " ").split() if len(t.strip()) > 2]
        
        for item in RECOMMENDED_CROPS_CATALOG:
            item_clean = re.sub(r"\(.*?\)", "", item["name"]).lower().strip()
            item_tokens = [t.strip() for t in item_clean.replace("/", " ").split() if len(t.strip()) > 2]
            
            # Exact match or token overlap
            if clean_input == item_clean or any(t in item_clean for t in tokens) or any(it in clean_input for it in item_tokens):
                return float(item.get("default_price", 5000.0))
                
        return 5000.0

    @staticmethod
    def fetch_commodity_prices_batch(crop_name):
        """
        Fetches live Agmarknet records for a commodity in a single fast API call.
        Returns dict: {cleaned_market_name_lower: modal_price}
        """
        market_prices = {}
        if not Config.AGMARKNET_API_KEY:
            return market_prices
            
        commodity_kw = DataFetcherService._clean_keyword(crop_name)
        if not commodity_kw:
            return market_prices

        api_url = f"https://api.data.gov.in/resource/{Config.AGMARKNET_RESOURCE_ID}"
        params = {
            "api-key": Config.AGMARKNET_API_KEY,
            "format": Config.AGMARKNET_FORMAT, # 'xml'
            "offset": 0,
            "limit": 50,
            "filters[commodity]": commodity_kw
        }

        try:
            headers = {"User-Agent": "KrishiMitra/1.0"}
            response = requests.get(api_url, params=params, headers=headers, timeout=2.5)
            if response.status_code == 200 and response.content:
                root = ET.fromstring(response.content)
                records = root.findall(".//record") or root.findall(".//item")
                for rec in records:
                    market_elem = rec.find("market") or rec.find("Market")
                    m_name = (market_elem.text if market_elem is not None and market_elem.text else "").strip().lower()
                    
                    price = None
                    modal_price_elem = rec.find("modal_price") or rec.find("Modal_Price") or rec.find("modal_Price")
                    if modal_price_elem is not None and modal_price_elem.text:
                        try:
                            price = float(modal_price_elem.text.strip())
                        except ValueError:
                            pass
                    if price is None:
                        max_price_elem = rec.find("max_price") or rec.find("Max_Price")
                        if max_price_elem is not None and max_price_elem.text:
                            try:
                                price = float(max_price_elem.text.strip())
                            except ValueError:
                                pass
                    if m_name and price:
                        market_prices[m_name] = price
        except Exception:
            pass

        return market_prices

    @staticmethod
    def fetch_and_update_prices(crop_id=None):
        """
        Refreshes mandi prices from Agmarknet or realistic market feed and stores in the database.
        Works for existing and newly added crops.
        """
        crops = [CropModel.get_by_id(crop_id)] if crop_id else CropModel.get_all()
        mandis = MandiModel.get_all()
        updated_records = []
        today_date = datetime.date.today().isoformat()

        for crop in crops:
            if not crop:
                continue

            # 1. Fetch live commodity batch prices from Agmarknet
            live_batch = DataFetcherService.fetch_commodity_prices_batch(crop["name"])

            for mandi in mandis:
                current = PriceModel.get_price(crop["id"], mandi["id"])
                mandi_clean = DataFetcherService._clean_keyword(mandi["name"]).lower()
                
                # Check if this mandi appears in the live Agmarknet batch
                external_price = None
                for live_market, live_p in live_batch.items():
                    if mandi_clean in live_market or live_market in mandi_clean:
                        external_price = live_p
                        break
                
                if external_price is not None:
                    new_price = round(external_price, 2)
                elif current and current.get("price_per_quintal") is not None:
                    # Retain verified existing baseline price
                    new_price = round(float(current["price_per_quintal"]), 2)
                else:
                    # Do not generate random numbers for unavailable data
                    new_price = None

                if new_price is not None and new_price > 0:
                    PriceModel.upsert_price(crop["id"], mandi["id"], new_price)

                    # Append to history table
                    hist_query = """
                    INSERT INTO price_history (crop_id, mandi_id, price_per_quintal, recorded_date)
                    VALUES (?, ?, ?, ?);
                    """
                    try:
                        execute_db(hist_query, (crop["id"], mandi["id"], new_price, today_date))
                    except Exception:
                        pass

                    updated_records.append({
                        "crop_id": crop["id"],
                        "crop_name": crop["name"],
                        "mandi_id": mandi["id"],
                        "mandi_name": mandi["name"],
                        "price_per_quintal": new_price
                    })

        return {
            "status": "success",
            "source": "Agmarknet Live Feed / Market Dynamics",
            "updated_count": len(updated_records),
            "timestamp": datetime.datetime.now().isoformat(),
            "records": updated_records
        }

if __name__ == "__main__":
    res = DataFetcherService.fetch_and_update_prices()
    print(f"Data Fetcher executed: {res['updated_count']} prices updated.")
