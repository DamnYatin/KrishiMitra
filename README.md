# KrishiMitra Market Estimator & Direct Marketplace

**Domain:** Agriculture, Foodtech & Rural Logistics  
**Product:** KrishiMitra Market Discovery & Direct Procurement Platform  

---

## 🌾 Overview & Objective

Agricultural producers frequently sell their harvest at local village markets or the nearest APMC Mandi, unaware that a market 50–100 km away might offer significantly higher listing prices. However, higher listing prices do not automatically guarantee higher profits once logistics, loading/unloading, and market cess are deducted.

**KrishiMitra** solves this by evaluating candidate markets, automatically calculating **Transport Costs** and **Mandi Handling Charges**, and recommending the market that delivers the **highest net profit return per quintal** to the farmer. It also features a **Direct Buyer Marketplace** enabling direct procurement between bulk buyers and farmers with zero intermediary commissions.

---

## 🧮 Core Mathematical Formulas

Every calculation is implemented in dedicated, unit-testable service modules:

```text
1. Transport Cost (₹) = Distance (km) × Rate (₹/km/quintal) × Quantity (quintal)
2. Transport Cost per qtl = Distance (km) × Rate (₹/km/quintal)
3. Total Other Costs per qtl = Loading + Unloading + Market Cess
4. Total Cost per qtl = Transport Cost per qtl + Total Other Costs per qtl
5. Net Price per qtl (₹/qtl) = Mandi Listing Price − Total Cost per qtl
6. Total Net Farmer Earnings (₹) = Net Price per qtl × Quantity (quintal)
```

---

## 🚀 How to Run

### ⚡ Option A: One-Click Launch (Windows)
Simply double-click [`run.bat`](file:///c:/Users/HP-PC/Documents/KrishiMitra/KrishiMitra_Buyer/run.bat) in the project root. It will automatically check requirements, start the server, and open the app in your default browser.

---

### 💻 Option B: Manual Terminal Execution

#### 1. Prerequisites
- **Python 3.8+** installed on your system
- **pip** package installer

#### 2. Setup & Installation

Clone or extract the repository, open your terminal / command prompt in the root project directory:

```bash
# Optional: Create and activate a virtual environment
python -m venv venv

# On Windows:
venv\Scripts\activate

# On macOS/Linux:
source venv/bin/activate

# Install required dependencies
pip install -r requirements.txt
```

#### 3. Run the Application

```bash
python backend/app.py
```

On first launch, the SQLite database at `backend/database/krishimitra.db` will automatically initialize tables and seed initial market data and demo buyer listings.

### 4. Open in Browser

Once the server is running on `http://127.0.0.1:5000`:

| Interface | URL | Description |
| :--- | :--- | :--- |
| **🌾 Farmer Price Discovery (Screen 1)** | [http://127.0.0.1:5000](http://127.0.0.1:5000) | Select crop, home mandi, and quantity to discover highest net return. |
| **📊 Mandi Comparison Dashboard (Screen 2)** | [http://127.0.0.1:5000/dashboard.html](http://127.0.0.1:5000/dashboard.html) | Ranked comparison table, route map, net earnings breakdown & audio readout. |
| **🛒 Buyer Marketplace** | [http://127.0.0.1:5000/buyer](http://127.0.0.1:5000/buyer) | Direct crop trade board for bulk institutional buyers & millers. |
| **⚙️ Admin Management Panel (Screen 3)** | [http://127.0.0.1:5000/admin](http://127.0.0.1:5000/admin) | Configure base freight rates, mandi fees, and master crops (Login: `admin` / `admin`). |

### 5. Running Automated Backend Tests

You can verify all calculations, math formulas, and marketplace logic standalone:

```bash
python test_services.py
```

---

## 📂 Modular File Architecture

```
KrishiMitra/
├── backend/
│   ├── app.py                          # Flask entrypoint & REST API routing
│   ├── config.py                       # Configuration constants, DB paths, mock API toggle
│   ├── database/
│   │   ├── db_connection.py            # Thread-safe SQLite connection context manager
│   │   ├── db_init.py                  # DDL table creation scripts
│   │   └── seed_data.py                # Initial seed data for Maharashtra mandis & demo deals
│   ├── models/
│   │   ├── crop_model.py               # Crop data access methods
│   │   ├── mandi_model.py              # Mandi coordinates & entity methods
│   │   ├── price_model.py              # Mandi crop prices & historical points
│   │   ├── distance_model.py           # Geographical distance matrix
│   │   ├── cost_model.py               # Loading, unloading, cess & freight rates
│   │   └── deal_model.py               # Direct marketplace listings & inquiries
│   ├── services/
│   │   ├── transport_cost_calculator.py# Pure distance × rate × quantity calculation
│   │   ├── net_price_calculator.py     # Mandi Price − Total Costs pure calculation
│   │   ├── cost_estimation_service.py  # Loading, unloading, and mandi fee lookup
│   │   ├── maps_distance_service.py    # Distance Matrix lookup with GPS Haversine fallback
│   │   ├── data_fetcher_service.py     # Agmarknet / e-NAM live data fetcher
│   │   ├── price_comparison_engine.py  # Multi-mandi price alignment
│   │   ├── ranking_recommendation_engine.py # Descending net return ranking engine
│   │   ├── tts_engine.py               # Multilingual voice synthesis (Marathi/Hindi/English)
│   │   ├── analytics_reports_service.py# 7-day historical price trends & spread
│   │   ├── notification_service.py     # Price surge alerts & market advisories
│   │   ├── deal_listing_service.py     # Farmer deal creation & validation
│   │   ├── buyer_feed_service.py       # Buyer feed with contact privacy protection
│   │   └── deal_inquiry_service.py     # Inquiry registration & contact unlock
│   ├── admin/
│   │   └── admin_panel.py              # CRUD controller for administrative tools
│   └── requirements.txt                # Python package dependencies
├── frontend/
│   ├── index.html                      # Screen 1: Farmer Crop, Mandi & Quantity Form
│   ├── dashboard.html                  # Screen 2: Mandi Compare & Effective Price Breakdown
│   ├── admin.html                      # Screen 3: Master Data & Admin Management Panel
│   ├── buyer/
│   │   ├── index.html                  # Buyer Marketplace listing & inquiry modal
│   │   └── js/buyer.js                 # Buyer feed handling & inquiries
│   ├── css/style.css                   # Mobile-first, high contrast, farmer-friendly styling
│   └── js/
│       ├── app.js                      # Farmer input handling & localization
│       ├── dashboard.js                # Comparison table, summary card, TTS, Google Maps
│       └── admin.js                    # Admin panel CRUD operations
├── test_services.py                    # Standalone test suite for calculations & deals
└── README.md                           # Documentation & Execution Guide
```

---

## 🎯 Sample Benchmark Values

When selecting **Cotton (कपास)** and **Home Mandi: Nagpur (10 Quintals)**:

| Rank | Mandi | Distance | Listing Price | Transport Cost (₹0.80/km) | Other Costs | **Net Farmer Return** | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **🏆 #1** | **Amravati** | 145 km | ₹7,250 / qtl | -₹116 / qtl | ₹0 / qtl | **₹7,134 / qtl** | **Recommended** |
| #2 | **Nagpur** | 0 km | ₹7,216 / qtl | ₹0 / qtl | -₹116 / qtl | **₹7,100 / qtl** | Home Mandi |
| #3 | **Pune** | 600 km | ₹7,348 / qtl | -₹480 / qtl | ₹0 / qtl | **₹6,868 / qtl** | Alternative |
| #4 | **Akola** | 312.5 km | ₹7,013 / qtl | -₹250 / qtl | ₹0 / qtl | **₹6,763 / qtl** | Alternative |
| #5 | **Nashik** | 875 km | ₹7,090 / qtl | -₹700 / qtl | -₹100 / qtl | **₹6,290 / qtl** | Alternative |

---

## 🔌 Active Live API Integrations

1. **Agmarknet Mandi Price Feed (data.gov.in XML API):**
   - **Resource ID:** `9ef84268-d588-465a-a308-a864a43d0070`
   - **Endpoint:** `https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070`
   - Automatically parses `<modal_price>` / `<max_price>` filtered by commodity and market, with fallback.

2. **Google Maps Platform (JavaScript & Distance Matrix API):**
   - Backend routing queries Distance Matrix API with Haversine fallback.
   - Frontend renders an interactive Google Map with custom markers (🏠 Home, 🏆 Recommended, 📍 Candidates).

---

## 🌐 Deployment Options

### Option 1: Render.com
Pre-configured with `render.yaml` and `Procfile`:
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `gunicorn --chdir backend app:app`

### Option 2: Vercel Serverless
Pre-configured with `vercel.json` and `api/index.py`.
