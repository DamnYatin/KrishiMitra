"""
File: seed_data.py
Purpose: Seeds initial realistic agricultural market data into SQLite database,
         for Maharashtra Mandis (Nagpur, Amravati,
         Pune, Akola, Nashik) and crops (Cotton, Soybean, Wheat, Onion, Tur, Gram).
Inputs:  db_path (optional str, defaults to Config.DB_PATH)
Outputs: Populated SQLite tables with crops, mandis, rates, distances, costs, and historical prices
Usage:   from database.seed_data import seed_db
         seed_db()
"""

import datetime
from database.db_connection import get_db_connection
from database.db_init import init_db

def seed_db(db_path=None, force_reseed=False):
    """Populates database with initial realistic sample data."""
    init_db(db_path)

    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()

        if force_reseed:
            cursor.execute("DELETE FROM deal_inquiries")
            cursor.execute("DELETE FROM deals")
            cursor.execute("DELETE FROM price_history")
            cursor.execute("DELETE FROM prices")
            cursor.execute("DELETE FROM distances")
            cursor.execute("DELETE FROM other_costs")
            cursor.execute("DELETE FROM transport_rates")
            cursor.execute("DELETE FROM mandis")
            cursor.execute("DELETE FROM crops")

        # 1. Seed Core Market Data if not already present
        cursor.execute("SELECT COUNT(*) as cnt FROM crops")
        if cursor.fetchone()["cnt"] == 0:
            crops = [
                ("Cotton (कपास / कापूस)",),
                ("Soybean (सोयाबीन)",),
                ("Wheat (गेहूं / गहू)",),
                ("Onion (प्याज / कांदा)",),
                ("Tur / Arhar (तूर / अरहर)",),
                ("Gram / Chana (चना / हरभरा)",)
            ]
            cursor.executemany("INSERT INTO crops (name) VALUES (?)", crops)

            mandis = [
                ("Nagpur (नागपूर)", 21.1458, 79.0882),
                ("Amravati (अमरावती)", 20.9374, 77.7796),
                ("Pune (पुणे)", 18.5204, 73.8567),
                ("Akola (अकोला)", 20.7002, 77.0082),
                ("Nashik (नाशिक)", 19.9975, 73.7898)
            ]
            cursor.executemany("INSERT INTO mandis (name, latitude, longitude) VALUES (?, ?, ?)", mandis)

            # Retrieve IDs
            cursor.execute("SELECT id, name FROM crops")
            crop_map = {row["name"]: row["id"] for row in cursor.fetchall()}

            cursor.execute("SELECT id, name FROM mandis")
            mandi_map = {row["name"].split(" ")[0]: row["id"] for row in cursor.fetchall()}

            # Transport Rates (₹/km/quintal)
            cursor.execute("INSERT INTO transport_rates (rate_per_km_per_quintal) VALUES (?)", (0.80,))

            # Other Costs (Loading + Unloading + Market Charges per quintal)
            other_costs_data = [
                (mandi_map["Amravati"], 0.0, 0.0, 0.0),    # Total = 0
                (mandi_map["Nagpur"], 40.0, 36.0, 40.0),    # Total = 116
                (mandi_map["Pune"], 0.0, 0.0, 0.0),        # Total = 0
                (mandi_map["Akola"], 0.0, 0.0, 0.0),       # Total = 0
                (mandi_map["Nashik"], 40.0, 30.0, 30.0),   # Total = 100
            ]
            cursor.executemany(
                "INSERT INTO other_costs (mandi_id, loading, unloading, market_charge) VALUES (?, ?, ?, ?)",
                other_costs_data
            )

            # Distances between Mandis (Bidirectional)
            distance_pairs = [
                ("Nagpur", "Nagpur", 0.0),
                ("Nagpur", "Amravati", 145.0),
                ("Nagpur", "Pune", 600.0),
                ("Nagpur", "Akola", 312.5),
                ("Nagpur", "Nashik", 875.0),

                ("Amravati", "Amravati", 0.0),
                ("Amravati", "Nagpur", 145.0),
                ("Amravati", "Akola", 98.0),
                ("Amravati", "Pune", 560.0),
                ("Amravati", "Nashik", 540.0),

                ("Akola", "Akola", 0.0),
                ("Akola", "Nagpur", 312.5),
                ("Akola", "Amravati", 98.0),
                ("Akola", "Pune", 470.0),
                ("Akola", "Nashik", 440.0),

                ("Pune", "Pune", 0.0),
                ("Pune", "Nagpur", 600.0),
                ("Pune", "Amravati", 560.0),
                ("Pune", "Akola", 470.0),
                ("Pune", "Nashik", 210.0),

                ("Nashik", "Nashik", 0.0),
                ("Nashik", "Nagpur", 875.0),
                ("Nashik", "Amravati", 540.0),
                ("Nashik", "Akola", 440.0),
                ("Nashik", "Pune", 210.0),
            ]
            distance_records = [
                (mandi_map[src], mandi_map[dst], dist)
                for src, dst, dist in distance_pairs
            ]
            cursor.executemany(
                "INSERT INTO distances (from_mandi_id_or_village, to_mandi_id, distance_km) VALUES (?, ?, ?)",
                distance_records
            )

            # Current Mandi Prices
            cotton_id = crop_map["Cotton (कपास / कापूस)"]
            soybean_id = crop_map["Soybean (सोयाबीन)"]
            wheat_id = crop_map["Wheat (गेहूं / गहू)"]
            onion_id = crop_map["Onion (प्याज / कांदा)"]
            tur_id = crop_map["Tur / Arhar (तूर / अरहर)"]
            gram_id = crop_map["Gram / Chana (चना / हरभरा)"]

            prices_data = [
                (cotton_id, mandi_map["Amravati"], 7250.0),
                (cotton_id, mandi_map["Nagpur"], 7216.0),
                (cotton_id, mandi_map["Pune"], 7348.0),
                (cotton_id, mandi_map["Akola"], 7013.0),
                (cotton_id, mandi_map["Nashik"], 7090.0),

                (soybean_id, mandi_map["Amravati"], 4850.0),
                (soybean_id, mandi_map["Nagpur"], 4720.0),
                (soybean_id, mandi_map["Pune"], 4920.0),
                (soybean_id, mandi_map["Akola"], 4780.0),
                (soybean_id, mandi_map["Nashik"], 4650.0),

                (wheat_id, mandi_map["Amravati"], 2450.0),
                (wheat_id, mandi_map["Nagpur"], 2500.0),
                (wheat_id, mandi_map["Pune"], 2620.0),
                (wheat_id, mandi_map["Akola"], 2420.0),
                (wheat_id, mandi_map["Nashik"], 2580.0),

                (onion_id, mandi_map["Amravati"], 1850.0),
                (onion_id, mandi_map["Nagpur"], 1900.0),
                (onion_id, mandi_map["Pune"], 2200.0),
                (onion_id, mandi_map["Akola"], 1750.0),
                (onion_id, mandi_map["Nashik"], 2350.0),

                (tur_id, mandi_map["Amravati"], 9800.0),
                (tur_id, mandi_map["Nagpur"], 9650.0),
                (tur_id, mandi_map["Pune"], 9950.0),
                (tur_id, mandi_map["Akola"], 9900.0),
                (tur_id, mandi_map["Nashik"], 9500.0),

                (gram_id, mandi_map["Amravati"], 5900.0),
                (gram_id, mandi_map["Nagpur"], 5820.0),
                (gram_id, mandi_map["Pune"], 6100.0),
                (gram_id, mandi_map["Akola"], 5950.0),
                (gram_id, mandi_map["Nashik"], 5750.0),
            ]
            cursor.executemany(
                "INSERT INTO prices (crop_id, mandi_id, price_per_quintal) VALUES (?, ?, ?)",
                prices_data
            )

            # Historical Trends
            today = datetime.date.today()
            history_records = []
            for days_ago in range(7, 0, -1):
                record_date = (today - datetime.timedelta(days=days_ago)).isoformat()
                for c_id, m_id, current_p in prices_data:
                    factor = 1.0 + ((days_ago - 3) * 0.006)
                    hist_p = round(current_p * factor, 2)
                    history_records.append((c_id, m_id, hist_p, record_date))

            cursor.executemany(
                "INSERT INTO price_history (crop_id, mandi_id, price_per_quintal, recorded_date) VALUES (?, ?, ?, ?)",
                history_records
            )

            users = [
                ("Ramesh Patil (रमेश पाटील)", "9823012345", mandi_map["Nagpur"]),
                ("Suresh Deshmukh (सुरेश देशमुख)", "9823098765", mandi_map["Amravati"]),
                ("Kisan Vikas (किसान विकास)", "9421098712", mandi_map["Akola"])
            ]
            cursor.executemany(
                "INSERT INTO users (name, phone, home_mandi_id) VALUES (?, ?, ?)",
                users
            )

        # 2. Seed Direct Marketplace Demo Deals if deals table is empty
        cursor.execute("SELECT COUNT(*) as cnt FROM deals")
        if cursor.fetchone()["cnt"] == 0:
            cursor.execute("SELECT id, name FROM crops")
            crop_map = {row["name"]: row["id"] for row in cursor.fetchall()}

            cursor.execute("SELECT id, name FROM mandis")
            mandi_map = {row["name"].split(" ")[0]: row["id"] for row in cursor.fetchall()}

            cotton_id = crop_map.get("Cotton (कपास / कापूस)", 1)
            soybean_id = crop_map.get("Soybean (सोयाबीन)", 2)
            wheat_id = crop_map.get("Wheat (गेहूं / गहू)", 3)
            onion_id = crop_map.get("Onion (प्याज / कांदा)", 4)
            tur_id = crop_map.get("Tur / Arhar (तूर / अरहर)", 5)

            now = datetime.datetime.utcnow()
            t1 = (now - datetime.timedelta(minutes=15)).strftime("%Y-%m-%d %H:%M:%S")
            t2 = (now - datetime.timedelta(hours=1, minutes=20)).strftime("%Y-%m-%d %H:%M:%S")
            t3 = (now - datetime.timedelta(hours=3, minutes=45)).strftime("%Y-%m-%d %H:%M:%S")
            t4 = (now - datetime.timedelta(hours=6)).strftime("%Y-%m-%d %H:%M:%S")
            t5 = (now - datetime.timedelta(days=1)).strftime("%Y-%m-%d %H:%M:%S")

            demo_deals = [
                ("Ramesh Patil", "9823012345", wheat_id, "Wheat (गेहूं / गहू)", 8.0, 10000.0, mandi_map.get("Nashik", 5), "Nashik", "active", t1),
                ("Suresh Deshmukh", "9823098765", cotton_id, "Cotton (कपास / कापूस)", 15.0, 7300.0, mandi_map.get("Amravati", 2), "Amravati", "active", t2),
                ("Kisan Vikas", "9421098712", soybean_id, "Soybean (सोयाबीन)", 25.0, 4800.0, mandi_map.get("Akola", 4), "Akola", "active", t3),
                ("Ganesh Shinde", "9765432109", onion_id, "Onion (प्याज / कांदा)", 50.0, 1900.0, mandi_map.get("Pune", 3), "Pune", "active", t4),
                ("Babanrao More", "9890123456", tur_id, "Tur / Arhar (तूर / अरहर)", 12.0, 8200.0, mandi_map.get("Nagpur", 1), "Nagpur", "active", t5),
            ]
            cursor.executemany(
                """INSERT INTO deals (
                    farmer_name, farmer_phone, crop_id, crop_name,
                    quantity_quintal, price_per_quintal, mandi_id, location_name, status, posted_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                demo_deals
            )

            # Seed Initial Inquiries for Demonstration
            cursor.execute("SELECT id FROM deals WHERE farmer_name = 'Suresh Deshmukh' LIMIT 1;")
            amravati_deal = cursor.fetchone()
            if amravati_deal:
                deal_id = amravati_deal["id"] if isinstance(amravati_deal, dict) else amravati_deal[0]
                cursor.execute(
                    "INSERT INTO deal_inquiries (deal_id, buyer_name, buyer_phone) VALUES (?, ?, ?)",
                    (deal_id, "Maharashtra Agro Traders", "9822114433")
                )
                cursor.execute(
                    "INSERT INTO deal_inquiries (deal_id, buyer_name, buyer_phone) VALUES (?, ?, ?)",
                    (deal_id, "Kothari Cotton Mill", "9890887766")
                )

if __name__ == "__main__":
    seed_db()
    print("Database seeded with sample data successfully.")

