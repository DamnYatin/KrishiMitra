"""
File: maps_distance_service.py
Purpose: Resolves distance in kilometers between origin (home mandi/village) and candidate mandis.
         Pulls from stored distances table, falls back to Haversine GPS calculation, and includes
         a pluggable seam for Google Maps Distance Matrix API and Geocoding.
Inputs:  from_mandi_id (int), to_mandi_id (int), optional api_key (str)
Outputs: distance_km (float), source (str: 'database' | 'haversine' | 'google_maps')
Usage:   from services.maps_distance_service import get_distance_km, geocode_place_name, auto_link_mandi_distances
         dist, source = get_distance_km(from_mandi_id=1, to_mandi_id=2)
"""

import math
import re
import requests
from models.distance_model import DistanceModel
from models.mandi_model import MandiModel
from models.crop_model import CropModel
from models.price_model import PriceModel
from models.cost_model import CostModel
from config import Config

# Curated database of standard Maharashtra & regional APMC mandi coordinates for instant accurate fallback
KNOWN_MANDI_COORDINATES = {
    "nagpur": (21.1458, 79.0882),
    "amravati": (20.9374, 77.7796),
    "pune": (18.5204, 73.8567),
    "akola": (20.7002, 77.0082),
    "nashik": (19.9975, 73.7898),
    "wardha": (20.7453, 78.6022),
    "yavatmal": (20.3888, 78.1204),
    "chandrapur": (19.9615, 79.2961),
    "jalgaon": (21.0077, 75.5626),
    "nanded": (19.1383, 77.3210),
    "aurangabad": (19.8762, 75.3433),
    "chhatrapati sambhajinagar": (19.8762, 75.3433),
    "sambhajinagar": (19.8762, 75.3433),
    "latur": (18.4088, 76.5604),
    "solapur": (17.6599, 75.9064),
    "kolhapur": (16.7050, 74.2433),
    "sangli": (16.8524, 74.5815),
    "satara": (17.6805, 74.0183),
    "beed": (18.9891, 75.7601),
    "buldhana": (20.5293, 76.1843),
    "washim": (20.1110, 77.1340),
    "gondia": (21.4556, 80.1961),
    "bhandara": (21.1714, 79.6548),
    "gadchiroli": (20.1809, 79.9982),
    "hingoli": (19.7196, 77.1472),
    "jalna": (19.8347, 75.8816),
    "dharashiv": (18.1856, 76.0423),
    "osmanabad": (18.1856, 76.0423),
    "parbhani": (19.2612, 76.7766),
    "ratnagiri": (16.9902, 73.3120),
    "sindhudurg": (16.0274, 73.6871),
    "ahmednagar": (19.0948, 74.7480),
    "ahilyanagar": (19.0948, 74.7480),
    "dhule": (20.9042, 74.7749),
    "nandurbar": (21.3694, 74.2384),
    "thane": (19.2183, 72.9781),
    "palghar": (19.6966, 72.7655),
    "raigad": (18.5158, 73.1812),
    "mumbai": (19.0760, 72.8777),
    "baramati": (18.1517, 74.5770),
    "shrirampur": (19.6192, 74.6558),
    "kopargaon": (19.8860, 74.4789),
    "sangamner": (19.5764, 74.2152),
    "malegaon": (20.5539, 74.5269),
    "lasalgaon": (20.1475, 74.2281),
    "yeola": (20.0436, 74.4878),
    "pimpalgaon": (20.1697, 73.9877),
    "karad": (17.2890, 74.1818),
    "phaltan": (17.9868, 74.4332),
    "pandharpur": (17.6775, 75.3276),
    "akkalkot": (17.5254, 76.2045),
    "indapur": (18.1167, 75.0333),
    "daund": (18.4632, 74.5828),
    "manchar": (19.0016, 73.9427),
    "junnar": (19.2083, 73.8767),
    "khamgaon": (20.6908, 76.5684),
    "malkapur": (20.8845, 76.2017),
    "shegaon": (20.7932, 76.6946),
    "chikhli": (20.3524, 76.2570),
    "mehkar": (20.1554, 76.5744),
    "karanja": (20.4839, 77.4872),
    "risod": (19.9723, 76.7828),
    "murtizapur": (20.7328, 77.3683),
    "balapur": (20.6657, 76.7725),
    "akot": (21.0967, 77.0583),
    "achlapur": (21.2586, 77.5098),
    "paratwada": (21.2952, 77.5273),
    "morshi": (21.3195, 78.0125),
    "warud": (21.4642, 78.2678),
    "chandur": (20.7819, 77.9792),
    "dhamangaon": (20.7769, 78.1364),
    "arvi": (20.9856, 78.2324),
    "hinganghat": (20.5506, 78.8353),
    "samudrapur": (20.6019, 78.9669),
    "deoli": (20.6558, 78.4842),
    "seloo": (20.8358, 78.7061),
    "pusad": (19.9075, 77.5744),
    "digras": (20.1118, 77.7247),
    "darwha": (20.3150, 77.7686),
    "wani": (20.0631, 78.9519),
    "umred": (20.8528, 79.3275),
    "katol": (21.2644, 78.5878),
    "kalmeshwar": (21.2333, 78.9167),
    "saoner": (21.3850, 78.9167),
    "narkhed": (21.3700, 78.5300),
    "ramtek": (21.3967, 79.3333),
    "mouda": (21.1667, 79.4000),
    "kamptee": (21.2228, 79.1983),
    "tumsar": (21.3833, 79.7333),
    "pauni": (20.7917, 79.6333),
    "sakoli": (21.0833, 79.9833),
    "tirora": (21.4167, 79.9333),
    "amgaon": (21.3667, 80.3833),
    "ballarpur": (19.8500, 79.3500),
    "warora": (20.2333, 79.0000),
    "bhadravati": (20.1000, 79.1167),
    "rajura": (19.7833, 79.3667),
    "chimur": (20.4833, 79.3667),
    "nagbhid": (20.5833, 79.6667),
    "brahmapuri": (20.6000, 79.8667),
    "sindewahi": (20.2833, 79.6500)
}

def clean_place_name(raw_name):
    """Extracts base city name from user-entered strings (e.g., 'Wardha (वर्धा)' -> 'Wardha')."""
    if not raw_name:
        return ""
    # Remove parentheses and slashes
    clean = re.sub(r"\(.*?\)", "", raw_name)
    clean = clean.split("/")[0].strip()
    return clean

def geocode_place_name(place_name):
    """
    Resolves Latitude and Longitude for a given mandi or place name:
    1. Checks built-in Maharashtra/India coordinate database.
    2. Queries Google Maps Geocoding API if key is present.
    3. Queries OpenStreetMap Nominatim Geocoder as live fallback.
    4. Falls back to Maharashtra centroid (20.0, 78.0).
    """
    clean = clean_place_name(place_name)
    clean_lower = clean.lower()

    # 1. Check known lookup dictionary
    for k, coords in KNOWN_MANDI_COORDINATES.items():
        if k in clean_lower or clean_lower in k:
            return coords[0], coords[1], "known_database"

    # 2. Google Maps Geocoding API
    if Config.GOOGLE_MAPS_API_KEY:
        try:
            url = "https://maps.googleapis.com/maps/api/geocode/json"
            params = {
                "address": f"{clean}, Maharashtra, India",
                "key": Config.GOOGLE_MAPS_API_KEY
            }
            res = requests.get(url, params=params, timeout=5)
            if res.status_code == 200:
                data = res.json()
                if data.get("status") == "OK" and data.get("results"):
                    loc = data["results"][0]["geometry"]["location"]
                    return round(loc["lat"], 4), round(loc["lng"], 4), "google_geocoding"
        except Exception:
            pass

    # 3. OpenStreetMap Nominatim Fallback
    try:
        osm_url = "https://nominatim.openstreetmap.org/search"
        headers = {"User-Agent": "KrishiMitra-Geocoding/1.0"}
        params = {
            "q": f"{clean}, Maharashtra, India",
            "format": "json",
            "limit": 1
        }
        res = requests.get(osm_url, params=params, headers=headers, timeout=4)
        if res.status_code == 200:
            results = res.json()
            if results and len(results) > 0:
                lat = float(results[0]["lat"])
                lon = float(results[0]["lon"])
                return round(lat, 4), round(lon, 4), "osm_nominatim"
    except Exception:
        pass

    # 4. Default fallback approximate coordinate in Vidarbha/Maharashtra region
    return 20.7500, 78.6000, "default_centroid"

def haversine_distance(lat1, lon1, lat2, lon2):
    """
    Computes approximate road distance in km between two lat/lng coordinates
    using the Haversine formula multiplied by a road winding factor of 1.25.
    """
    R = 6371.0  # Earth radius in kilometers

    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (math.sin(d_lat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(d_lon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    crow_flies_km = R * c
    
    # Road winding factor typically 1.2 - 1.3 for Indian highway networks
    road_km = crow_flies_km * 1.25
    return round(road_km, 1)

def get_distance_km(from_mandi_id, to_mandi_id):
    """
    Retrieves or calculates distance between two mandis using Google Maps Distance Matrix API,
    falling back to local database or Haversine GPS calculations.
    """
    if from_mandi_id == to_mandi_id:
        return 0.0, "same_location"

    from_mandi = MandiModel.get_by_id(from_mandi_id)
    to_mandi = MandiModel.get_by_id(to_mandi_id)

    # 1. Check Google Maps Distance Matrix API if key is available
    if Config.GOOGLE_MAPS_API_KEY and from_mandi and to_mandi:
        lat1, lon1 = from_mandi.get("latitude"), from_mandi.get("longitude")
        lat2, lon2 = to_mandi.get("latitude"), to_mandi.get("longitude")
        if lat1 is not None and lon1 is not None and lat2 is not None and lon2 is not None:
            try:
                maps_url = "https://maps.googleapis.com/maps/api/distancematrix/json"
                params = {
                    "origins": f"{lat1},{lon1}",
                    "destinations": f"{lat2},{lon2}",
                    "mode": "driving",
                    "key": Config.GOOGLE_MAPS_API_KEY
                }
                res = requests.get(maps_url, params=params, timeout=5)
                if res.status_code == 200:
                    data = res.json()
                    if data.get("status") == "OK" and data.get("rows"):
                        elem = data["rows"][0]["elements"][0]
                        if elem.get("status") == "OK" and "distance" in elem:
                            dist_km = round(elem["distance"]["value"] / 1000.0, 1)
                            DistanceModel.set_distance(from_mandi_id, to_mandi_id, dist_km)
                            return dist_km, "google_maps"
            except Exception:
                pass

    # 2. Check stored distance table
    stored_dist = DistanceModel.get_distance(from_mandi_id, to_mandi_id)
    if stored_dist is not None:
        return float(stored_dist), "database"

    # 3. Fallback to Haversine GPS calculation from coordinates
    if from_mandi and to_mandi:
        lat1, lon1 = from_mandi.get("latitude"), from_mandi.get("longitude")
        lat2, lon2 = to_mandi.get("latitude"), to_mandi.get("longitude")
        if lat1 is not None and lon1 is not None and lat2 is not None and lon2 is not None:
            calc_dist = haversine_distance(lat1, lon1, lat2, lon2)
            DistanceModel.set_distance(from_mandi_id, to_mandi_id, calc_dist)
            return calc_dist, "haversine"

    return 100.0, "default_fallback"

def auto_link_mandi_distances(new_mandi_id):
    """
    Automatically links a newly created Mandi with all existing mandis (especially Nagpur)
    in the distances table, sets default other_costs, and seeds prices for all crops.
    """
    new_mandi = MandiModel.get_by_id(new_mandi_id)
    if not new_mandi:
        return []

    all_mandis = MandiModel.get_all()
    created_distances = []

    for mandi in all_mandis:
        if mandi["id"] == new_mandi_id:
            continue
        
        # Calculate distance between existing mandi and new mandi
        dist_km, source = get_distance_km(mandi["id"], new_mandi_id)
        DistanceModel.set_distance(mandi["id"], new_mandi_id, dist_km)
        created_distances.append({
            "from_mandi_id": mandi["id"],
            "from_mandi_name": mandi["name"],
            "to_mandi_id": new_mandi_id,
            "to_mandi_name": new_mandi["name"],
            "distance_km": dist_km,
            "source": source
        })

    # Initialize default other costs (loading=0, unloading=0, cess=0)
    CostModel.upsert_other_costs(new_mandi_id, 0.0, 0.0, 0.0)

    # Initialize starter price for all crops
    crops = CropModel.get_all()
    for crop in crops:
        existing = PriceModel.get_price(crop["id"], new_mandi_id)
        if not existing:
            # Starter baseline price
            PriceModel.upsert_price(crop["id"], new_mandi_id, 7000.0)

    return created_distances

RECOMMENDED_MANDIS_CATALOG = [
    {"name": "Wardha (वर्धा)", "district": "Wardha", "lat": 20.7453, "lng": 78.6022},
    {"name": "Yavatmal (यवतमाळ)", "district": "Yavatmal", "lat": 20.3888, "lng": 78.1204},
    {"name": "Chandrapur (चंद्रपूर)", "district": "Chandrapur", "lat": 19.9615, "lng": 79.2961},
    {"name": "Jalgaon (जळगाव)", "district": "Jalgaon", "lat": 21.0077, "lng": 75.5626},
    {"name": "Nanded (नांदेड)", "district": "Nanded", "lat": 19.1383, "lng": 77.3210},
    {"name": "Chhatrapati Sambhajinagar (छत्रपती संभाजीनगर)", "district": "Aurangabad", "lat": 19.8762, "lng": 75.3433},
    {"name": "Latur (लातूर)", "district": "Latur", "lat": 18.4088, "lng": 76.5604},
    {"name": "Solapur (सोलापूर)", "district": "Solapur", "lat": 17.6599, "lng": 75.9064},
    {"name": "Kolhapur (कोल्हापूर)", "district": "Kolhapur", "lat": 16.7050, "lng": 74.2433},
    {"name": "Sangli (सांगली)", "district": "Sangli", "lat": 16.8524, "lng": 74.5815},
    {"name": "Satara (सातारा)", "district": "Satara", "lat": 17.6805, "lng": 74.0183},
    {"name": "Beed (बीड)", "district": "Beed", "lat": 18.9891, "lng": 75.7601},
    {"name": "Buldhana (बुलढाणा)", "district": "Buldhana", "lat": 20.5293, "lng": 76.1843},
    {"name": "Washim (वाशीम)", "district": "Washim", "lat": 20.1110, "lng": 77.1340},
    {"name": "Gondia (गोंदिया)", "district": "Gondia", "lat": 21.4556, "lng": 80.1961},
    {"name": "Bhandara (भंडारा)", "district": "Bhandara", "lat": 21.1714, "lng": 79.6548},
    {"name": "Gadchiroli (गडचिरोली)", "district": "Gadchiroli", "lat": 20.1809, "lng": 79.9982},
    {"name": "Hingoli (हिंगोली)", "district": "Hingoli", "lat": 19.7196, "lng": 77.1472},
    {"name": "Jalna (जालना)", "district": "Jalna", "lat": 19.8347, "lng": 75.8816},
    {"name": "Dharashiv / Osmanabad (धाराशिव)", "district": "Dharashiv", "lat": 18.1856, "lng": 76.0423},
    {"name": "Parbhani (परभणी)", "district": "Parbhani", "lat": 19.2612, "lng": 76.7766},
    {"name": "Ahilyanagar / Ahmednagar (अहिल्यानगर)", "district": "Ahilyanagar", "lat": 19.0948, "lng": 74.7480},
    {"name": "Dhule (धुळे)", "district": "Dhule", "lat": 20.9042, "lng": 74.7749},
    {"name": "Nandurbar (नंदुरबार)", "district": "Nandurbar", "lat": 21.3694, "lng": 74.2384},
    {"name": "Ratnagiri (रत्नागिरी)", "district": "Ratnagiri", "lat": 16.9902, "lng": 73.3120},
    {"name": "Sindhudurg (सिंधुदुर्ग)", "district": "Sindhudurg", "lat": 16.0274, "lng": 73.6871},
    {"name": "Baramati (बारामती)", "district": "Pune", "lat": 18.1517, "lng": 74.5770},
    {"name": "Lasalgaon (लासलगाव)", "district": "Nashik", "lat": 20.1475, "lng": 74.2281},
    {"name": "Yeola (येवला)", "district": "Nashik", "lat": 20.0436, "lng": 74.4878},
    {"name": "Malegaon (मालेगाव)", "district": "Nashik", "lat": 20.5539, "lng": 74.5269},
    {"name": "Khamgaon (खामगाव)", "district": "Buldhana", "lat": 20.6908, "lng": 76.5684},
    {"name": "Shegaon (शेगाव)", "district": "Buldhana", "lat": 20.7932, "lng": 76.6946},
    {"name": "Hinganghat (हिंगणघाट)", "district": "Wardha", "lat": 20.5506, "lng": 78.8353},
    {"name": "Katol (काटोल)", "district": "Nagpur", "lat": 21.2644, "lng": 78.5878},
    {"name": "Saoner (सावनेर)", "district": "Nagpur", "lat": 21.3850, "lng": 78.9167},
    {"name": "Umred (उमरेड)", "district": "Nagpur", "lat": 20.8528, "lng": 79.3275},
    {"name": "Warud (वरूड)", "district": "Amravati", "lat": 21.4642, "lng": 78.2678},
    {"name": "Morshi (मोर्शी)", "district": "Amravati", "lat": 21.3195, "lng": 78.0125},
    {"name": "Achalpur / Paratwada (अचलपूर / परतवाडा)", "district": "Amravati", "lat": 21.2586, "lng": 77.5098},
    {"name": "Karanja (कारंजा लाड)", "district": "Washim", "lat": 20.4839, "lng": 77.4872},
    {"name": "Pusad (पुसद)", "district": "Yavatmal", "lat": 19.9075, "lng": 77.5744},
    {"name": "Wani (वणी)", "district": "Yavatmal", "lat": 20.0631, "lng": 78.9519},
    {"name": "Warora (वरोरा)", "district": "Chandrapur", "lat": 20.2333, "lng": 79.0000},
    {"name": "Ballarpur (बल्लारपूर)", "district": "Chandrapur", "lat": 19.8500, "lng": 79.3500},
    {"name": "Tumsar (तुमसर)", "district": "Bhandara", "lat": 21.3833, "lng": 79.7333},
    {"name": "Tirora (तिरोडा)", "district": "Gondia", "lat": 21.4167, "lng": 79.9333},
    {"name": "Brahmapuri (ब्रह्मपुरी)", "district": "Chandrapur", "lat": 20.6000, "lng": 79.8667},
    {"name": "Pandharpur (पंढरपूर)", "district": "Solapur", "lat": 17.6775, "lng": 75.3276},
    {"name": "Karad (कराड)", "district": "Satara", "lat": 17.2890, "lng": 74.1818},
    {"name": "Phaltan (फलटण)", "district": "Satara", "lat": 17.9868, "lng": 74.4332}
]

def get_location_recommendations(query=""):
    """
    Returns recommended mandi suggestions matching the query.
    Filters out already registered mandis to prevent duplicates.
    """
    existing_mandis = MandiModel.get_all()
    existing_names = set(clean_place_name(m["name"]).lower() for m in existing_mandis)

    q = (query or "").strip().lower()
    matches = []

    for item in RECOMMENDED_MANDIS_CATALOG:
        item_clean = clean_place_name(item["name"]).lower()
        if item_clean in existing_names:
            continue

        if not q or q in item["name"].lower() or q in item["district"].lower() or q in item_clean:
            matches.append(item)
            if len(matches) >= 12:
                break

    # If query is typed and fewer than 3 catalog matches, query live geocoder for additional suggestions
    if q and len(matches) < 4:
        try:
            osm_url = "https://nominatim.openstreetmap.org/search"
            headers = {"User-Agent": "KrishiMitra-Suggestions/1.0"}
            params = {
                "q": f"{q}, Maharashtra, India",
                "format": "json",
                "limit": 4
            }
            res = requests.get(osm_url, params=params, headers=headers, timeout=2.5)
            if res.status_code == 200:
                for r in res.json():
                    d_name = r.get("display_name", "")
                    place_first = d_name.split(",")[0].strip()
                    if place_first.lower() not in existing_names and not any(place_first.lower() in m["name"].lower() for m in matches):
                        matches.append({
                            "name": f"{place_first}",
                            "district": "Maharashtra",
                            "lat": round(float(r["lat"]), 4),
                            "lng": round(float(r["lon"]), 4)
                        })
        except Exception:
            pass

    return matches

if __name__ == "__main__":
    lat, lng, src = geocode_place_name("Wardha (वर्धा)")
    print(f"Geocoded Wardha: {lat}, {lng} (Source: {src})")
    recs = get_location_recommendations("yav")
    print(f"Recommendations for 'yav': {recs}")
