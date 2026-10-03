"""
File: crop_model.py
Purpose: Data access and management methods for agricultural crop entities,
         including a curated catalog of Indian crops for intelligent autocomplete recommendations.
Inputs:  Crop IDs, crop names, or search queries
Outputs: Crop dictionaries containing id and name, and crop recommendation objects
Usage:   from models.crop_model import CropModel
         crops = CropModel.get_all()
         recs = CropModel.get_recommendations("maize")
"""

import re
from database.db_connection import query_db, execute_db

RECOMMENDED_CROPS_CATALOG = [
    {
        "name": "Maize / Corn (मक्का / मका)",
        "category": "Cereals",
        "default_price": 2250.0,
        "aliases": ["maize", "maze", "makka", "maka", "corn", "bhutta", "makai", "makkai"]
    },
    {
        "name": "Cotton (कपास / कापूस)",
        "category": "Cash Crops",
        "default_price": 7200.0,
        "aliases": ["cotton", "kapas", "kapaas", "kapus", "rooi", "rui"]
    },
    {
        "name": "Soybean (सोयाबीन)",
        "category": "Oilseeds",
        "default_price": 4600.0,
        "aliases": ["soybean", "soyabean", "soya", "soya bean"]
    },
    {
        "name": "Wheat (गेहूं / गहू)",
        "category": "Cereals",
        "default_price": 2450.0,
        "aliases": ["wheat", "gehu", "gehun", "gahu", "gehoon", "kanak"]
    },
    {
        "name": "Tur / Arhar (तूर / अरहर)",
        "category": "Pulses",
        "default_price": 10200.0,
        "aliases": ["tur", "arhar", "toor", "red gram", "pigeon pea", "tuver", "arhar dal"]
    },
    {
        "name": "Gram / Chana (चना / हरभरा)",
        "category": "Pulses",
        "default_price": 5900.0,
        "aliases": ["chana", "gram", "channa", "chickpea", "harbhara", "harbara", "bengal gram"]
    },
    {
        "name": "Onion (प्याज / कांदा)",
        "category": "Vegetables",
        "default_price": 1800.0,
        "aliases": ["onion", "pyaz", "pyaaz", "kanda", "kaanda", "dungri", "pyaj"]
    },
    {
        "name": "Groundnut / Peanut (मूंगफली / भुईमूग)",
        "category": "Oilseeds",
        "default_price": 6300.0,
        "aliases": ["groundnut", "peanut", "mungfali", "moongfali", "bhuimug", "bhuyimug", "singdana", "shengdana"]
    },
    {
        "name": "Jowar / Sorghum (ज्वार / ज्वारी)",
        "category": "Millets",
        "default_price": 3150.0,
        "aliases": ["jowar", "sorghum", "jwari", "jowari", "jondhala", "juar"]
    },
    {
        "name": "Bajra / Pearl Millet (बाजरा / बाजरी)",
        "category": "Millets",
        "default_price": 2400.0,
        "aliases": ["bajra", "pearl millet", "bajri", "sajje"]
    },
    {
        "name": "Paddy / Rice (धान / भात / तांदूळ)",
        "category": "Cereals",
        "default_price": 2200.0,
        "aliases": ["paddy", "rice", "dhan", "chawal", "bhaat", "bhat", "tandool", "tandul"]
    },
    {
        "name": "Green Gram / Moong (मूंग / मूग)",
        "category": "Pulses",
        "default_price": 8500.0,
        "aliases": ["moong", "green gram", "mung", "mug", "moog", "moong dal", "mung dal"]
    },
    {
        "name": "Black Gram / Urad (उड़द / उडीद)",
        "category": "Pulses",
        "default_price": 7400.0,
        "aliases": ["urad", "black gram", "udid", "udad", "urad dal", "mash"]
    },
    {
        "name": "Sunflower (सूरजमुखी / सूर्यफूल)",
        "category": "Oilseeds",
        "default_price": 6700.0,
        "aliases": ["sunflower", "surajmukhi", "suryaphul", "suryaphool", "suraj mukhi"]
    },
    {
        "name": "Sesame / Til (तिल / तीळ)",
        "category": "Oilseeds",
        "default_price": 14500.0,
        "aliases": ["til", "sesame", "teel", "gingelly", "tila"]
    },
    {
        "name": "Mustard (सरसों / मोहरी)",
        "category": "Oilseeds",
        "default_price": 5650.0,
        "aliases": ["mustard", "sarson", "sarso", "mohari", "rai", "sarson ka tel"]
    },
    {
        "name": "Sugarcane (गन्ना / ऊस)",
        "category": "Cash Crops",
        "default_price": 315.0,
        "aliases": ["sugarcane", "ganna", "us", "oos", "ikhu"]
    },
    {
        "name": "Turmeric (हल्दी / हळद)",
        "category": "Spices",
        "default_price": 13800.0,
        "aliases": ["turmeric", "haldi", "halad", "hardar"]
    },
    {
        "name": "Ginger (अदरक / आले)",
        "category": "Spices",
        "default_price": 7200.0,
        "aliases": ["ginger", "adrak", "ale", "aadrak", "aale"]
    },
    {
        "name": "Chilli / Mirchi (लाल मिर्च / मिरची)",
        "category": "Spices",
        "default_price": 18500.0,
        "aliases": ["chilli", "chili", "mirchi", "mirch", "lal mirch", "tamda", "laal mirch"]
    },
    {
        "name": "Garlic (लहसुन / लसूण)",
        "category": "Spices",
        "default_price": 12000.0,
        "aliases": ["garlic", "lasun", "lahsun", "lehsun", "lahsoon"]
    },
    {
        "name": "Potato (आलू / बटाटा)",
        "category": "Vegetables",
        "default_price": 1600.0,
        "aliases": ["potato", "aloo", "alu", "batata", "aalu"]
    },
    {
        "name": "Tomato (टमाटर / टोमॅटो)",
        "category": "Vegetables",
        "default_price": 1800.0,
        "aliases": ["tomato", "tamatar", "tamater", "tometo"]
    },
    {
        "name": "Pomegranate (अनार / डाळिंब)",
        "category": "Fruits",
        "default_price": 9500.0,
        "aliases": ["pomegranate", "anar", "dalimb", "anaar", "dalimba"]
    },
    {
        "name": "Orange / Santra (संतरा / संत्री)",
        "category": "Fruits",
        "default_price": 4500.0,
        "aliases": ["orange", "santra", "santri", "nagpur santra", "mosambi", "narangi"]
    },
    {
        "name": "Banana (केला / केळी)",
        "category": "Fruits",
        "default_price": 2100.0,
        "aliases": ["banana", "kela", "keli", "kele"]
    },
    {
        "name": "Grapes (अंगूर / द्राक्षे)",
        "category": "Fruits",
        "default_price": 6800.0,
        "aliases": ["grapes", "angur", "angoor", "draksh", "draksha"]
    },
    {
        "name": "Coriander / Dhaniya (धनिया / कोथिंबीर)",
        "category": "Spices",
        "default_price": 7500.0,
        "aliases": ["coriander", "dhaniya", "dhania", "kothimbir", "kothmir"]
    },
    {
        "name": "Cumin / Jeera (जीरा / जिरे)",
        "category": "Spices",
        "default_price": 28000.0,
        "aliases": ["cumin", "jeera", "zira", "jire", "jira"]
    }
]

class CropModel:
    """Crop Data Access Model"""

    @staticmethod
    def get_all():
        """Retrieve all available crops."""
        query = "SELECT id, name FROM crops ORDER BY id ASC;"
        return query_db(query)

    @staticmethod
    def get_by_id(crop_id):
        """Retrieve a specific crop by ID."""
        query = "SELECT id, name FROM crops WHERE id = ?;"
        return query_db(query, (crop_id,), one=True)

    @staticmethod
    def create(name):
        """Create a new crop."""
        query = "INSERT INTO crops (name) VALUES (?);"
        return execute_db(query, (name,))

    @staticmethod
    def update(crop_id, name):
        """Update a crop's name."""
        query = "UPDATE crops SET name = ? WHERE id = ?;"
        return execute_db(query, (name, crop_id))

    @staticmethod
    def delete(crop_id):
        """Delete a crop by ID."""
        query = "DELETE FROM crops WHERE id = ?;"
        return execute_db(query, (crop_id,))

    @staticmethod
    def get_recommendations(query=""):
        """
        Returns intelligent crop suggestions matching the query.
        Supports English names, Hindi/Marathi names, and phonetic/transliterated words (e.g. 'makka', 'kapas', 'gehu').
        Filters out already added crops to prevent duplication.
        """
        existing_crops = CropModel.get_all()
        existing_names = set()
        for c in existing_crops:
            clean = re.sub(r"\(.*?\)", "", c["name"]).split("/")[0].strip().lower()
            existing_names.add(clean)
            existing_names.add(c["name"].lower())

        q = (query or "").strip().lower()
        matches = []

        for item in RECOMMENDED_CROPS_CATALOG:
            item_clean = re.sub(r"\(.*?\)", "", item["name"]).split("/")[0].strip().lower()
            if item_clean in existing_names or item["name"].lower() in existing_names:
                continue

            if not q:
                matches.append(item)
            else:
                # Direct match in display name or category
                matched = q in item["name"].lower() or q in item["category"].lower() or q in item_clean
                
                # Check transliterated/phonetic aliases (e.g. 'makka', 'maze', 'kapas', 'gehu')
                if not matched and "aliases" in item:
                    for alias in item["aliases"]:
                        if q in alias or alias in q or alias.startswith(q):
                            matched = True
                            break
                
                if matched:
                    matches.append(item)

            if len(matches) >= 12:
                break

        return matches
