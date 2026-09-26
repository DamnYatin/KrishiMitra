/**
 * File: app.js
 * Purpose: Logic for Screen 1 (Farmer Input Screen).
 * Features:
 *   - Multilingual localization dictionary (English, Hindi, Marathi)
 *   - Fetches crops and mandis from /api/crops and /api/mandis
 *   - Populates large select dropdowns with defaults (Cotton & Nagpur)
 *   - Quick-select quantity pills (10, 25, 50, 100 quintals)
 *   - Loads live alert notifications ticker
 *   - Form validation and seamless navigation to Screen 2 (dashboard.html)
 */

// ==========================================
// 1. Multilingual Localization Dictionary
// ==========================================
const translations = {
  en: {
    appTitle: "KrishiMitra",
    appSubtitle: "Mandi Price & Transport Estimator",
    bannerTitle: "KrishiMitra Market Discovery Engine",
    selectCropLabel: "Select Your Crop",
    selectCropPlaceholder: "Choose crop...",
    selectMandiLabel: "Your Home Mandi / Village",
    selectMandiPlaceholder: "Choose your nearest mandi...",
    quantityLabel: "Estimated Harvest Quantity",
    quantitySuffix: "Quintals",
    submitBtn: "🔍 Find Best Market Return",
    quickSelectLabel: "Quick Select:",
    adminLink: "⚙️ Admin Settings",
    tickerDefault: "🔥 Live: Highest price discovery active across Vidarbha APMCs"
  },
  hi: {
    appTitle: "कृषिमित्र",
    appSubtitle: "मंडी भाव एवं परिवहन खर्च कैलकुलेटर",
    bannerTitle: "कृषिमित्र बाजार मूल्य खोज प्रणाली",
    selectCropLabel: "अपनी फसल चुनें",
    selectCropPlaceholder: "फसल का चयन करें...",
    selectMandiLabel: "आपकी नजदीकी / गृह मंडी",
    selectMandiPlaceholder: "अपनी गृह मंडी चुनें...",
    quantityLabel: "अनुमानित फसल मात्रा",
    quantitySuffix: "क्विंटल",
    submitBtn: "🔍 सबसे अधिक मुनाफा खोजें",
    quickSelectLabel: "त्वरित चयन:",
    adminLink: "⚙️ व्यवस्थापक सेटिंग्स",
    tickerDefault: "🔥 लाइव: विदर्भ की सभी मंडियों में सर्वोत्तम शुद्ध मूल्य खोज चालू है"
  },
  mr: {
    appTitle: "कृषि मित्र",
    appSubtitle: "बाजारभाव आणि वाहतूक खर्च गणक",
    bannerTitle: "कृषि मित्र शेतकरी बाजार जोडणी",
    selectCropLabel: "आपले पीक निवडा",
    selectCropPlaceholder: "पीक निवडा...",
    selectMandiLabel: "आपली जवळची / गृह बाजारपेठ (मंडी)",
    selectMandiPlaceholder: "आपली मंडी निवडा...",
    quantityLabel: "अंदाजे विक्री प्रमाण",
    quantitySuffix: "क्विंटल",
    submitBtn: "🔍 सर्वाधिक नफा मिळवणारी मंडी शोधा",
    quickSelectLabel: "त्वरित निवडा:",
    adminLink: "⚙️ ॲडमिन सेटिंग्ज",
    tickerDefault: "🔥 थेट अपडेट: अमरावती व नागपूर बाजारपेठेत कापसाला उच्च दर"
  }
};

let currentLang = localStorage.getItem("krishimitra_lang") || "en";

// ==========================================
// 2. Language Switcher Helper
// ==========================================
function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem("krishimitra_lang", lang);

  // Update active pill button UI
  document.querySelectorAll(".lang-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.lang === lang);
  });

  // Update localized text labels across DOM
  const t = translations[lang] || translations.en;
  document.querySelectorAll("[data-i18n]").forEach(elem => {
    const key = elem.getAttribute("data-i18n");
    if (t[key]) {
      elem.textContent = t[key];
    }
  });

  // Re-render select option localized names if loaded
  updateOptionLabels();
}

// ==========================================
// 3. Populate Crops & Mandis from Backend API
// ==========================================
let globalCrops = [];
let globalMandis = [];

async function loadInitialData() {
  try {
    // 1. Fetch available crops list
    const cropRes = await fetch("/api/crops");
    const cropData = await cropRes.json();
    if (cropData.status === "success") {
      globalCrops = cropData.crops;
      populateCropSelect(globalCrops);
    }

    // 2. Fetch available mandis list
    const mandiRes = await fetch("/api/mandis");
    const mandiData = await mandiRes.json();
    if (mandiData.status === "success") {
      globalMandis = mandiData.mandis;
      populateMandiSelect(globalMandis);
    }

    // 3. Fetch active notifications ticker
    loadNotificationTicker();

  } catch (error) {
    console.error("Failed to load initial master data:", error);
    showToast("⚠️ Could not connect to server. Please check backend.");
  }
}

function populateCropSelect(crops) {
  const cropSelect = document.getElementById("cropSelect");
  cropSelect.innerHTML = "";

  crops.forEach(crop => {
    const opt = document.createElement("option");
    opt.value = crop.id;
    opt.textContent = formatNameForLanguage(crop.name, currentLang);
    opt.dataset.raw = crop.name;
    // Default to Cotton for initial demo
    if (crop.name.toLowerCase().includes("cotton")) {
      opt.selected = true;
    }
    cropSelect.appendChild(opt);
  });
}

function populateMandiSelect(mandis) {
  const mandiSelect = document.getElementById("homeMandiSelect");
  mandiSelect.innerHTML = "";

  mandis.forEach(mandi => {
    const opt = document.createElement("option");
    opt.value = mandi.id;
    opt.textContent = formatNameForLanguage(mandi.name, currentLang);
    opt.dataset.raw = mandi.name;
    // Default to Nagpur for initial demo
    if (mandi.name.toLowerCase().includes("nagpur")) {
      opt.selected = true;
    }
    mandiSelect.appendChild(opt);
  });
}

function updateOptionLabels() {
  document.querySelectorAll("#cropSelect option, #homeMandiSelect option").forEach(opt => {
    const raw = opt.dataset.raw;
    if (raw) {
      opt.textContent = formatNameForLanguage(raw, currentLang);
    }
  });
}

function formatNameForLanguage(rawName, lang) {
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
// 4. Notifications Ticker Loader
// ==========================================
async function loadNotificationTicker() {
  const tickerElem = document.getElementById("notificationTickerText");
  try {
    const res = await fetch("/api/notifications");
    const data = await res.json();
    if (data.status === "success" && data.notifications.length > 0) {
      tickerElem.textContent = `${data.notifications[0].badge}: ${data.notifications[0].message}`;
    }
  } catch (e) {
    // Fallback to default ticker message
    tickerElem.textContent = translations[currentLang].tickerDefault;
  }
}

// ==========================================
// 5. Form Submission & Navigation
// ==========================================
function handleFormSubmit(e) {
  e.preventDefault();

  const cropId = document.getElementById("cropSelect").value;
  const homeMandiId = document.getElementById("homeMandiSelect").value;
  const quantity = document.getElementById("quantityInput").value || "1";

  if (!cropId || !homeMandiId) {
    showToast("⚠️ Please select both a Crop and your Home Mandi.");
    return;
  }

  // Save selection params into localStorage for easy retrieval on dashboard
  localStorage.setItem("krishimitra_crop_id", cropId);
  localStorage.setItem("krishimitra_home_mandi_id", homeMandiId);
  localStorage.setItem("krishimitra_quantity", quantity);

  // Navigate to Screen 2: Mandi Compare Dashboard
  window.location.href = `/dashboard?crop_id=${cropId}&home_mandi_id=${homeMandiId}&quantity=${quantity}&lang=${currentLang}`;
}

// Helper toast notification
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
// 6. DOM Event Listeners Initialization
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  // Language button clicks
  document.querySelectorAll(".lang-btn").forEach(btn => {
    btn.addEventListener("click", () => setLanguage(btn.dataset.lang));
  });

  // Quick select quantity pill clicks
  document.querySelectorAll(".qty-pill").forEach(pill => {
    pill.addEventListener("click", () => {
      document.querySelectorAll(".qty-pill").forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      document.getElementById("quantityInput").value = pill.dataset.qty;
    });
  });

  // Form submit
  const form = document.getElementById("marketInputForm");
  if (form) {
    form.addEventListener("submit", handleFormSubmit);
  }

  // Initial load
  setLanguage(currentLang);
  loadInitialData();
});
