/**
 * File: settings.js
 * Purpose: Settings & Logistics Configuration logic for managing crops, mandis, rates, distances, and costs.
 * Features:
 *   - Fetches full settings dataset from GET /api/admin/overview
 *   - CRUD operations on Crops, Mandis, Distances, Rates, and Other Handling Costs
 *   - Dynamic tabs for seamless configuration
 *   - Immediate UI feedback via toast notifications
 */

let adminData = null;

// Helper to provide headers for API calls
function getAuthHeaders() {
  return {
    "Content-Type": "application/json"
  };
}

// ==========================================
// 1. Load Overview Data
// ==========================================
async function loadSettingsData() {
  try {
    const res = await fetch("/api/admin/overview", {
      headers: getAuthHeaders()
    });
    const result = await res.json();
    if (result.status === "success") {
      adminData = result.data;
      renderAllAdminSections();
    }
  } catch (err) {
    console.error("Settings data load failed:", err);
    showToast("⚠️ Failed to load system settings records.");
  }
}

// ==========================================
// 2. Render Settings Sections
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
      <td style="text-align: center;">
        <button class="admin-delete-btn" onclick="deleteCrop(${c.id})">Delete</button>
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
      <td style="text-align: center;">
        <button class="admin-delete-btn" onclick="deleteMandi(${m.id})">Delete</button>
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
      <td style="text-align: center;">
        <button class="admin-delete-btn" onclick="deleteDistance(${d.id})">Delete</button>
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
// 3. CRUD Action Handlers
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
  const data = await res.json();
  if (data.status === "success") {
    showToast("✅ Crop added successfully");
    document.getElementById("newCropName").value = "";
    loadSettingsData();
  } else {
    showToast("⚠️ " + (data.message || "Failed to add crop"));
  }
}

async function deleteCrop(id) {
  if (!confirm("Are you sure you want to delete this crop?")) return;
  await fetch(`/api/admin/crops/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders()
  });
  showToast("🗑️ Crop deleted");
  loadSettingsData();
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
    const data = await res.json();
    if (data.status === "success") {
      showToast(`✅ Added ${name} (${data.latitude}, ${data.longitude}) & linked ${data.distances_linked || 'all'} distances!`);
      nameInput.value = "";
      loadSettingsData();
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
  await fetch(`/api/admin/mandis/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders()
  });
  showToast("🗑️ Mandi deleted");
  loadSettingsData();
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
  const data = await res.json();
  if (data.status === "success") {
    showToast("✅ Transport rate updated to ₹" + rate + "/km/qtl");
    loadSettingsData();
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
  const data = await res.json();
  if (data.status === "success") {
    showToast("✅ Distance updated successfully");
    document.getElementById("distKmInput").value = "";
    loadSettingsData();
  } else {
    showToast("⚠️ " + (data.message || "Failed to update distance"));
  }
}

async function deleteDistance(id) {
  await fetch(`/api/admin/distances/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders()
  });
  showToast("🗑️ Distance record removed");
  loadSettingsData();
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
  const data = await res.json();
  if (data.status === "success") {
    showToast("✅ Handling costs updated successfully");
    loadSettingsData();
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
  const data = await res.json();
  if (data.status === "success") {
    showToast("✅ Active price updated successfully");
    loadSettingsData();
  } else {
    showToast("⚠️ " + (data.message || "Failed to update price"));
  }
}

// ==========================================
// 4. Tab Navigation Logic
// ==========================================
function setupTabs() {
  const tabBtns = document.querySelectorAll(".admin-tab-btn");
  const tabContents = document.querySelectorAll(".admin-tab-content");

  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-target");

      tabBtns.forEach(b => b.classList.remove("active"));
      tabContents.forEach(c => c.style.display = "none");

      btn.classList.add("active");
      const activeContent = document.getElementById(target);
      if (activeContent) {
        activeContent.style.display = "block";
      }
    });
  });
}

// Helper Toast UI
function showToast(message) {
  let container = document.querySelector(".toast-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = "toast-message";
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("fade-out");
    setTimeout(() => toast.remove(), 400);
  }, 3500);
}

// Recommendations and Autocomplete
let mandiRecDebounceTimer = null;
let cropRecDebounceTimer = null;

async function loadMandiRecommendations(query = "", isTyping = false) {
  try {
    const res = await fetch(`/api/places/recommendations?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    if (data.status === "success") {
      renderMandiRecommendations(data.recommendations, query, isTyping);
    }
  } catch (err) {
    console.warn("Failed to load mandi recommendations:", err);
  }
}

function renderMandiRecommendations(recs, query = "", isTyping = false) {
  const pillsContainer = document.getElementById("mandiQuickPills");
  const datalist = document.getElementById("mandiDatalist");
  const dropdown = document.getElementById("mandiSuggestionsDropdown");

  if (datalist) {
    datalist.innerHTML = recs.map(r => `<option value="${r.name}">${r.name} (${r.district || ''})</option>`).join("");
  }

  if (pillsContainer) {
    pillsContainer.innerHTML = "";
    const unadded = recs.filter(r => !r.already_added).slice(0, 8);
    if (unadded.length === 0) {
      pillsContainer.innerHTML = `<span style="font-size: 0.78rem; color: var(--text-light); font-style: italic;">All popular mandis added</span>`;
    } else {
      unadded.forEach(r => {
        const cleanName = r.name.replace(/\(.*?\)/g, "").split("/")[0].trim();
        const pill = document.createElement("button");
        pill.type = "button";
        pill.className = "rec-mandi-pill";
        pill.innerHTML = `+ ${cleanName}`;
        pill.onclick = () => selectRecommendedMandi(r.name);
        pillsContainer.appendChild(pill);
      });
    }
  }

  if (dropdown) {
    const trimmedQuery = (query || "").trim();
    if (!isTyping || !trimmedQuery || !recs || recs.length === 0) {
      dropdown.style.display = "none";
      dropdown.innerHTML = "";
      return;
    }
    dropdown.innerHTML = "";
    recs.slice(0, 6).forEach(r => {
      const item = document.createElement("div");
      item.style.cssText = "padding: 0.6rem 0.85rem; border-bottom: 1px solid #f1f5f9; cursor: pointer; display: flex; justify-content: space-between; align-items: center;";
      item.innerHTML = `
        <div>
          <strong>🏛️ ${r.name}</strong>
          <span style="font-size:0.75rem; color:var(--text-light); margin-left:6px;">${r.district || ''}</span>
        </div>
        ${r.already_added ? '<span style="font-size:0.72rem; color:var(--primary); font-weight:700;">✓ Added</span>' : '<span style="font-size:0.72rem; background:var(--primary-subtle); color:var(--primary-dark); padding:2px 6px; border-radius:4px; font-weight:700;">+ Add</span>'}
      `;
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
    if (!val) {
      if (dropdown) {
        dropdown.style.display = "none";
        dropdown.innerHTML = "";
      }
      return;
    }
    mandiRecDebounceTimer = setTimeout(() => {
      loadMandiRecommendations(val, true);
    }, 120);
  });

  input.addEventListener("blur", () => {
    setTimeout(() => {
      if (dropdown) dropdown.style.display = "none";
    }, 200);
  });
}

async function loadCropRecommendations(query = "", isTyping = false) {
  try {
    const res = await fetch(`/api/crops/recommendations?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    if (data.status === "success") {
      renderCropRecommendations(data.recommendations, query, isTyping);
    }
  } catch (err) {
    console.warn("Failed to load crop recommendations:", err);
  }
}

function renderCropRecommendations(recs, query = "", isTyping = false) {
  const pillsContainer = document.getElementById("cropQuickPills");
  const datalist = document.getElementById("cropDatalist");
  const dropdown = document.getElementById("cropSuggestionsDropdown");

  if (datalist) {
    datalist.innerHTML = recs.map(r => `<option value="${r.name}">${r.name} (${r.category || ''})</option>`).join("");
  }

  if (pillsContainer) {
    pillsContainer.innerHTML = "";
    const unadded = recs.filter(r => !r.already_added).slice(0, 8);
    if (unadded.length === 0) {
      pillsContainer.innerHTML = `<span style="font-size: 0.78rem; color: var(--text-light); font-style: italic;">All popular crops added</span>`;
    } else {
      unadded.forEach(r => {
        const cleanName = r.name.replace(/\(.*?\)/g, "").split("/")[0].trim();
        const pill = document.createElement("button");
        pill.type = "button";
        pill.className = "rec-crop-pill";
        pill.innerHTML = `+ ${cleanName}`;
        pill.onclick = () => selectRecommendedCrop(r.name);
        pillsContainer.appendChild(pill);
      });
    }
  }

  if (dropdown) {
    const trimmedQuery = (query || "").trim();
    if (!isTyping || !trimmedQuery || !recs || recs.length === 0) {
      dropdown.style.display = "none";
      dropdown.innerHTML = "";
      return;
    }
    dropdown.innerHTML = "";
    recs.slice(0, 6).forEach(r => {
      const item = document.createElement("div");
      item.style.cssText = "padding: 0.6rem 0.85rem; border-bottom: 1px solid #f1f5f9; cursor: pointer; display: flex; justify-content: space-between; align-items: center;";
      item.innerHTML = `
        <div>
          <strong>🌱 ${r.name}</strong>
          <span style="font-size:0.75rem; color:var(--text-light); margin-left:6px;">${r.category || ''}</span>
        </div>
        ${r.already_added ? '<span style="font-size:0.72rem; color:var(--primary); font-weight:700;">✓ Added</span>' : '<span style="font-size:0.72rem; background:var(--primary-subtle); color:var(--primary-dark); padding:2px 6px; border-radius:4px; font-weight:700;">+ Add</span>'}
      `;
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
    if (!val) {
      if (dropdown) {
        dropdown.style.display = "none";
        dropdown.innerHTML = "";
      }
      return;
    }
    cropRecDebounceTimer = setTimeout(() => {
      loadCropRecommendations(val, true);
    }, 120);
  });

  input.addEventListener("blur", () => {
    setTimeout(() => {
      if (dropdown) dropdown.style.display = "none";
    }, 200);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupTabs();
  loadSettingsData();
  setupMandiAutocomplete();
  setupCropAutocomplete();

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

  // Close suggestions if clicked outside
  document.addEventListener("click", (e) => {
    const cropDropdown = document.getElementById("cropSuggestionsDropdown");
    const cropInput = document.getElementById("newCropName");
    if (cropDropdown && cropInput && !cropInput.contains(e.target) && !cropDropdown.contains(e.target)) {
      cropDropdown.style.display = "none";
    }

    const mandiDropdown = document.getElementById("mandiSuggestionsDropdown");
    const mandiInput = document.getElementById("newMandiName");
    if (mandiDropdown && mandiInput && !mandiInput.contains(e.target) && !mandiDropdown.contains(e.target)) {
      mandiDropdown.style.display = "none";
    }
  });
});
