/**
 * File: admin.js
 * Purpose: Administrative Panel logic for managing crops, mandis, rates, distances, and costs.
 * Features:
 *   - Fetches full admin dataset from GET /api/admin/overview
 *   - CRUD operations on Crops, Mandis, Distances, Rates, and Other Handling Costs
 *   - Dynamic tabs for seamless administration
 *   - Immediate UI feedback via toast notifications
 */

let adminData = null;
const AUTH_TOKEN_KEY = "krishimitra_admin_token";

// Helper to provide Authorization headers for API calls
function getAuthHeaders() {
  const token = localStorage.getItem(AUTH_TOKEN_KEY) || "";
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  };
}

// ==========================================
// 1. Authentication State Check & Login/Logout
// ==========================================
async function checkAdminAuth() {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (!token) {
    showLoginView();
    return;
  }

  try {
    const res = await fetch("/api/admin/check-auth", {
      headers: getAuthHeaders()
    });
    const result = await res.json();
    if (result.status === "success" && result.authenticated) {
      showDashboardView(result.username || "admin");
      loadAdminData();
    } else {
      showLoginView();
    }
  } catch (e) {
    showLoginView();
  }
}

function showLoginView() {
  document.getElementById("adminLoginSection").style.display = "block";
  document.getElementById("adminDashboardSection").style.display = "none";
  document.getElementById("adminUserBadge").style.display = "none";
  document.getElementById("adminLogoutBtn").style.display = "none";
}

function showDashboardView(username) {
  document.getElementById("adminLoginSection").style.display = "none";
  document.getElementById("adminDashboardSection").style.display = "block";
  document.getElementById("adminUserBadge").style.display = "inline-flex";
  document.getElementById("adminUsernameDisplay").textContent = username;
  document.getElementById("adminLogoutBtn").style.display = "inline-flex";
}

async function handleAdminLogin(e) {
  e.preventDefault();
  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value.trim();
  const submitBtn = document.getElementById("loginSubmitBtn");

  if (!username || !password) {
    showToast("⚠️ Please enter username and password.");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Verifying...";

  try {
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();

    if (data.status === "success" && data.token) {
      localStorage.setItem(AUTH_TOKEN_KEY, data.token);
      showToast("✅ Welcome, Administrator!");
      showDashboardView(data.username || username);
      loadAdminData();
    } else {
      showToast("❌ " + (data.message || "Invalid credentials"));
    }
  } catch (err) {
    showToast("⚠️ Authentication service unreachable.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Sign In to Dashboard";
  }
}

function handleAdminLogout() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  showToast("🔒 Logged out of admin settings.");
  showLoginView();
}

// ==========================================
// 2. Load Overview Data (Protected)
// ==========================================
async function loadAdminData() {
  try {
    const res = await fetch("/api/admin/overview", {
      headers: getAuthHeaders()
    });
    if (res.status === 401) {
      showLoginView();
      return;
    }
    const result = await res.json();
    if (result.status === "success") {
      adminData = result.data;
      renderAllAdminSections();
    }
  } catch (err) {
    console.error("Admin data load failed:", err);
    showToast("⚠️ Failed to load administrative records.");
  }
}

// ==========================================
// 2. Render Admin Sections
// ==========================================
function renderAllAdminSections() {
  if (!adminData) return;

  // 1. Transport Rate
  const rateInput = document.getElementById("adminTransportRateInput");
  if (rateInput) {
    rateInput.value = adminData.transport_rate || 0.80;
  }

  // 2. Crops Table
  renderCropsTable(adminData.crops);

  // 3. Mandis Table
  renderMandisTable(adminData.mandis);

  // 4. Distances Table
  renderDistancesTable(adminData.distances, adminData.mandis);

  // 5. Other Costs Table
  renderOtherCostsTable(adminData.other_costs, adminData.mandis);

  // 6. Prices Table
  renderPricesTable(adminData.prices, adminData.crops, adminData.mandis);
}

// Crops
function renderCropsTable(crops) {
  const tbody = document.getElementById("cropsTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  crops.forEach(c => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${c.id}</td>
      <td><strong>${c.name}</strong></td>
      <td>
        <button class="btn btn-outline" style="min-height:32px; padding:2px 8px; font-size:0.85rem; color:#b91c1c; border-color:#fca5a5;" onclick="deleteCrop(${c.id})">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Refresh crop recommendation pills & autocomplete catalog
  loadCropRecommendations("");
}

// Mandis
function renderMandisTable(mandis) {
  const tbody = document.getElementById("mandisTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  mandis.forEach(m => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${m.id}</td>
      <td><strong>${m.name}</strong></td>
      <td>${m.latitude || "N/A"}, ${m.longitude || "N/A"}</td>
      <td>
        <button class="btn btn-outline" style="min-height:32px; padding:2px 8px; font-size:0.85rem; color:#b91c1c; border-color:#fca5a5;" onclick="deleteMandi(${m.id})">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Refresh location recommendation pills & autocomplete catalog
  loadMandiRecommendations("");
}

// Distances
function renderDistancesTable(distances, mandis) {
  const tbody = document.getElementById("distancesTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  distances.forEach(d => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${d.from_name}</td>
      <td>${d.to_name}</td>
      <td><strong>${d.distance_km} km</strong></td>
      <td>
        <button class="btn btn-outline" style="min-height:32px; padding:2px 8px; font-size:0.85rem; color:#b91c1c; border-color:#fca5a5;" onclick="deleteDistance(${d.id})">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Populate Distance Form Selects
  const fromSelect = document.getElementById("distFromSelect");
  const toSelect = document.getElementById("distToSelect");
  if (fromSelect && toSelect) {
    fromSelect.innerHTML = "";
    toSelect.innerHTML = "";
    mandis.forEach(m => {
      fromSelect.innerHTML += `<option value="${m.id}">${m.name}</option>`;
      toSelect.innerHTML += `<option value="${m.id}">${m.name}</option>`;
    });
  }
}

// Other Costs
function renderOtherCostsTable(costs, mandis) {
  const tbody = document.getElementById("costsTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  costs.forEach(c => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${c.mandi_name}</strong></td>
      <td>₹${c.loading}</td>
      <td>₹${c.unloading}</td>
      <td>₹${c.market_charge}</td>
      <td><strong>₹${(c.loading + c.unloading + c.market_charge).toFixed(2)}</strong></td>
    `;
    tbody.appendChild(tr);
  });

  // Populate Cost Mandi Select
  const costMandiSelect = document.getElementById("costMandiSelect");
  if (costMandiSelect) {
    costMandiSelect.innerHTML = "";
    mandis.forEach(m => {
      costMandiSelect.innerHTML += `<option value="${m.id}">${m.name}</option>`;
    });
  }
}

// Prices
function renderPricesTable(prices, crops, mandis) {
  const tbody = document.getElementById("pricesTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  prices.forEach(p => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.crop_name}</td>
      <td>${p.mandi_name}</td>
      <td><strong style="color:var(--primary-dark)">₹${p.price_per_quintal.toLocaleString()}</strong></td>
      <td><small style="color:var(--text-light)">${p.last_updated || "Live"}</small></td>
    `;
    tbody.appendChild(tr);
  });

  // Populate Price Form Selects
  const priceCropSelect = document.getElementById("priceCropSelect");
  const priceMandiSelect = document.getElementById("priceMandiSelect");
  if (priceCropSelect && priceMandiSelect) {
    priceCropSelect.innerHTML = "";
    priceMandiSelect.innerHTML = "";
    crops.forEach(c => {
      priceCropSelect.innerHTML += `<option value="${c.id}">${c.name}</option>`;
    });
    mandis.forEach(m => {
      priceMandiSelect.innerHTML += `<option value="${m.id}">${m.name}</option>`;
    });
  }
}

// ==========================================
// 3. CRUD Action Handlers (Protected with Auth Headers)
// ==========================================

async function handleAddCrop(e) {
  e.preventDefault();
  const name = document.getElementById("newCropName").value.trim();
  if (!name) return;

  const res = await fetch("/api/admin/crops", {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ name })
  });
  if (res.status === 401) { showLoginView(); return; }
  const data = await res.json();
  if (data.status === "success") {
    showToast("✅ Crop added successfully");
    document.getElementById("newCropName").value = "";
    loadAdminData();
  } else {
    showToast("⚠️ " + (data.message || "Failed to add crop"));
  }
}

async function deleteCrop(id) {
  if (!confirm("Are you sure you want to delete this crop?")) return;
  const res = await fetch(`/api/admin/crops/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders()
  });
  if (res.status === 401) { showLoginView(); return; }
  showToast("🗑️ Crop deleted");
  loadAdminData();
}

async function handleAddMandi(e) {
  e.preventDefault();
  const nameInput = document.getElementById("newMandiName");
  const addBtn = document.getElementById("addMandiBtn");
  const name = nameInput.value.trim();
  if (!name) return;

  if (addBtn) {
    addBtn.disabled = true;
    addBtn.textContent = "📍 Geocoding...";
  }
  showToast(`🗺️ Resolving coordinates & calculating distances for ${name}...`);

  try {
    const res = await fetch("/api/admin/mandis", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ name })
    });
    if (res.status === 401) { showLoginView(); return; }
    const data = await res.json();
    if (data.status === "success") {
      showToast(`✅ Added ${name} (${data.latitude}, ${data.longitude}) & linked ${data.distances_linked || 'all'} distances!`);
      nameInput.value = "";
      loadAdminData();
    } else {
      showToast("⚠️ " + (data.message || "Failed to add mandi"));
    }
  } catch (err) {
    console.error("Add mandi error:", err);
    showToast("⚠️ Network error while adding mandi.");
  } finally {
    if (addBtn) {
      addBtn.disabled = false;
      addBtn.textContent = "+ Add Mandi";
    }
  }
}

async function deleteMandi(id) {
  if (!confirm("Are you sure you want to delete this mandi?")) return;
  const res = await fetch(`/api/admin/mandis/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders()
  });
  if (res.status === 401) { showLoginView(); return; }
  showToast("🗑️ Mandi deleted");
  loadAdminData();
}

async function handleUpdateRate(e) {
  e.preventDefault();
  const rate = parseFloat(document.getElementById("adminTransportRateInput").value);
  if (isNaN(rate)) return;

  const res = await fetch("/api/admin/rates", {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ rate })
  });
  if (res.status === 401) { showLoginView(); return; }
  const data = await res.json();
  if (data.status === "success") {
    showToast("✅ Transport rate updated to ₹" + rate + "/km/qtl");
    loadAdminData();
  } else {
    showToast("⚠️ " + (data.message || "Failed to update rate"));
  }
}

async function handleSetDistance(e) {
  e.preventDefault();
  const from_id = document.getElementById("distFromSelect").value;
  const to_id = document.getElementById("distToSelect").value;
  const dist = parseFloat(document.getElementById("distKmInput").value);
  if (isNaN(dist)) return;

  const res = await fetch("/api/admin/distances", {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ from_mandi_id: from_id, to_mandi_id: to_id, distance_km: dist })
  });
  if (res.status === 401) { showLoginView(); return; }
  const data = await res.json();
  if (data.status === "success") {
    showToast("✅ Distance updated successfully");
    document.getElementById("distKmInput").value = "";
    loadAdminData();
  } else {
    showToast("⚠️ " + (data.message || "Failed to update distance"));
  }
}

async function deleteDistance(id) {
  const res = await fetch(`/api/admin/distances/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders()
  });
  if (res.status === 401) { showLoginView(); return; }
  showToast("🗑️ Distance record removed");
  loadAdminData();
}

async function handleUpdateCosts(e) {
  e.preventDefault();
  const mandi_id = document.getElementById("costMandiSelect").value;
  const loading = parseFloat(document.getElementById("costLoadingInput").value) || 0;
  const unloading = parseFloat(document.getElementById("costUnloadingInput").value) || 0;
  const market_charge = parseFloat(document.getElementById("costMarketChargeInput").value) || 0;

  const res = await fetch("/api/admin/costs", {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ mandi_id, loading, unloading, market_charge })
  });
  if (res.status === 401) { showLoginView(); return; }
  const data = await res.json();
  if (data.status === "success") {
    showToast("✅ Handling costs updated successfully");
    loadAdminData();
  } else {
    showToast("⚠️ " + (data.message || "Failed to update costs"));
  }
}

async function handleUpdatePrice(e) {
  e.preventDefault();
  const crop_id = document.getElementById("priceCropSelect").value;
  const mandi_id = document.getElementById("priceMandiSelect").value;
  const price = parseFloat(document.getElementById("pricePerQtlInput").value);
  if (isNaN(price)) return;

  const res = await fetch("/api/admin/prices", {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ crop_id, mandi_id, price_per_quintal: price })
  });
  if (res.status === 401) { showLoginView(); return; }
  const data = await res.json();
  if (data.status === "success") {
    showToast("✅ Price listing updated successfully");
    document.getElementById("pricePerQtlInput").value = "";
    loadAdminData();
  } else {
    showToast("⚠️ " + (data.message || "Failed to update price"));
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
// 4. Tab Switching
// ==========================================
function setupTabs() {
  const tabs = document.querySelectorAll(".admin-tab-btn");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");

      const targetId = tab.dataset.target;
      document.querySelectorAll(".admin-tab-content").forEach(sec => {
        sec.style.display = sec.id === targetId ? "block" : "none";
      });
    });
  });
}

// ==========================================
// 5. Mandi Location Recommendations & Autocomplete
// ==========================================
let mandiRecDebounceTimer = null;

async function loadMandiRecommendations(query = "") {
  try {
    const res = await fetch(`/api/places/recommendations?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    if (data.status === "success") {
      renderMandiRecommendations(data.recommendations || [], query);
    }
  } catch (err) {
    console.error("Failed to load recommendations:", err);
  }
}

function renderMandiRecommendations(recs, query) {
  const datalist = document.getElementById("mandiDatalist");
  const pillsContainer = document.getElementById("mandiQuickPills");
  const dropdown = document.getElementById("mandiSuggestionsDropdown");

  // 1. Update Datalist
  if (datalist) {
    datalist.innerHTML = "";
    recs.forEach(r => {
      const opt = document.createElement("option");
      opt.value = r.name;
      opt.label = `${r.district || 'Maharashtra'} (${r.lat}, ${r.lng})`;
      datalist.appendChild(opt);
    });
  }

  // 2. Update Quick Recommendation Pills (Top un-added suggestions)
  if (pillsContainer && !query) {
    pillsContainer.innerHTML = "";
    if (recs.length === 0) {
      pillsContainer.innerHTML = `<span style="font-size:0.75rem; color:var(--text-muted)">All standard mandis added</span>`;
    } else {
      recs.slice(0, 8).forEach(r => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn btn-outline";
        btn.style.cssText = "min-height:26px; padding:2px 10px; font-size:0.78rem; border-radius:999px; background:#f0fdf4; border-color:#86efac; color:#166534; cursor:pointer; width:auto;";
        btn.innerHTML = `+ <strong>${r.name.split('(')[0].trim()}</strong>`;
        btn.title = `Add ${r.name} (${r.district || 'Maharashtra'})`;
        btn.onclick = () => selectRecommendedMandi(r.name);
        pillsContainer.appendChild(btn);
      });
    }
  }

  // 3. Update Dropdown Box when searching
  if (dropdown) {
    if (!query || recs.length === 0) {
      dropdown.style.display = "none";
      dropdown.innerHTML = "";
      return;
    }

    dropdown.innerHTML = "";
    recs.forEach(r => {
      const item = document.createElement("div");
      item.style.cssText = "padding:9px 14px; cursor:pointer; border-bottom:1px solid #f1f5f9; display:flex; justify-content:space-between; align-items:center; transition:background 0.15s ease;";
      item.innerHTML = `
        <div>
          <div style="font-weight:700; font-size:0.88rem; color:#0f172a;">📍 ${r.name}</div>
          <div style="font-size:0.75rem; color:#64748b;">${r.district ? r.district + ' District, Maharashtra' : 'Maharashtra'}</div>
        </div>
        <span style="font-size:0.75rem; background:#ecfdf5; color:#047857; font-weight:600; padding:2px 8px; border-radius:4px; border:1px solid #a7f3d0;">
          GPS ${r.lat}, ${r.lng}
        </span>
      `;
      item.onmouseover = () => item.style.background = "#f8fafc";
      item.onmouseout = () => item.style.background = "#ffffff";
      item.onmousedown = (e) => {
        e.preventDefault();
        selectRecommendedMandi(r.name);
      };
      dropdown.appendChild(item);
    });
    dropdown.style.display = "block";
  }
}

window.selectRecommendedMandi = function(name) {
  const input = document.getElementById("newMandiName");
  const dropdown = document.getElementById("mandiSuggestionsDropdown");
  if (input) {
    input.value = name;
  }
  if (dropdown) {
    dropdown.style.display = "none";
  }
  // Trigger form submit directly
  const form = document.getElementById("addMandiForm");
  if (form) {
    form.dispatchEvent(new Event("submit", { cancelable: true }));
  }
};

function setupMandiAutocomplete() {
  const input = document.getElementById("newMandiName");
  const dropdown = document.getElementById("mandiSuggestionsDropdown");

  if (!input) return;

  input.addEventListener("input", (e) => {
    const val = e.target.value.trim();
    clearTimeout(mandiRecDebounceTimer);
    mandiRecDebounceTimer = setTimeout(() => {
      loadMandiRecommendations(val);
    }, 120);
  });

  input.addEventListener("focus", () => {
    const val = input.value.trim();
    loadMandiRecommendations(val);
  });

  input.addEventListener("blur", () => {
    setTimeout(() => {
      if (dropdown) dropdown.style.display = "none";
    }, 200);
  });
}

// ==========================================
// 6. Crop Recommendations & Autocomplete
// ==========================================
let cropRecDebounceTimer = null;

async function loadCropRecommendations(query = "") {
  try {
    const res = await fetch(`/api/crops/recommendations?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    if (data.status === "success") {
      renderCropRecommendations(data.recommendations || [], query);
    }
  } catch (err) {
    console.error("Failed to load crop recommendations:", err);
  }
}

function renderCropRecommendations(recs, query) {
  const datalist = document.getElementById("cropDatalist");
  const pillsContainer = document.getElementById("cropQuickPills");
  const dropdown = document.getElementById("cropSuggestionsDropdown");

  // 1. Update Datalist
  if (datalist) {
    datalist.innerHTML = "";
    recs.forEach(r => {
      const opt = document.createElement("option");
      opt.value = r.name;
      opt.label = `${r.category || 'Crop'} (~₹${r.default_price || 5000}/qtl)`;
      datalist.appendChild(opt);
    });
  }

  // 2. Update Quick Recommendation Pills
  if (pillsContainer && !query) {
    pillsContainer.innerHTML = "";
    if (recs.length === 0) {
      pillsContainer.innerHTML = `<span style="font-size:0.75rem; color:var(--text-muted)">All standard crops added</span>`;
    } else {
      recs.slice(0, 8).forEach(r => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn btn-outline";
        btn.style.cssText = "min-height:26px; padding:2px 10px; font-size:0.78rem; border-radius:999px; background:#eff6ff; border-color:#93c5fd; color:#1e40af; cursor:pointer; width:auto;";
        btn.innerHTML = `+ <strong>${r.name.split('/')[0].split('(')[0].trim()}</strong>`;
        btn.title = `Add ${r.name} (${r.category})`;
        btn.onclick = () => selectRecommendedCrop(r.name);
        pillsContainer.appendChild(btn);
      });
    }
  }

  // 3. Update Dropdown Box when searching
  if (dropdown) {
    if (!query || recs.length === 0) {
      dropdown.style.display = "none";
      dropdown.innerHTML = "";
      return;
    }

    dropdown.innerHTML = "";
    recs.forEach(r => {
      const item = document.createElement("div");
      item.style.cssText = "padding:9px 14px; cursor:pointer; border-bottom:1px solid #f1f5f9; display:flex; justify-content:space-between; align-items:center; transition:background 0.15s ease;";
      item.innerHTML = `
        <div>
          <div style="font-weight:700; font-size:0.88rem; color:#0f172a;">🌱 ${r.name}</div>
          <div style="font-size:0.75rem; color:#64748b;">${r.category || 'Agricultural Crop'}</div>
        </div>
        <span style="font-size:0.75rem; background:#eff6ff; color:#1d4ed8; font-weight:600; padding:2px 8px; border-radius:4px; border:1px solid #bfdbfe;">
          Base ~₹${r.default_price || 5000}/qtl
        </span>
      `;
      item.onmouseover = () => item.style.background = "#f8fafc";
      item.onmouseout = () => item.style.background = "#ffffff";
      item.onmousedown = (e) => {
        e.preventDefault();
        selectRecommendedCrop(r.name);
      };
      dropdown.appendChild(item);
    });
    dropdown.style.display = "block";
  }
}

window.selectRecommendedCrop = function(name) {
  const input = document.getElementById("newCropName");
  const dropdown = document.getElementById("cropSuggestionsDropdown");
  if (input) {
    input.value = name;
  }
  if (dropdown) {
    dropdown.style.display = "none";
  }
  const form = document.getElementById("addCropForm");
  if (form) {
    form.dispatchEvent(new Event("submit", { cancelable: true }));
  }
};

function setupCropAutocomplete() {
  const input = document.getElementById("newCropName");
  const dropdown = document.getElementById("cropSuggestionsDropdown");

  if (!input) return;

  input.addEventListener("input", (e) => {
    const val = e.target.value.trim();
    clearTimeout(cropRecDebounceTimer);
    cropRecDebounceTimer = setTimeout(() => {
      loadCropRecommendations(val);
    }, 120);
  });

  input.addEventListener("focus", () => {
    const val = input.value.trim();
    loadCropRecommendations(val);
  });

  input.addEventListener("blur", () => {
    setTimeout(() => {
      if (dropdown) dropdown.style.display = "none";
    }, 200);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupTabs();
  checkAdminAuth();
  setupMandiAutocomplete();
  setupCropAutocomplete();

  // Login & Logout Listeners
  const loginForm = document.getElementById("adminLoginForm");
  if (loginForm) loginForm.addEventListener("submit", handleAdminLogin);

  const logoutBtn = document.getElementById("adminLogoutBtn");
  if (logoutBtn) logoutBtn.addEventListener("click", handleAdminLogout);

  // Attach CRUD form listeners
  const cropForm = document.getElementById("addCropForm");
  if (cropForm) cropForm.addEventListener("submit", handleAddCrop);

  const mandiForm = document.getElementById("addMandiForm");
  if (mandiForm) mandiForm.addEventListener("submit", handleAddMandi);

  const rateForm = document.getElementById("updateRateForm");
  if (rateForm) rateForm.addEventListener("submit", handleUpdateRate);

  const distForm = document.getElementById("setDistanceForm");
  if (distForm) distForm.addEventListener("submit", handleSetDistance);

  const costForm = document.getElementById("updateCostForm");
  if (costForm) costForm.addEventListener("submit", handleUpdateCosts);

  const priceForm = document.getElementById("updatePriceForm");
  if (priceForm) priceForm.addEventListener("submit", handleUpdatePrice);
});
