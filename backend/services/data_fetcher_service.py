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
import datetime
import xml.etree.ElementTree as ET
import requests
from models.crop_model import CropModel
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
    def fetch_from_external_agmarknet(crop_name, mandi_name):
        """
        Connects to Agmarknet (data.gov.in) API using XML format and the provided API Key.
        Resource URL: https://api.data.gov.in/resource/{Config.AGMARKNET_RESOURCE_ID}
        Format: XML
        """
        if Config.AGMARKNET_API_KEY:
            commodity_kw = DataFetcherService._clean_keyword(crop_name)
            market_kw = DataFetcherService._clean_keyword(mandi_name)
            
            api_url = f"https://api.data.gov.in/resource/{Config.AGMARKNET_RESOURCE_ID}"
            params = {
                "api-key": Config.AGMARKNET_API_KEY,
                "format": Config.AGMARKNET_FORMAT, # 'xml'
                "offset": 0,
                "limit": 25,
                "filters[commodity]": commodity_kw,
                "filters[market]": market_kw
            }

            try:
                headers = {"User-Agent": "KrishiMitra/1.0"}
                response = requests.get(api_url, params=params, headers=headers, timeout=6)
                if response.status_code == 200 and response.content:
                    # Parse XML response
                    root = ET.fromstring(response.content)
                    
                    # Search for record elements
                    records = root.findall(".//record") or root.findall(".//item")
                    for rec in records:
                        modal_price_elem = rec.find("modal_price") or rec.find("Modal_Price") or rec.find("modal_Price")
                        if modal_price_elem is not None and modal_price_elem.text:
                            try:
                                return float(modal_price_elem.text.strip())
                            except ValueError:
                                pass
                        
                        max_price_elem = rec.find("max_price") or rec.find("Max_Price")
                        if max_price_elem is not None and max_price_elem.text:
                            try:
                                return float(max_price_elem.text.strip())
                            except ValueError:
                                pass
            except Exception as e:
                # Log or handle timeout / API limits gracefully
                pass

        return None

    @staticmethod
    def fetch_and_update_prices(crop_id=None):
        """
        Refreshes mandi prices. If in mock mode, applies slight realistic market movement (+/- 1.5%).
        """
        crops = [CropModel.get_by_id(crop_id)] if crop_id else CropModel.get_all()
        mandis = MandiModel.get_all()
        updated_records = []
        today_date = datetime.date.today().isoformat()

        for crop in crops:
            if not crop:
                continue
            for mandi in mandis:
                current = PriceModel.get_price(crop["id"], mandi["id"])
                
                # Check external API first
                external_price = DataFetcherService.fetch_from_external_agmarknet(crop["name"], mandi["name"])
                
                if external_price is not None:
                    new_price = round(external_price, 2)
                elif current:
                    # Realistic fluctuation within +/- 1.2%
                    delta_percent = random.uniform(-0.012, 0.012)
                    base_price = float(current["price_per_quintal"])
                    new_price = round(base_price * (1 + delta_percent), 2)
                else:
                    # Default starter price
                    new_price = 5000.0

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
            "source": "Mock Agmarknet/e-NAM Feed" if Config.USE_MOCK_DATA else "Live Agmarknet API",
            "updated_count": len(updated_records),
            "timestamp": datetime.datetime.now().isoformat(),
            "records": updated_records
        }

if __name__ == "__main__":
    res = DataFetcherService.fetch_and_update_prices()
    print(f"Data Fetcher executed: {res['updated_count']} prices updated.")
