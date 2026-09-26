/**
 * File: dashboard.js
 * Purpose: Logic for Screen 2 (Mandi Compare Dashboard).
 * Features:
 *   - Reads selected Crop, Home Mandi, and Quantity from URL or localStorage
 *   - Calls POST /api/compare to get ranked mandis, winner recommendation & cost breakdown
 *   - Renders 🏆 Champion Winner Recommendation Card
 *   - Renders Effective Price Summary Breakdown Card with transparent cost components
 *   - Renders ranked list of alternative mandis
 *   - "🔊 Speak Result" Multilingual TTS with gTTS audio buffer & browser SpeechSynthesis
 *   - "🗺️ Navigate to Mandi" Google Maps directions launcher
 *   - Loads 7-day price analytics trend from /api/analytics/<crop_id>
 */

// ==========================================
// 1. Multilingual Localization Dictionary
// ==========================================
const dashboardTranslations = {
  en: {
    appTitle: "KrishiMitra",
    appSubtitle: "Mandi Price & Transport Estimator",
    dashboardHeader: "Mandi Comparison & Return Discovery",
    changeSelectionBtn: "✏️ Change Selection",
    bestChoiceBadge: "🏆 Recommended Market (Highest Net Return)",
    netProfitLabel: "Net Return",
    perQtlSuffix: "/ quintal",
    mandiPriceLabel: "Mandi Listing Price",
    transportCostLabel: "Transport Cost",
    otherCostsLabel: "Handling & Market Charges",
    totalDeductionsLabel: "Total Cost Deductions",
    effectiveNetReturnLabel: "Net Farmer Price",
    recommendedMandiLabel: "Recommended Mandi",
    speakBtn: "🔊 Speak Result",
    speakPlaying: "🔊 Speaking...",
    navigateBtn: "🗺️ Navigate to Mandi",
    allMandisRankTitle: "📊 All Nearby Mandis (Ranked by Profit)",
    distanceLabel: "Distance",
    homeBadge: "Home Mandi",
    analyticsTitle: "📈 7-Day Price Movement & Market Insights",
    marketSpread: "Regional Price Spread",
    avgPrice: "7-Day Regional Avg",
    extraEarningNotice: "💡 Selling at {mandi} earns ₹{extra} more per quintal than your home market!",
    refreshPricesBtn: "⚡ Refresh Live Rates",
    refreshingRates: "⚡ Fetching latest live rates...",
    ratesRefreshed: "✅ Live rates refreshed successfully",
    ratesRefreshError: "⚠️ Could not refresh live rates"
  },
  hi: {
    appTitle: "कृषिमित्र",
    appSubtitle: "मंडी भाव एवं परिवहन खर्च कैलकुलेटर",
    dashboardHeader: "मंडी तुलना एवं शुद्ध मुनाफा विश्लेषण",
    changeSelectionBtn: "✏️ चयन बदलें",
    bestChoiceBadge: "🏆 सर्वोत्तम अनुशंसित मंडी (सर्वाधिक शुद्ध आय)",
    netProfitLabel: "शुद्ध भाव",
    perQtlSuffix: "/ क्विंटल",
    mandiPriceLabel: "मंडी बोली भाव",
    transportCostLabel: "परिवहन खर्च (किमी x दर)",
    otherCostsLabel: "हमाली, तुलाई एवं मंडी शुल्क",
    totalDeductionsLabel: "कुल खर्च कटौती",
    effectiveNetReturnLabel: "किसान को मिलने वाला शुद्ध भाव",
    recommendedMandiLabel: "अनुशंसित मंडी",
    speakBtn: "🔊 बोलकर सुनाएं (आवाज़)",
    speakPlaying: "🔊 आवाज़ जारी है...",
    navigateBtn: "🗺️ मंडी का रास्ता देखें (Google Maps)",
    allMandisRankTitle: "📊 नजदीकी मंडियों की तुलना (मुनाफे अनुसार)",
    distanceLabel: "दूरी",
    homeBadge: "गृह मंडी",
    analyticsTitle: "📈 पिछले 7 दिनों का भाव रुझान",
    marketSpread: "क्षेत्रीय भाव अंतर",
    avgPrice: "7 दिवसीय औसत भाव",
    extraEarningNotice: "💡 {mandi} में बेचने पर अपनी गृह मंडी से ₹{extra} प्रति क्विंटल अधिक मुनाफा मिलेगा!",
    refreshPricesBtn: "⚡ लाइव भाव रीफ्रेश करें",
    refreshingRates: "⚡ नवीनतम लाइव भाव प्राप्त किए जा रहे हैं...",
    ratesRefreshed: "✅ लाइव भाव सफलतापूर्वक रीफ्रेश हो गए",
    ratesRefreshError: "⚠️ लाइव भाव रीफ्रेश नहीं हो सके"
  },
  mr: {
    appTitle: "कृषि मित्र",
    appSubtitle: "बाजारभाव आणि वाहतूक खर्च गणक",
    dashboardHeader: "बाजारपेठ तुलना आणि निव्वळ नफा विश्लेषण",
    changeSelectionBtn: "✏️ बदल करा",
    bestChoiceBadge: "🏆 सर्वोत्तम शिफारस केलेली मंडी (जास्तीत जास्त निव्वळ नफा)",
    netProfitLabel: "निव्वळ भाव",
    perQtlSuffix: "/ क्विंटल",
    mandiPriceLabel: "मंडीतील चालू भाव",
    transportCostLabel: "वाहतूक खर्च (अंतर x दर)",
    otherCostsLabel: "हमाली, तोलाई व बाजार फी",
    totalDeductionsLabel: "एकूण वजावट खर्च",
    effectiveNetReturnLabel: "शेतकऱ्याला मिळणारा निव्वळ दर",
    recommendedMandiLabel: "शिफारस केलेली मंडी",
    speakBtn: "🔊 निकाल ऐका (मराठी आवाज)",
    speakPlaying: "🔊 बोलत आहे...",
    navigateBtn: "🗺️ मंडीचा नकाशा व रस्ता पहा",
    allMandisRankTitle: "📊 सर्व जवळच्या बाजारपेठा (नफ्यानुसार क्रमवारी)",
    distanceLabel: "अंतर",
    homeBadge: "गृह बाजारपेठ",
    analyticsTitle: "📈 मागील ७ दिवसांमधील बाजारभाव कल",
    marketSpread: "बाजारभाव फरक",
    avgPrice: "७ दिवसांची सरासरी",
    extraEarningNotice: "💡 {mandi} येथे माल विकल्यास गृह मंडीपेक्षा क्विंटलमागे ₹{extra} जास्त मिळतील!",
    refreshPricesBtn: "⚡ ताजे दर अपडेट करा",
    refreshingRates: "⚡ ताजे बाजारभाव आणत आहे...",
    ratesRefreshed: "✅ ताजे दर यशस्वीरित्या अपडेट झाले",
    ratesRefreshError: "⚠️ ताजे दर अपडेट होऊ शकले नाहीत"
  }
};

let currentLang = localStorage.getItem("krishimitra_lang") || "en";
let currentComparisonData = null;
let currentAudio = null;

// Parse Query Parameters
const urlParams = new URLSearchParams(window.location.search);
const cropId = urlParams.get("crop_id") || localStorage.getItem("krishimitra_crop_id") || "1";
const homeMandiId = urlParams.get("home_mandi_id") || localStorage.getItem("krishimitra_home_mandi_id") || "1";
const quantity = urlParams.get("quantity") || localStorage.getItem("krishimitra_quantity") || "1";

// ==========================================
// 2. Language Switcher
// ==========================================
function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem("krishimitra_lang", lang);

  document.querySelectorAll(".lang-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.lang === lang);
  });

  const t = dashboardTranslations[lang] || dashboardTranslations.en;
  document.querySelectorAll("[data-i18n]").forEach(elem => {
    const key = elem.getAttribute("data-i18n");
    if (t[key]) {
      elem.textContent = t[key];
    }
  });

  if (currentComparisonData) {
    renderDashboardUI(currentComparisonData);
  }
}

function formatName(rawName, lang) {
  if (!rawName) return "";
  if (rawName.includes("(") && rawName.includes(")")) {
    const parts = rawName.split("(");
    const eng = parts[0].trim();
    const reg = parts[1].replace(")", "").trim();

    if (lang === "en") return eng;
    if (lang === "hi") {
      const hiParts = reg.split("/");
      return hiParts[0].trim();
    }
    if (lang === "mr") {
      const mrParts = reg.split("/");
      return mrParts[mrParts.length - 1].trim();
    }
  }
  return rawName;
}

// ==========================================
// 3. Fetch Comparison Data from POST /api/compare
// ==========================================
async function fetchComparisonData(isSilent = false) {
  const loadingElem = document.getElementById("loadingIndicator");
  const contentElem = document.getElementById("dashboardContent");

  if (!isSilent) {
    if (loadingElem) loadingElem.style.display = "block";
    if (contentElem) contentElem.style.display = "none";
  }

  try {
    const response = await fetch("/api/compare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        crop_id: parseInt(cropId),
        home_mandi_id: parseInt(homeMandiId),
        quantity: parseFloat(quantity)
      })
    });

    const result = await response.json();
    if (result.status === "success") {
      currentComparisonData = result.data;
      renderDashboardUI(currentComparisonData);
      // Also fetch trend analytics
      fetchAnalytics(cropId);
    } else {
      showToast("⚠️ " + (result.message || "Failed to calculate returns."));
    }
  } catch (error) {
    console.error("Comparison fetch failed:", error);
    showToast("⚠️ Network error while fetching mandi comparisons.");
  } finally {
    if (!isSilent) {
      if (loadingElem) loadingElem.style.display = "none";
      if (contentElem) contentElem.style.display = "block";
    }
  }
}

// ==========================================
// 4. Render Dashboard Components
// ==========================================
function renderDashboardUI(data) {
  const t = dashboardTranslations[currentLang] || dashboardTranslations.en;
  const crop = data.crop;
  const homeMandi = data.home_mandi;
  const winner = data.recommended_mandi;
  const summary = data.effective_price_summary;
  const ranked = data.ranked_mandis;

  // 1. Selection Header Chips
  document.getElementById("cropSelectedName").textContent = formatName(crop.name, currentLang);
  document.getElementById("homeMandiSelectedName").textContent = formatName(homeMandi.name, currentLang);
  document.getElementById("quantitySelectedValue").textContent = `${data.quantity_quintal} ${t.quantitySuffix || "Quintals"}`;

  // 2. Winner Champion Card
  if (winner) {
    document.getElementById("winnerMandiName").textContent = formatName(winner.mandi_name, currentLang);
    document.getElementById("winnerNetPrice").innerHTML = `₹${winner.net_price_per_qtl.toLocaleString()} <span>${t.perQtlSuffix}</span>`;
    
    // Profit gain callout
    const profitCallout = document.getElementById("winnerProfitCallout");
    if (summary.profit_gain_per_qtl > 0 && summary.is_different_from_home) {
      profitCallout.style.display = "block";
      profitCallout.textContent = t.extraEarningNotice
        .replace("{mandi}", formatName(winner.mandi_name, currentLang))
        .replace("{extra}", summary.profit_gain_per_qtl.toLocaleString());
    } else {
      profitCallout.style.display = "none";
    }

    // Google Maps Navigation Button
    const navBtn = document.getElementById("navigateBtn");
    if (navBtn) {
      if (winner.latitude && winner.longitude) {
        navBtn.href = `https://www.google.com/maps/dir/?api=1&destination=${winner.latitude},${winner.longitude}`;
        navBtn.target = "_blank";
        navBtn.style.display = "inline-flex";
      } else {
        const queryName = encodeURIComponent(winner.mandi_name.split("(")[0].trim() + " APMC Mandi");
        navBtn.href = `https://www.google.com/maps/search/?api=1&query=${queryName}`;
        navBtn.target = "_blank";
        navBtn.style.display = "inline-flex";
      }
    }
  }

  // 3. Effective Price Summary Card (Transparent Cost Breakdown)
  if (summary) {
    document.getElementById("summaryListingPrice").textContent = `₹${summary.mandi_price_per_qtl.toLocaleString()} / qtl`;
    document.getElementById("summaryTransportCost").textContent = `₹${summary.transport_cost_per_qtl.toLocaleString()} / qtl`;
    document.getElementById("summaryOtherCosts").textContent = `₹${summary.other_costs_per_qtl.toLocaleString()} / qtl`;
    document.getElementById("summaryNetPrice").textContent = `₹${summary.net_price_per_qtl.toLocaleString()} / qtl`;
    document.getElementById("summaryMandiName").textContent = formatName(summary.mandi_name, currentLang);
  }

  // 4. Ranked Mandi List
  const rankContainer = document.getElementById("rankedMandisContainer");
  rankContainer.innerHTML = "";

  ranked.forEach(item => {
    const isWinner = item.is_recommended;
    const card = document.createElement("div");
    card.className = `mandi-rank-card ${isWinner ? "is-winner" : ""}`;

    const cleanMandiName = formatName(item.mandi_name, currentLang);
    const homeChip = item.is_home_mandi ? `<span class="info-chip" style="font-size:0.75rem; padding:2px 6px; background:#e0f2fe; color:#0369a1; border-color:#bae6fd;">🏠 ${t.homeBadge}</span>` : "";
    const winnerChip = isWinner ? `<span class="info-chip" style="font-size:0.75rem; padding:2px 6px; background:#fef3c7; color:#92400e; border-color:#fde68a;">🏆 Best</span>` : "";

    card.innerHTML = `
      <div class="rank-left">
        <div class="rank-badge-number">${isWinner ? "🏆" : item.rank}</div>
        <div>
          <div class="mandi-item-name">${cleanMandiName} ${winnerChip} ${homeChip}</div>
          <div class="mandi-item-meta">
            <span>📍 ${item.distance_km} km</span>
            <span>🏷️ ₹${item.mandi_price_per_qtl}/qtl</span>
            <span>🚛 -₹${item.transport_cost_per_qtl}</span>
            ${item.other_costs_per_qtl > 0 ? `<span>📦 -₹${item.other_costs_per_qtl}</span>` : ""}
          </div>
        </div>
      </div>
      <div class="rank-right">
        <div class="rank-net-price">₹${item.net_price_per_qtl.toLocaleString()}</div>
        <div class="rank-listing-sub">${t.netProfitLabel}</div>
      </div>
    `;
    rankContainer.appendChild(card);
  });

  // 5. Update Google Map Markers
  if (typeof renderGoogleMapMarkers === "function") {
    renderGoogleMapMarkers(data);
  }
}

// ==========================================
// 5. 7-Day Analytics Fetcher
// ==========================================
async function fetchAnalytics(cId) {
  try {
    const res = await fetch(`/api/analytics/${cId}`);
    const resData = await res.json();
    if (resData.status === "success" && resData.data.summary) {
      const summary = resData.data.summary;
      document.getElementById("analyticsAvgPrice").textContent = `₹${summary.average_price.toLocaleString()}`;
      document.getElementById("analyticsSpread").textContent = `₹${summary.spread.toLocaleString()}`;
      document.getElementById("analyticsCard").style.display = "block";
    }
  } catch (e) {
    console.warn("Analytics fetch skipped:", e);
  }
}

// ==========================================
// 6. Text-to-Speech (TTS) Engine Execution
// ==========================================
async function speakRecommendation() {
  if (!currentComparisonData || !currentComparisonData.recommended_mandi) {
    showToast("⚠️ No comparison data available to speak.");
    return;
  }

  const t = dashboardTranslations[currentLang] || dashboardTranslations.en;
  const winner = currentComparisonData.recommended_mandi;
  const crop = currentComparisonData.crop;
  const speakBtn = document.getElementById("speakBtn");
  const waveIndicator = document.getElementById("voicePlayingIndicator");

  if (speakBtn) speakBtn.disabled = true;
  if (waveIndicator) waveIndicator.style.display = "inline-flex";

  try {
    // 1. Call POST /api/speak
    const response = await fetch("/api/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mandi_name: winner.mandi_name,
        crop_name: crop.name,
        net_price: winner.net_price_per_qtl,
        language: currentLang
      })
    });

    const data = await response.json();

    // 2. Play base64 audio if returned by gTTS
    if (data.audio_base64) {
      if (currentAudio) {
        currentAudio.pause();
      }
      currentAudio = new Audio(`data:audio/mp3;base64,${data.audio_base64}`);
      currentAudio.onended = () => {
        if (speakBtn) speakBtn.disabled = false;
        if (waveIndicator) waveIndicator.style.display = "none";
      };
      await currentAudio.play();
    } else {
      // 3. Fallback to Browser Native Web Speech API
      speakWithBrowserTTS(data.script, currentLang, () => {
        if (speakBtn) speakBtn.disabled = false;
        if (waveIndicator) waveIndicator.style.display = "none";
      });
    }

  } catch (error) {
    console.error("TTS audio playback failed:", error);
    // Browser fallback
    const script = `${formatName(crop.name, currentLang)} best market is ${formatName(winner.mandi_name, currentLang)} net price ${winner.net_price_per_qtl} rupees.`;
    speakWithBrowserTTS(script, currentLang, () => {
      if (speakBtn) speakBtn.disabled = false;
      if (waveIndicator) waveIndicator.style.display = "none";
    });
  }
}

function speakWithBrowserTTS(text, lang, onEndCallback) {
  if (!('speechSynthesis' in window)) {
    showToast("⚠️ Voice synthesis not supported in this browser.");
    if (onEndCallback) onEndCallback();
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.9;

  if (lang === "mr") {
    utterance.lang = "mr-IN";
  } else if (lang === "hi") {
    utterance.lang = "hi-IN";
  } else {
    utterance.lang = "en-IN";
  }

  utterance.onend = onEndCallback;
  utterance.onerror = onEndCallback;
  window.speechSynthesis.speak(utterance);
}

// Refresh Live Rates Handler
async function handleRefreshRates() {
  const btn = document.getElementById("refreshPricesBtn");
  const statusContainer = document.getElementById("refreshStatusMessage");
  const statusText = document.getElementById("refreshStatusText");
  const dict = dashboardTranslations[currentLang] || dashboardTranslations.en;

  if (btn) {
    btn.disabled = true;
    btn.style.opacity = "0.7";
    btn.textContent = dict.refreshingRates;
  }
  showToast(dict.refreshingRates);

  try {
    await fetch(`/api/refresh-prices?crop_id=${cropId}`, { method: "POST" });
    await fetchComparisonData(true);

    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const successMsg = `${dict.ratesRefreshed} (${timeStr})`;

    showToast(successMsg);

    if (statusContainer && statusText) {
      statusText.textContent = successMsg;
      statusContainer.style.display = "flex";
      statusContainer.style.opacity = "1";
      setTimeout(() => {
        statusContainer.style.transition = "opacity 0.8s ease";
        statusContainer.style.opacity = "0";
        setTimeout(() => {
          statusContainer.style.display = "none";
        }, 800);
      }, 5000);
    }
  } catch (e) {
    console.error("Refresh error:", e);
    showToast(dict.ratesRefreshError);
    if (statusContainer && statusText) {
      statusText.textContent = dict.ratesRefreshError;
      statusContainer.style.display = "flex";
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.style.opacity = "1";
      btn.textContent = dict.refreshPricesBtn;
    }
  }
}

// Helper toast
function showToast(msg) {
  let container = document.querySelector(".toast-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    document.body.appendChild(container);
  }
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// ==========================================
// 7. Google Maps Interactive Map Engine & Leaflet Fallback
// ==========================================
let googleMap = null;
let googleMapMarkers = [];
let googleMapPolyline = null;
let leafletMap = null;

// Handle Google Maps authentication/billing error gracefully with Leaflet
window.gm_authFailure = function() {
  console.warn("Google Maps auth/billing error. Switching to OpenStreetMap engine.");
  initLeafletFallbackMap();
};

function initLeafletFallbackMap() {
  const mapContainer = document.getElementById("googleMapContainer");
  if (!mapContainer || typeof L === "undefined" || leafletMap) return;

  // Clear container
  mapContainer.innerHTML = "";

  // Initialize Leaflet map
  leafletMap = L.map('googleMapContainer').setView([20.9374, 77.7796], 7);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 18
  }).addTo(leafletMap);

  if (currentComparisonData) {
    renderLeafletMarkers(currentComparisonData);
  }
}

function renderLeafletMarkers(data) {
  if (!leafletMap || typeof L === "undefined") return;

  const ranked = data.ranked_mandis;
  const winner = data.recommended_mandi;
  const homeMandi = data.home_mandi;
  const latLngs = [];

  let homePos = null;
  let winnerPos = null;

  ranked.forEach(mandi => {
    if (mandi.latitude && mandi.longitude) {
      const pos = [parseFloat(mandi.latitude), parseFloat(mandi.longitude)];
      latLngs.push(pos);

      const isHome = mandi.is_home_mandi;
      const isWinner = mandi.is_recommended;
      if (isHome) homePos = pos;
      if (isWinner) winnerPos = pos;

      const markerColor = isWinner ? "#b45309" : (isHome ? "#0284c7" : "#15803d");
      const iconHtml = `<div style="background:${markerColor}; color:#fff; border-radius:50%; width:28px; height:28px; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:12px; border:2px solid #fff; box-shadow:0 2px 6px rgba(0,0,0,0.3);">${isWinner ? '🏆' : (isHome ? '🏠' : mandi.rank)}</div>`;

      const customIcon = L.divIcon({
        className: 'custom-mandi-pin',
        html: iconHtml,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const popupContent = `
        <div style="font-family:sans-serif; font-size:13px;">
          <strong style="font-size:14px; color:#0f172a;">${formatName(mandi.mandi_name, currentLang)}</strong><br>
          ${isWinner ? '<span style="color:#b45309; font-weight:bold;">🏆 #1 Recommended Market</span><br>' : ''}
          ${isHome ? '<span style="color:#0284c7; font-weight:bold;">🏠 Home Mandi</span><br>' : ''}
          <span>📍 Distance: <b>${mandi.distance_km} km</b></span><br>
          <span>🏷️ Net Return: <b style="color:#15803d;">₹${mandi.net_price_per_qtl}/qtl</b></span>
        </div>
      `;

      L.marker(pos, { icon: customIcon }).addTo(leafletMap).bindPopup(popupContent);
    }
  });

  // Draw connecting line between home and winning mandi
  if (homePos && winnerPos) {
    L.polyline([homePos, winnerPos], { color: '#15803d', weight: 4, opacity: 0.85, dashArray: '6, 8' }).addTo(leafletMap);
  }

  if (latLngs.length > 0) {
    leafletMap.fitBounds(L.latLngBounds(latLngs), { padding: [30, 30] });
  }
}

window.initGoogleMap = function() {
  const mapContainer = document.getElementById("googleMapContainer");
  if (!mapContainer) return;

  if (typeof google === "undefined" || !google.maps) {
    initLeafletFallbackMap();
    return;
  }

  try {
    const defaultCenter = { lat: 20.9374, lng: 77.7796 };
    googleMap = new google.maps.Map(mapContainer, {
      zoom: 7,
      center: defaultCenter,
      mapTypeId: "roadmap",
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true
    });

    if (currentComparisonData) {
      renderGoogleMapMarkers(currentComparisonData);
    }
  } catch (e) {
    console.warn("Google Maps init exception. Falling back to OpenStreetMap:", e);
    initLeafletFallbackMap();
  }
};

function renderGoogleMapMarkers(data) {
  if (!googleMap || typeof google === "undefined" || !google.maps) return;

  // Clear previous markers & lines
  googleMapMarkers.forEach(m => m.setMap(null));
  googleMapMarkers = [];
  if (googleMapPolyline) {
    googleMapPolyline.setMap(null);
  }

  const bounds = new google.maps.LatLngBounds();
  const ranked = data.ranked_mandis;
  const winner = data.recommended_mandi;
  const homeMandi = data.home_mandi;

  let homeLatLng = null;
  let winnerLatLng = null;

  ranked.forEach(mandi => {
    if (mandi.latitude && mandi.longitude) {
      const pos = { lat: parseFloat(mandi.latitude), lng: parseFloat(mandi.longitude) };
      bounds.extend(pos);

      const isHome = mandi.is_home_mandi;
      const isWinner = mandi.is_recommended;

      if (isHome) homeLatLng = pos;
      if (isWinner) winnerLatLng = pos;

      // Custom marker icon colors
      let markerColor = "#16a34a"; // Green
      let markerLabel = `${mandi.rank}`;
      if (isWinner) {
        markerColor = "#f59e0b"; // Gold for champion
        markerLabel = "★";
      } else if (isHome) {
        markerColor = "#0284c7"; // Blue for home mandi
        markerLabel = "H";
      }

      const marker = new google.maps.Marker({
        position: pos,
        map: googleMap,
        title: mandi.mandi_name,
        label: {
          text: markerLabel,
          color: "#ffffff",
          fontWeight: "bold",
          fontSize: "12px"
        },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: isWinner ? 16 : 13,
          fillColor: markerColor,
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2
        }
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="font-family:sans-serif; padding:4px; font-size:13px; max-width:200px;">
            <strong style="color:#0f172a; font-size:14px;">${formatName(mandi.mandi_name, currentLang)}</strong><br>
            ${isWinner ? '<span style="color:#b45309; font-weight:bold;">🏆 #1 Recommended Market</span><br>' : ''}
            ${isHome ? '<span style="color:#0284c7; font-weight:bold;">🏠 Home Mandi</span><br>' : ''}
            <span>📍 Distance: <b>${mandi.distance_km} km</b></span><br>
            <span>🏷️ Net Return: <b style="color:#15803d;">₹${mandi.net_price_per_qtl}/qtl</b></span>
          </div>
        `
      });

      marker.addListener("click", () => {
        infoWindow.open(googleMap, marker);
      });

      googleMapMarkers.push(marker);
    }
  });

  // Draw connecting route line from Home Mandi to Recommended Mandi
  if (homeLatLng && winnerLatLng && (homeLatLng.lat !== winnerLatLng.lat || homeLatLng.lng !== winnerLatLng.lng)) {
    googleMapPolyline = new google.maps.Polyline({
      path: [homeLatLng, winnerLatLng],
      geodesic: true,
      strokeColor: "#15803d",
      strokeOpacity: 0.85,
      strokeWeight: 4,
      map: googleMap
    });
  }

  // Adjust zoom to fit all markers
  if (googleMapMarkers.length > 0) {
    googleMap.fitBounds(bounds);
    // Avoid overzooming
    const listener = google.maps.event.addListener(googleMap, "idle", () => {
      if (googleMap.getZoom() > 10) googleMap.setZoom(10);
      google.maps.event.removeListener(listener);
    });
  }
}

// ==========================================
// 8. Direct Marketplace: Deal Posting & Management Logic
// ==========================================

function populateDealForm(data) {
  const crop = data.crop;
  const winner = data.recommended_mandi;
  const homeMandi = data.home_mandi;

  const cropNameInput = document.getElementById("dealCropName");
  const cropIdInput = document.getElementById("dealCropId");
  const quantityInput = document.getElementById("dealQuantity");
  const askingPriceInput = document.getElementById("dealAskingPrice");
  const locationInput = document.getElementById("dealLocation");
  const mandiIdInput = document.getElementById("dealMandiId");

  if (cropNameInput && crop) {
    cropNameInput.value = crop.name;
  }
  if (cropIdInput && crop) {
    cropIdInput.value = crop.id;
  }
  if (quantityInput) {
    quantityInput.value = data.quantity_quintal || quantity || 10;
  }
  if (askingPriceInput && winner) {
    // Smart pre-fill: use engine's calculated recommended net price as a baseline suggestion!
    askingPriceInput.value = Math.round(winner.net_price_per_qtl);
  }
  if (locationInput) {
    locationInput.value = (homeMandi && homeMandi.name) ? homeMandi.name.split("(")[0].trim() : "Nagpur";
  }
  if (mandiIdInput && homeMandi) {
    mandiIdInput.value = homeMandi.id;
  }
}

async function handlePostDeal(e) {
  e.preventDefault();
  const farmerName = document.getElementById("dealFarmerName").value.trim();
  const farmerPhone = document.getElementById("dealFarmerPhone").value.trim();
  const cropId = document.getElementById("dealCropId").value;
  const quantity = parseFloat(document.getElementById("dealQuantity").value);
  const askingPrice = parseFloat(document.getElementById("dealAskingPrice").value);
  const location = document.getElementById("dealLocation").value.trim();
  const mandiId = document.getElementById("dealMandiId").value;
  const submitBtn = document.getElementById("postDealSubmitBtn");

  if (!farmerName || !farmerPhone || !cropId || isNaN(quantity) || isNaN(askingPrice) || !location) {
    showToast("⚠️ Please fill out all deal fields.");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Posting Deal...";

  try {
    const res = await fetch("/api/deals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        farmer_name: farmerName,
        farmer_phone: farmerPhone,
        crop_id: cropId,
        quantity_quintal: quantity,
        price_per_quintal: askingPrice,
        location_name: location,
        mandi_id: mandiId ? parseInt(mandiId) : null
      })
    });

    const data = await res.json();
    if (data.status === "success") {
      showToast("🎉 Deal listed live on Buyer Marketplace!");
      loadFarmerDeals(farmerPhone);
    } else {
      showToast("⚠️ " + (data.message || "Failed to post deal."));
    }
  } catch (err) {
    console.error("Deal post error:", err);
    showToast("⚠️ Network error while posting deal.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "🚀 Post Deal to Buyer Marketplace";
  }
}

async function loadFarmerDeals(phone) {
  const container = document.getElementById("farmerDealsContainer");
  if (!container) return;

  const farmerPhone = phone || (document.getElementById("dealFarmerPhone") ? document.getElementById("dealFarmerPhone").value.trim() : "");
  const url = farmerPhone ? `/api/deals/farmer?phone=${encodeURIComponent(farmerPhone)}` : "/api/deals/farmer";

  try {
    const res = await fetch(url);
    const result = await res.json();

    if (result.status === "success" && result.deals && result.deals.length > 0) {
      container.innerHTML = "";
      result.deals.forEach(deal => {
        const isSold = deal.status === "sold";
        const card = document.createElement("div");
        card.style.cssText = `
          background: ${isSold ? "#f8fafc" : "#ffffff"};
          border: 1.5px solid ${isSold ? "#cbd5e1" : "rgba(22, 101, 52, 0.2)"};
          border-radius: var(--radius-md);
          padding: 0.85rem 1rem;
          margin-bottom: 0.65rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.5rem;
        `;

        card.innerHTML = `
          <div>
            <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-main);">
              ${deal.crop_name} — <strong>₹${deal.price_per_quintal.toLocaleString()} / qtl</strong>
              <span style="font-size: 0.75rem; padding: 2px 6px; border-radius: var(--radius-full); margin-left: 6px; background: ${isSold ? '#e2e8f0' : '#dcfce7'}; color: ${isSold ? '#475569' : '#166534'};">
                ${deal.status.toUpperCase()}
              </span>
            </div>
            <div style="font-size: 0.82rem; color: var(--text-muted); margin-top: 2px;">
              <span>⚖️ ${deal.quantity_quintal} qtl</span> &bull; 
              <span>📍 ${deal.location_name}</span> &bull; 
              <span>🕒 ${deal.posted_at.split(' ')[0]}</span>
            </div>
            <div style="margin-top: 4px; font-size: 0.85rem; font-weight: 600; color: #0284c7;">
              💬 ${deal.inquiry_count} Buyer Inquiries Received
            </div>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            ${!isSold ? `
              <button class="btn btn-outline" style="min-height:30px; padding:2px 8px; font-size:0.8rem; width:auto; border-color:#16a34a; color:#166534;" onclick="handleMarkSold(${deal.id})">
                ✅ Mark Sold
              </button>
            ` : ''}
            <button class="btn btn-outline" style="min-height:30px; padding:2px 8px; font-size:0.8rem; width:auto; border-color:#f87171; color:#b91c1c;" onclick="handleDeleteDeal(${deal.id})">
              🗑️ Delete
            </button>
          </div>
        `;
        container.appendChild(card);
      });
    } else {
      container.innerHTML = `
        <div style="text-align:center; padding:1.25rem; color:var(--text-muted); font-size:0.9rem;">
          No direct-sale listings posted yet. Fill out the form above to list your harvest for buyers!
        </div>
      `;
    }
  } catch (err) {
    container.innerHTML = `<p style="font-size:0.85rem; color:#b91c1c; text-align:center;">Failed to load listings.</p>`;
  }
}

window.handleMarkSold = async function(dealId) {
  try {
    await fetch(`/api/deals/${dealId}/sold`, { method: "PATCH" });
    showToast("✅ Deal marked as sold!");
    loadFarmerDeals();
  } catch (e) {
    showToast("⚠️ Could not update deal.");
  }
};

window.handleDeleteDeal = async function(dealId) {
  if (!confirm("Are you sure you want to remove this deal listing?")) return;
  try {
    await fetch(`/api/deals/${dealId}`, { method: "DELETE" });
    showToast("🗑️ Deal listing removed.");
    loadFarmerDeals();
  } catch (e) {
    showToast("⚠️ Could not remove deal.");
  }
};

// ==========================================
// 9. Initialization & Event Handlers
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  // Language button clicks
  document.querySelectorAll(".lang-btn").forEach(btn => {
    btn.addEventListener("click", () => setLanguage(btn.dataset.lang));
  });

  // Action Buttons
  const speakBtn = document.getElementById("speakBtn");
  if (speakBtn) speakBtn.addEventListener("click", speakRecommendation);

  const refreshBtn = document.getElementById("refreshPricesBtn");
  if (refreshBtn) refreshBtn.addEventListener("click", handleRefreshRates);

  // Deal Form Listener
  const dealForm = document.getElementById("postDealForm");
  if (dealForm) dealForm.addEventListener("submit", handlePostDeal);

  setLanguage(currentLang);
  fetchComparisonData().then(() => {
    if (currentComparisonData) {
      populateDealForm(currentComparisonData);
      loadFarmerDeals();
    }
  });
});
