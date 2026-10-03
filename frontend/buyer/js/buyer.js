/**
 * File: buyer.js
 * Purpose: Logic for Buyer Marketplace screen (Screen 4).
 * Features:
 *   - Multilingual support (English, Hindi, Marathi)
 *   - Auto-fetches live active deals from GET /api/deals
 *   - Filters by crop and location, sorts by newest or price
 *   - Auto-polling every 15s with timer feedback
 *   - Inquiry Modal flow calling POST /api/deals/<id>/inquire to unlock farmer contact
 *   - In-session contact retention and tel: link generation
 */

let activeDeals = [];
let unlockedContacts = {}; // { dealId: { farmer_name, farmer_phone } }
let autoRefreshTimer = null;
let countdownSec = 15;

// ==========================================
// 1. Multilingual Localization Dictionary
// ==========================================
const buyerTranslations = {
  en: {
    buyerTitle: "KrishiMitra Buyer Market",
    buyerSubtitle: "Direct Farm Procurement & Transparent Deals",
    farmerView: "🌾 Farmer View",
    bannerTitle: "🤝 Direct Farmer–Buyer Linkage",
    bannerDesc: "Buy agricultural commodities directly from local farmers at fair negotiated prices with zero APMC middleman commissions. Click \"I'm Interested\" to register interest and connect instantly.",
    privacyBadge: "🛡️ Privacy Protected Feed",
    filterCropLabel: "FILTER BY CROP",
    allCropsOption: "All Commodities (सर्व पिके)",
    filterLocationLabel: "LOCATION / REGION",
    locationPlaceholder: "e.g. Nashik, Amravati, Nagpur",
    sortByLabel: "SORT BY",
    sortNewest: "🕒 Newest Listings First",
    sortPriceHigh: "💰 Price: High to Low",
    sortPriceLow: "🏷️ Price: Low to High",
    refreshBtn: "⚡ Refresh",
    availableDeals: "🌾 Available Harvest Deals",
    autoRefreshPrefix: "🔄 Auto-refreshing in",
    noDealsTitle: "No Active Deals Found",
    noDealsDesc: "No farmer listings match your filter criteria. Try adjusting your crop or location filters.",
    perQtl: "/ quintal",
    estLotValue: "Est. Total Lot Value:",
    locationLabel: "📍 Location:",
    qtyLabel: "⚖️ Quantity:",
    farmerLabel: "👤 Farmer:",
    activeInquiries: "Active Buyer Inquiries",
    contactUnlocked: "✅ CONTACT UNLOCKED",
    callFarmer: "📞 Call",
    interestedBtn: "🤝 I'm Interested",
    connectModalTitle: "🤝 Connect with Farmer",
    cropModal: "Crop:",
    askingPriceModal: "Asking Price:",
    qtyModal: "Quantity:",
    locModal: "Location:",
    businessNameLabel: "🏢 Your Business / Trader Name",
    businessNamePlaceholder: "e.g. Maharashtra Agro Traders",
    phoneLabel: "📞 Your Phone Number",
    phonePlaceholder: "10-digit mobile number",
    unlockBtn: "🔓 Unlock Farmer Contact",
    unlockingBtn: "Unlocking...",
    toastEnterDetails: "⚠️ Please enter your name and phone number.",
    toastUnlocked: "🎉 Farmer contact unlocked! You may now call directly.",
    toastFeedRefreshed: "⚡ Deals feed refreshed",
    toastError: "⚠️ Could not refresh marketplace feed."
  },
  hi: {
    buyerTitle: "कृषिमित्र खरीदार बाजार",
    buyerSubtitle: "सीधी कृषि उपज खरीद और पारदर्शी सौदे",
    farmerView: "🌾 किसान दृश्य",
    bannerTitle: "🤝 सीधा किसान-क्रेता संपर्क",
    bannerDesc: "स्थानीय किसानों से सीधे उचित दामों पर बिना किसी बिचौलिए शुल्क के कृषि उपज खरीदें। तुरंत संपर्क करने के लिए \"मैं रुचि रखता हूँ\" पर क्लिक करें।",
    privacyBadge: "🛡️ गोपनीयता सुरक्षित फ़ीड",
    filterCropLabel: "फसल अनुसार फ़िल्टर",
    allCropsOption: "सभी फसलें (All Crops)",
    filterLocationLabel: "स्थान / क्षेत्र",
    locationPlaceholder: "उदा. नासिक, अमरावती, नागपुर",
    sortByLabel: "क्रमबद्ध करें",
    sortNewest: "🕒 नवीनतम लिस्टिंग पहले",
    sortPriceHigh: "💰 मूल्य: अधिक से कम",
    sortPriceLow: "🏷️ मूल्य: कम से अधिक",
    refreshBtn: "⚡ ताज़ा करें",
    availableDeals: "🌾 उपलब्ध फसल सौदे",
    autoRefreshPrefix: "🔄 स्वतः रीफ्रेश",
    noDealsTitle: "कोई सक्रिय सौदा नहीं मिला",
    noDealsDesc: "आपके फ़िल्टर से मेल खाने वाला कोई किसान लिस्टिंग उपलब्ध नहीं है। कृपया फ़िल्टर बदलें।",
    perQtl: "/ क्विंटल",
    estLotValue: "अनुमानित कुल लॉट मूल्य:",
    locationLabel: "📍 स्थान:",
    qtyLabel: "⚖️ मात्रा:",
    farmerLabel: "👤 किसान:",
    activeInquiries: "सक्रिय खरीदार पूछताछ",
    contactUnlocked: "✅ संपर्क अनलॉक हुआ",
    callFarmer: "📞 कॉल करें",
    interestedBtn: "🤝 मैं रुचि रखता हूँ",
    connectModalTitle: "🤝 किसान से जुड़ें",
    cropModal: "फसल:",
    askingPriceModal: "मांग मूल्य:",
    qtyModal: "मात्रा:",
    locModal: "स्थान:",
    businessNameLabel: "🏢 आपका व्यवसाय / व्यापारी नाम",
    businessNamePlaceholder: "उदा. महाराष्ट्र एग्रो ट्रेडर्स",
    phoneLabel: "📞 आपका मोबाइल नंबर",
    phonePlaceholder: "10 अंकों का मोबाइल नंबर",
    unlockBtn: "🔓 किसान संपर्क अनलॉक करें",
    unlockingBtn: "अनलॉक हो रहा है...",
    toastEnterDetails: "⚠️ कृपया अपना नाम और फ़ोन नंबर दर्ज करें।",
    toastUnlocked: "🎉 किसान का संपर्क अनलॉक हो गया! अब आप सीधे कॉल कर सकते हैं।",
    toastFeedRefreshed: "⚡ बाजार सौदे ताज़ा किए गए",
    toastError: "⚠️ मार्केटप्लेस फ़ीड ताज़ा नहीं हो सका।"
  },
  mr: {
    buyerTitle: "कृषि मित्र खरेदीदार बाजार",
    buyerSubtitle: "थेट शेतमाल खरेदी आणि पारदर्शक व्यवहार",
    farmerView: "🌾 शेतकरी दृश्य",
    bannerTitle: "🤝 थेट शेतकरी-खरेदीदार जोडणी",
    bannerDesc: "स्थानिक शेतकऱ्यांकडून थेट वाजवी दरात कोणतीही दलाली न देता शेतमाल खरेदी करा. थेट संपर्कासाठी \"मी इच्छुक आहे\" वर क्लिक करा.",
    privacyBadge: "🛡️ गोपनीयतेने सुरक्षित फीड",
    filterCropLabel: "पिकानुसार फिल्टर",
    allCropsOption: "सर्व पिके (All Crops)",
    filterLocationLabel: "ठिकाण / परिसर",
    locationPlaceholder: "उदा. नाशिक, अमरावती, नागपूर",
    sortByLabel: "क्रमवारी",
    sortNewest: "🕒 नवीन सूची आधी",
    sortPriceHigh: "💰 दर: जास्त ते कमी",
    sortPriceLow: "🏷️ दर: कमी ते जास्त",
    refreshBtn: "⚡ ताजे करा",
    availableDeals: "🌾 उपलब्ध शेतमाल सौदे",
    autoRefreshPrefix: "🔄 स्वयं-रिफ्रेश",
    noDealsTitle: "कोणतेही सौदे उपलब्ध नाहीत",
    noDealsDesc: "तुमच्या फिल्टर निकषांशी जुळणारी कोणतीही नोंद सापडली नाही. कृपया फिल्टर बदलून पहा.",
    perQtl: "/ क्विंटल",
    estLotValue: "अंदाजे एकूण लॉट किंमत:",
    locationLabel: "📍 ठिकाण:",
    qtyLabel: "⚖️ प्रमाण:",
    farmerLabel: "👤 शेतकरी:",
    activeInquiries: "सक्रिय खरेदीदार चौकशी",
    contactUnlocked: "✅ संपर्क अनलॉक झाला",
    callFarmer: "📞 कॉल करा",
    interestedBtn: "🤝 मी इच्छुक आहे",
    connectModalTitle: "🤝 शेतकऱ्याशी संपर्क साधा",
    cropModal: "पीक:",
    askingPriceModal: "मागणी दर:",
    qtyModal: "प्रमाण:",
    locModal: "ठिकाण:",
    businessNameLabel: "🏢 तुमचा व्यवसाय / व्यापारी नाव",
    businessNamePlaceholder: "उदा. महाराष्ट्र ॲग्रो ट्रेडर्स",
    phoneLabel: "📞 तुमचा फोन नंबर",
    phonePlaceholder: "१० अंकी मोबाईल नंबर",
    unlockBtn: "🔓 शेतकरी संपर्क अनलॉक करा",
    unlockingBtn: "अनलॉक होत आहे...",
    toastEnterDetails: "⚠️ कृपया आपले नाव आणि फोन नंबर प्रविष्ट करा.",
    toastUnlocked: "🎉 शेतकऱ्याचा संपर्क अनलॉक झाला! आता आपण थेट कॉल करू शकता.",
    toastFeedRefreshed: "⚡ सौदे ताजे केले",
    toastError: "⚠️ मार्केटप्लेस फीड ताजे करण्यात अयशस्वी."
  }
};

let currentLang = localStorage.getItem("krishimitra_lang") || "en";

function bt(key) {
  const dict = buyerTranslations[currentLang] || buyerTranslations.en;
  return dict[key] || buyerTranslations.en[key] || key;
}

function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem("krishimitra_lang", lang);

  document.querySelectorAll(".lang-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.lang === lang);
  });

  const dict = buyerTranslations[lang] || buyerTranslations.en;
  document.querySelectorAll("[data-i18n]").forEach(elem => {
    const key = elem.getAttribute("data-i18n");
    if (dict[key]) {
      elem.textContent = dict[key];
    }
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach(elem => {
    const key = elem.getAttribute("data-i18n-placeholder");
    if (dict[key]) {
      elem.placeholder = dict[key];
    }
  });

  renderDealsFeed(activeDeals);
}

// ==========================================
// 2. Fetch Crops for Dropdown Filter
// ==========================================
async function loadCropFilter() {
  try {
    const res = await fetch("/api/crops");
    const data = await res.json();
    if (data.status === "success" && data.crops) {
      const select = document.getElementById("buyerCropFilter");
      if (!select) return;
      select.innerHTML = `<option value="" data-i18n="allCropsOption">${bt("allCropsOption")}</option>`;
      data.crops.forEach(c => {
        select.innerHTML += `<option value="${c.name}">${c.name}</option>`;
      });
    }
  } catch (e) {
    console.warn("Could not load crops for filter:", e);
  }
}

// ==========================================
// 3. Fetch Buyer Deals Feed
// ==========================================
async function fetchBuyerDeals() {
  const cropFilter = document.getElementById("buyerCropFilter") ? document.getElementById("buyerCropFilter").value : "";
  const locationFilter = document.getElementById("buyerLocationFilter") ? document.getElementById("buyerLocationFilter").value.trim() : "";
  const sortBy = document.getElementById("buyerSortFilter") ? document.getElementById("buyerSortFilter").value : "newest";

  const params = new URLSearchParams();
  if (cropFilter) params.append("crop", cropFilter);
  if (locationFilter) params.append("location", locationFilter);
  if (sortBy) params.append("sort", sortBy);

  try {
    const res = await fetch(`/api/deals?${params.toString()}`);
    const data = await res.json();

    if (data.status === "success") {
      activeDeals = data.deals || [];
      renderDealsFeed(activeDeals);
      const countElem = document.getElementById("dealCountDisplay");
      if (countElem) countElem.textContent = activeDeals.length;
    }
  } catch (err) {
    console.error("Buyer feed fetch error:", err);
    showToast(bt("toastError"));
  }
}

// ==========================================
// 4. Render Deals Feed Cards
// ==========================================
function renderDealsFeed(deals) {
  const container = document.getElementById("buyerFeedContainer");
  if (!container) return;

  if (deals.length === 0) {
    container.innerHTML = `
      <div class="card" style="grid-column: 1 / -1; text-align: center; padding: 2.5rem 1rem;">
        <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🔍</div>
        <h3 style="color: var(--primary-dark); font-size: 1.15rem; font-weight: 700;">${bt("noDealsTitle")}</h3>
        <p style="color: var(--text-muted); font-size: 0.88rem; max-width: 400px; margin: 0.5rem auto 1rem;">
          ${bt("noDealsDesc")}
        </p>
      </div>
    `;
    return;
  }

  container.innerHTML = "";

  deals.forEach(deal => {
    const card = document.createElement("div");
    card.className = "buyer-deal-card";

    const isUnlocked = !!unlockedContacts[deal.id];
    const contactInfo = unlockedContacts[deal.id];

    card.innerHTML = `
      <div>
        <!-- Top Metadata Row -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
          <span style="background: var(--primary-bg); color: var(--primary-dark); font-weight: 700; font-size: 0.78rem; padding: 0.25rem 0.65rem; border-radius: var(--radius-full);">
            🌱 ${deal.crop_name}
          </span>
          <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">
            🕒 ${deal.posted_ago}
          </span>
        </div>

        <!-- Asking Price & Deal Value -->
        <div style="margin-bottom: 0.75rem;">
          <div style="font-size: 1.45rem; font-weight: 800; color: var(--primary-dark); line-height: 1.2;">
            ₹${deal.price_per_quintal.toLocaleString()} <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-muted);">${bt("perQtl")}</span>
          </div>
          <div style="font-size: 0.82rem; color: var(--text-muted);">
            ${bt("estLotValue")} <strong style="color: var(--text-main);">₹${deal.total_deal_value.toLocaleString()}</strong>
          </div>
        </div>

        <!-- Details Grid -->
        <div style="background: var(--bg-page); padding: 0.65rem; border-radius: var(--radius-sm); font-size: 0.82rem; margin-bottom: 0.85rem;">
          <div style="margin-bottom: 3px;">${bt("locationLabel")} <strong>${deal.location_name}</strong></div>
          <div style="margin-bottom: 3px;">${bt("qtyLabel")} <strong>${deal.quantity_quintal} Quintals</strong></div>
          <div>${bt("farmerLabel")} <strong>${deal.farmer_name}</strong></div>
        </div>

        <!-- Inquiries Counter -->
        <div style="font-size: 0.78rem; font-weight: 600; color: #0284c7; margin-bottom: 0.85rem;">
          💬 ${deal.inquiry_count} ${bt("activeInquiries")}
        </div>
      </div>

      <!-- Action Section -->
      <div id="action-deal-${deal.id}">
        ${isUnlocked ? `
          <div style="background: #dcfce7; border: 1px solid #86efac; border-radius: var(--radius-sm); padding: 0.65rem; text-align: center;">
            <div style="font-size: 0.75rem; font-weight: 700; color: #166534; margin-bottom: 3px;">${bt("contactUnlocked")}</div>
            <a href="tel:${contactInfo.farmer_phone}" class="btn btn-primary" style="min-height: 36px; padding: 4px 10px; font-size: 0.85rem; width: 100%; display: flex; align-items: center; justify-content: center; gap: 4px;">
              ${bt("callFarmer")} ${contactInfo.farmer_name}: ${contactInfo.farmer_phone}
            </a>
          </div>
        ` : `
          <button class="btn btn-primary" style="font-size: 0.88rem; width: 100%;" onclick="openInquiryModal(${deal.id})">
            ${bt("interestedBtn")}
          </button>
        `}
      </div>
    `;

    container.appendChild(card);
  });
}

// ==========================================
// 5. Inquiry Modal & Contact Unlock
// ==========================================
window.openInquiryModal = function(dealId) {
  const deal = activeDeals.find(d => d.id === dealId);
  if (!deal) return;

  document.getElementById("inquiryDealId").value = dealId;
  const summaryElem = document.getElementById("modalDealSummary");
  summaryElem.innerHTML = `
    <div><strong>${bt("cropModal")}</strong> ${deal.crop_name}</div>
    <div><strong>${bt("askingPriceModal")}</strong> ₹${deal.price_per_quintal.toLocaleString()} / qtl</div>
    <div><strong>${bt("qtyModal")}</strong> ${deal.quantity_quintal} Quintals (Total: ₹${deal.total_deal_value.toLocaleString()})</div>
    <div><strong>${bt("locModal")}</strong> ${deal.location_name} | ${bt("farmerLabel")} ${deal.farmer_name}</div>
  `;

  document.getElementById("inquiryModal").style.display = "flex";
};

function closeModal() {
  document.getElementById("inquiryModal").style.display = "none";
}

async function handleInquirySubmit(e) {
  e.preventDefault();
  const dealId = parseInt(document.getElementById("inquiryDealId").value);
  const buyerName = document.getElementById("buyerNameInput").value.trim();
  const buyerPhone = document.getElementById("buyerPhoneInput").value.trim();
  const btn = document.getElementById("confirmInquiryBtn");

  if (!dealId || !buyerName || !buyerPhone) {
    showToast(bt("toastEnterDetails"));
    return;
  }

  btn.disabled = true;
  btn.textContent = bt("unlockingBtn");

  try {
    const res = await fetch(`/api/deals/${dealId}/inquire`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ buyer_name: buyerName, buyer_phone: buyerPhone })
    });

    const data = await res.json();
    if (data.status === "success") {
      unlockedContacts[dealId] = {
        farmer_name: data.farmer_name,
        farmer_phone: data.farmer_phone
      };
      showToast(bt("toastUnlocked"));
      closeModal();
      renderDealsFeed(activeDeals);
    } else {
      showToast("⚠️ " + (data.message || "Could not register inquiry."));
    }
  } catch (err) {
    console.error("Inquiry registration failed:", err);
    showToast("⚠️ Network error while registering inquiry.");
  } finally {
    btn.disabled = false;
    btn.textContent = bt("unlockBtn");
  }
}

// Toast helper
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
// 6. Auto-Polling Timer
// ==========================================
function startAutoPolling() {
  countdownSec = 15;
  const statusElem = document.getElementById("autoRefreshStatus");

  if (autoRefreshTimer) clearInterval(autoRefreshTimer);

  autoRefreshTimer = setInterval(() => {
    countdownSec--;
    if (statusElem) {
      statusElem.textContent = `${bt("autoRefreshPrefix")} ${countdownSec}s`;
    }
    if (countdownSec <= 0) {
      countdownSec = 15;
      fetchBuyerDeals();
    }
  }, 1000);
}

// ==========================================
// 7. Initialization
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".lang-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const lang = btn.dataset.lang;
      setLanguage(lang);
    });
  });

  setLanguage(currentLang);

  loadCropFilter();
  fetchBuyerDeals();
  startAutoPolling();

  // Filter Listeners
  const cropFilter = document.getElementById("buyerCropFilter");
  if (cropFilter) cropFilter.addEventListener("change", () => fetchBuyerDeals());

  const sortFilter = document.getElementById("buyerSortFilter");
  if (sortFilter) sortFilter.addEventListener("change", () => fetchBuyerDeals());

  const locationFilter = document.getElementById("buyerLocationFilter");
  if (locationFilter) {
    let timeout = null;
    locationFilter.addEventListener("input", () => {
      clearTimeout(timeout);
      timeout = setTimeout(fetchBuyerDeals, 350);
    });
  }

  const refreshBtn = document.getElementById("buyerRefreshBtn");
  if (refreshBtn) refreshBtn.addEventListener("click", () => {
    fetchBuyerDeals();
    countdownSec = 15;
    showToast(bt("toastFeedRefreshed"));
  });

  // Modal Listeners
  const closeModalBtn = document.getElementById("closeModalBtn");
  if (closeModalBtn) closeModalBtn.addEventListener("click", closeModal);

  const inquiryForm = document.getElementById("inquiryForm");
  if (inquiryForm) inquiryForm.addEventListener("submit", handleInquirySubmit);
});
