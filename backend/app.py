"""
File: app.py
Purpose: Main Flask application entrypoint, exposing REST API endpoints for crop price discovery,
         transport deduction, ranking engine, multilingual voice synthesis, analytics, and admin CRUD.
         Also serves static HTML/CSS/JS frontend screens.
Inputs:  HTTP REST requests from frontend client
Outputs: JSON API responses and static web pages
Usage:   python backend/app.py
"""

import os
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from flask import Flask, request, jsonify, send_from_directory

try:
    from flask_cors import CORS
    has_cors = True
except ImportError:
    has_cors = False

from config import Config
from database.db_init import init_db
from database.seed_data import seed_db
from models.crop_model import CropModel
from models.mandi_model import MandiModel
from services.ranking_recommendation_engine import rank_and_recommend_mandis
from services.tts_engine import generate_speech
from services.analytics_reports_service import get_crop_analytics
from services.notification_service import get_active_notifications
from services.data_fetcher_service import DataFetcherService
from services.deal_listing_service import create_deal_listing
from services.buyer_feed_service import get_buyer_feed
from services.deal_inquiry_service import register_inquiry
from models.deal_model import DealModel
from admin.admin_panel import AdminController
from services.advisory_engine import get_sell_vs_hold_advisory
from services.forecast_service import train_sarimax_models, get_cached_forecast

# Resolve frontend directory path
FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"

app = Flask(__name__, static_folder=str(FRONTEND_DIR), static_url_path="")
if has_cors:
    CORS(app)
else:
    @app.after_request
    def add_cors_headers(response):
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization"
        response.headers["Access-Control-Allow-Methods"] = "GET,PUT,POST,DELETE,OPTIONS"
        return response

# Ensure database is initialized & seeded on application startup
with app.app_context():
    init_db()
    seed_db()
    # Check if forecast cache is primed; if not, run batch training job
    from database.db_connection import get_db_connection
    with get_db_connection() as conn:
        c = conn.cursor()
        c.execute("SELECT COUNT(*) as cnt FROM forecast_cache")
        if c.fetchone()["cnt"] == 0:
            train_sarimax_models()

# ==========================================
# Frontend Page Routes
# ==========================================

@app.route("/")
def serve_index():
    """Serves Screen 1: Farmer Input Screen."""
    return send_from_directory(str(FRONTEND_DIR), "index.html")

@app.route("/dashboard")
def serve_dashboard():
    """Serves Screen 2: Mandi Compare Dashboard."""
    return send_from_directory(str(FRONTEND_DIR), "dashboard.html")

@app.route("/admin")
def serve_admin():
    """Serves Screen 3: Admin Management Screen."""
    return send_from_directory(str(FRONTEND_DIR), "admin.html")

@app.route("/buyer")
def serve_buyer():
    """Serves Screen 4: Buyer Marketplace Screen."""
    buyer_dir = FRONTEND_DIR / "buyer"
    return send_from_directory(str(buyer_dir), "index.html")

@app.route("/<path:path>")
def serve_static(path):
    """Serves CSS, JS, and image static assets."""
    return send_from_directory(str(FRONTEND_DIR), path)

# ==========================================
# Direct Farmer-Buyer Marketplace Endpoints
# ==========================================

@app.route("/api/deals", methods=["GET", "POST"])
def manage_deals():
    """
    GET: Returns active deals for Buyer Marketplace (strips farmer_phone).
    POST: Creates a new direct-sale deal listing posted by a farmer.
    """
    if request.method == "POST":
        data = request.get_json() or {}
        res = create_deal_listing(
            farmer_name=data.get("farmer_name"),
            farmer_phone=data.get("farmer_phone"),
            crop_id=data.get("crop_id"),
            quantity_quintal=data.get("quantity_quintal"),
            price_per_quintal=data.get("price_per_quintal"),
            mandi_id=data.get("mandi_id"),
            location_name=data.get("location_name", "")
        )
        status_code = 200 if res.get("status") == "success" else 400
        return jsonify(res), status_code

    # GET request - buyer feed
    crop_filter = request.args.get("crop")
    location_filter = request.args.get("location")
    sort_by = request.args.get("sort", "newest")

    feed = get_buyer_feed(
        crop_filter=crop_filter,
        location_filter=location_filter,
        sort_by=sort_by
    )
    return jsonify({"status": "success", "deals": feed, "count": len(feed)})

@app.route("/api/deals/<int:deal_id>", methods=["GET"])
def get_deal_detail(deal_id):
    """Returns single deal details (excluding farmer_phone)."""
    deal = DealModel.get_deal_by_id(deal_id)
    if not deal:
        return jsonify({"status": "error", "message": "Deal not found"}), 404
    
    sanitized = {k: v for k, v in deal.items() if k != "farmer_phone"}
    return jsonify({"status": "success", "deal": sanitized})

@app.route("/api/deals/farmer", methods=["GET"])
def get_farmer_deals_list():
    """Returns farmer's listings along with live inquiry counts."""
    phone = request.args.get("phone")
    deals = DealModel.get_farmer_deals(farmer_phone=phone)
    return jsonify({"status": "success", "deals": deals})

@app.route("/api/deals/<int:deal_id>/sold", methods=["PATCH"])
def mark_deal_as_sold(deal_id):
    """Marks a deal listing as sold."""
    DealModel.mark_deal_sold(deal_id)
    return jsonify({"status": "success", "message": "Deal marked as sold!"})

@app.route("/api/deals/<int:deal_id>", methods=["DELETE"])
def cancel_deal(deal_id):
    """Cancels/removes a deal listing."""
    DealModel.delete_deal(deal_id)
    return jsonify({"status": "success", "message": "Deal cancelled successfully."})

@app.route("/api/deals/<int:deal_id>/inquire", methods=["POST"])
def inquire_deal(deal_id):
    """
    Logs buyer inquiry and unlocks the farmer's contact phone number.
    """
    data = request.get_json() or {}
    buyer_name = data.get("buyer_name", "")
    buyer_phone = data.get("buyer_phone", "")

    result = register_inquiry(deal_id, buyer_name, buyer_phone)
    status_code = 200 if result.get("status") == "success" else 400
    return jsonify(result), status_code

# ==========================================
# Farmer & Market Comparison API Endpoints
# ==========================================

@app.route("/api/crops", methods=["GET"])
def get_crops():
    """Returns list of all available crops."""
    crops = CropModel.get_all()
    return jsonify({"status": "success", "crops": crops})

@app.route("/api/mandis", methods=["GET"])
def get_mandis():
    """Returns list of all registered mandis with lat/lng coordinates."""
    mandis = MandiModel.get_all()
    return jsonify({"status": "success", "mandis": mandis})

@app.route("/api/compare", methods=["POST"])
def compare_mandis():
    """
    Evaluates candidate mandis for selected crop, home mandi, and quantity.
    Returns ranked mandi list, top recommendation, and effective price summary.
    """
    data = request.get_json() or {}
    crop_id = data.get("crop_id")
    home_mandi_id = data.get("home_mandi_id")
    quantity = data.get("quantity", 1.0)

    if not crop_id or not home_mandi_id:
        return jsonify({
            "status": "error",
            "message": "Both crop_id and home_mandi_id are required parameters."
        }), 400

    try:
        crop_id = int(crop_id)
        home_mandi_id = int(home_mandi_id)
        quantity = float(quantity) if float(quantity) > 0 else 1.0
    except ValueError:
        return jsonify({"status": "error", "message": "Invalid numeric parameter format."}), 400

    # Evaluates immediately from database for ultra-fast response
    result = rank_and_recommend_mandis(
        crop_id=crop_id,
        home_mandi_id=home_mandi_id,
        quantity_quintal=quantity
    )

    return jsonify({"status": "success", "data": result})

@app.route("/api/v1/recommendation", methods=["GET"])
def get_ai_recommendation():
    """
    Phase 4: Proactive Sell vs. Hold Advisory Endpoint.
    Evaluates current net return at top market vs 7-day future price forecast factoring
    storage cost and depreciation/spoilage rate.
    """
    crop_id = request.args.get("crop_id")
    home_mandi_id = request.args.get("home_mandi_id")
    quantity = request.args.get("quantity", 1.0)
    horizon_days = request.args.get("horizon_days", 7)

    if not crop_id or not home_mandi_id:
        return jsonify({
            "status": "error",
            "decision": "UNAVAILABLE",
            "message": "Both crop_id and home_mandi_id are required.",
            "explanation_key": "missing_parameters",
            "explanation_values": {}
        }), 400

    try:
        crop_id = int(crop_id)
        home_mandi_id = int(home_mandi_id)
        quantity = float(quantity) if float(quantity) > 0 else 1.0
        horizon_days = int(horizon_days) if int(horizon_days) > 0 else 7
    except ValueError:
        return jsonify({
            "status": "error",
            "decision": "UNAVAILABLE",
            "message": "Invalid numeric parameter format.",
            "explanation_key": "invalid_parameters",
            "explanation_values": {}
        }), 400

    advisory = get_sell_vs_hold_advisory(
        crop_id=crop_id,
        home_mandi_id=home_mandi_id,
        quantity=quantity,
        horizon_days=horizon_days
    )

    return jsonify(advisory)

@app.route("/api/speak", methods=["POST"])
def speak_recommendation():
    """
    Synthesizes multilingual voice audio (English, Hindi, Marathi) for recommendation,
    prepending the proactive AI Sell vs. Hold advisory.
    """
    data = request.get_json() or {}
    mandi_name = data.get("mandi_name", "")
    crop_name = data.get("crop_name", "")
    net_price = data.get("net_price", 0.0)
    language = data.get("language", "en")
    advisory_decision = data.get("advisory_decision")
    advisory_gain = data.get("advisory_gain", 0.0)
    advisory_days = data.get("advisory_days", 7)
    advisory_text = data.get("advisory_text")
    loss_avoided = data.get("loss_avoided", 0.0)
    forecast_price = data.get("forecast_price")
    storage_cost = data.get("storage_cost")

    speech_result = generate_speech(
        mandi_name=mandi_name,
        crop_name=crop_name,
        net_price=net_price,
        language=language,
        advisory_decision=advisory_decision,
        advisory_gain=advisory_gain,
        advisory_days=advisory_days,
        advisory_text=advisory_text,
        loss_avoided=loss_avoided,
        forecast_price=forecast_price,
        storage_cost=storage_cost
    )

    return jsonify(speech_result)

@app.route("/api/analytics/<int:crop_id>", methods=["GET"])
def get_analytics(crop_id):
    """Returns 7-day historical price trends and spread statistics for a crop."""
    analytics = get_crop_analytics(crop_id)
    return jsonify({"status": "success", "data": analytics})

@app.route("/api/notifications", methods=["GET"])
def get_notifications():
    """Returns active commodity price alerts and transport advisories."""
    crop_id = request.args.get("crop_id", type=int)
    mandi_id = request.args.get("mandi_id", type=int)
    alerts = get_active_notifications(crop_id=crop_id, mandi_id=mandi_id)
    return jsonify({"status": "success", "notifications": alerts})

@app.route("/api/refresh-prices", methods=["POST"])
def refresh_prices():
    """Triggers simulated Agmarknet price feed refresh."""
    crop_id = request.args.get("crop_id", type=int)
    result = DataFetcherService.fetch_and_update_prices(crop_id=crop_id)
    return jsonify(result)

@app.route("/api/places/recommendations", methods=["GET"])
def place_recommendations():
    """Returns recommended mandi locations for autocomplete and quick adding."""
    query = request.args.get("q", "")
    from services.maps_distance_service import get_location_recommendations
    recs = get_location_recommendations(query)
    return jsonify({"status": "success", "recommendations": recs})

@app.route("/api/crops/recommendations", methods=["GET"])
def crop_recommendations():
    """Returns recommended crops for autocomplete and quick adding."""
    query = request.args.get("q", "")
    recs = CropModel.get_recommendations(query)
    return jsonify({"status": "success", "recommendations": recs})

# ==========================================
# Admin Panel Authentication & CRUD Endpoints
# ==========================================

def is_admin_authorized(req):
    """Verifies authorization header token."""
    auth_header = req.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        return AdminController.validate_token(token)
    return False

@app.route("/api/admin/login", methods=["POST"])
def admin_login():
    """Authenticates admin user and returns session auth token."""
    data = request.get_json() or {}
    username = data.get("username", "").strip()
    password = data.get("password", "").strip()

    result = AdminController.authenticate(username, password)
    status_code = 200 if result.get("authenticated") else 401
    return jsonify(result), status_code

@app.route("/api/admin/check-auth", methods=["GET"])
def admin_check_auth():
    """Checks whether current request token is valid."""
    if is_admin_authorized(request):
        return jsonify({"status": "success", "authenticated": True, "username": Config.ADMIN_USERNAME})
    return jsonify({"status": "error", "authenticated": False, "message": "Unauthorized"}), 401

@app.route("/api/admin/overview", methods=["GET"])
def admin_overview():
    """Returns full dataset overview for administrative control panel."""
    if not is_admin_authorized(request):
        return jsonify({"status": "error", "message": "Unauthorized. Please log in as admin."}), 401
    overview = AdminController.get_full_admin_overview()
    return jsonify({"status": "success", "data": overview})

@app.route("/api/admin/crops", methods=["POST"])
def admin_add_crop():
    if not is_admin_authorized(request):
        return jsonify({"status": "error", "message": "Unauthorized"}), 401
    data = request.get_json() or {}
    name = data.get("name", "").strip()
    if not name:
        return jsonify({"status": "error", "message": "Crop name required"}), 400
    res = AdminController.add_crop(name)
    return jsonify(res)

@app.route("/api/admin/crops/<int:crop_id>", methods=["PUT", "DELETE"])
def admin_manage_crop(crop_id):
    if not is_admin_authorized(request):
        return jsonify({"status": "error", "message": "Unauthorized"}), 401
    if request.method == "DELETE":
        res = AdminController.delete_crop(crop_id)
        return jsonify(res)
    data = request.get_json() or {}
    name = data.get("name", "").strip()
    res = AdminController.update_crop(crop_id, name)
    return jsonify(res)

@app.route("/api/admin/mandis", methods=["POST"])
def admin_add_mandi():
    if not is_admin_authorized(request):
        return jsonify({"status": "error", "message": "Unauthorized"}), 401
    data = request.get_json() or {}
    name = data.get("name", "").strip()
    lat = data.get("latitude")
    lng = data.get("longitude")
    if not name:
        return jsonify({"status": "error", "message": "Mandi name required"}), 400
    res = AdminController.add_mandi(name, lat, lng)
    return jsonify(res)

@app.route("/api/admin/mandis/<int:mandi_id>", methods=["PUT", "DELETE"])
def admin_manage_mandi(mandi_id):
    if not is_admin_authorized(request):
        return jsonify({"status": "error", "message": "Unauthorized"}), 401
    if request.method == "DELETE":
        res = AdminController.delete_mandi(mandi_id)
        return jsonify(res)
    data = request.get_json() or {}
    name = data.get("name", "").strip()
    lat = data.get("latitude")
    lng = data.get("longitude")
    res = AdminController.update_mandi(mandi_id, name, lat, lng)
    return jsonify(res)

@app.route("/api/admin/rates", methods=["POST"])
def admin_update_rate():
    if not is_admin_authorized(request):
        return jsonify({"status": "error", "message": "Unauthorized"}), 401
    data = request.get_json() or {}
    rate = data.get("rate")
    if rate is None:
        return jsonify({"status": "error", "message": "Rate is required"}), 400
    res = AdminController.update_transport_rate(rate)
    return jsonify(res)

@app.route("/api/admin/distances", methods=["POST"])
def admin_set_distance():
    if not is_admin_authorized(request):
        return jsonify({"status": "error", "message": "Unauthorized"}), 401
    data = request.get_json() or {}
    from_id = data.get("from_mandi_id")
    to_id = data.get("to_mandi_id")
    distance_km = data.get("distance_km")
    if from_id is None or to_id is None or distance_km is None:
        return jsonify({"status": "error", "message": "from_id, to_id, distance_km required"}), 400
    res = AdminController.set_distance(from_id, to_id, distance_km)
    return jsonify(res)

@app.route("/api/admin/costs", methods=["POST"])
def admin_update_costs():
    if not is_admin_authorized(request):
        return jsonify({"status": "error", "message": "Unauthorized"}), 401
    data = request.get_json() or {}
    mandi_id = data.get("mandi_id")
    loading = data.get("loading", 0.0)
    unloading = data.get("unloading", 0.0)
    market_charge = data.get("market_charge", 0.0)
    if mandi_id is None:
        return jsonify({"status": "error", "message": "mandi_id required"}), 400
    res = AdminController.update_other_costs(mandi_id, loading, unloading, market_charge)
    return jsonify(res)

@app.route("/api/admin/prices", methods=["POST"])
def admin_update_price():
    if not is_admin_authorized(request):
        return jsonify({"status": "error", "message": "Unauthorized"}), 401
    data = request.get_json() or {}
    crop_id = data.get("crop_id")
    mandi_id = data.get("mandi_id")
    price = data.get("price_per_quintal")
    if crop_id is None or mandi_id is None or price is None:
        return jsonify({"status": "error", "message": "crop_id, mandi_id, and price required"}), 400
    res = AdminController.update_price(crop_id, mandi_id, price)
    return jsonify(res)

if __name__ == "__main__":
    if sys.platform == "win32":
        try:
            sys.stdout.reconfigure(encoding='utf-8')
        except Exception:
            pass
    port = int(os.environ.get("PORT", 5000))
    print(f"[*] KrishiMitra Market Estimator starting on http://127.0.0.1:{port}")
    app.run(host="0.0.0.0", port=port, debug=Config.DEBUG)
