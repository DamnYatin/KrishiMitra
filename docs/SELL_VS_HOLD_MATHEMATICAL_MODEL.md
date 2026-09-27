# Sell vs. Hold AI Advisory Engine: Mathematical Model & Calculation Specification

## 1. Overview & Objective

The **Sell vs. Hold AI Advisory Engine** (Phase 4 of KrishiMitra) helps farmers make informed, data-backed decisions:
- **Sell Today**: Current market prices yield the maximum net return after logistics.
- **Hold for $t$ Days** (default $t = 7$ days): Expected future market prices will increase enough to outweigh storage costs and physical produce depreciation/spoilage.

---

## 2. Mathematical Formulation

### 2.1 Current Realized Net Return ($\text{Net\_Price}_{\text{current}}$)
The farmer's immediate net price per quintal realized today at candidate mandi $M$ is computed via the existing logistics deductions engine:

$$\text{Logistics\_Cost\_per\_qtl} = \text{Transport\_Cost\_per\_qtl} + \text{Loading} + \text{Unloading} + \text{Market\_Cess}$$

$$\text{Net\_Price}_{\text{current}} = P_{\text{current}} - \text{Logistics\_Cost\_per\_qtl}$$

Where:
- $P_{\text{current}}$: Today's gross listing price per quintal at candidate mandi $M$.
- $\text{Transport\_Cost\_per\_qtl} = \text{Distance\_km} \times \text{Rate\_per\_km\_per\_qtl}$ (default ₹0.80/km/qtl).

---

### 2.2 Future Price Forecasting ($P_t$) — SARIMAX Model
Future listing price $P_t$ ($t \in \{7, 14, 30\}$ days) is predicted using **Seasonal AutoRegressive Integrated Moving Average with eXogenous Regressors (SARIMAX)**:

$$\text{SARIMAX}(p=1, d=1, q=1) \times (P=1, D=1, Q=0, s=7)$$

With exogenous regressors:
- $\text{Rainfall\_Index}$ (precipitation / harvest disruptor)
- $\text{Fuel\_Price\_Index}$ (logistics cost driver)

Forecasts are generated offline in a batch job and stored in `forecast_cache` for sub-millisecond retrieval.

---

### 2.3 Holding Costs & Crop Depreciation

When holding produce for $t$ days:

1. **Storage Cost ($\text{Storage\_Cost}_t$)**:
   $$\text{Storage\_Cost}_t = C_s \times t$$
   - $C_s$: Crop-specific daily storage/warehousing cost in ₹ per quintal per day.

2. **Depreciation & Moisture/Spoilage Loss ($\text{Depreciation\_Loss}_t$)**:
   $$\text{Depreciation\_Loss}_t = \delta \times t$$
   - $\delta$: Crop-specific daily shrinkage, moisture loss, and spoilage rate (fraction per day).

#### Default Crop Parameters Table:
| Crop | Storage Cost ($C_s$ in ₹/qtl/day) | Daily Spoilage Rate ($\delta$) | 7-Day Storage Cost | 7-Day Depreciation Loss |
| :--- | :--- | :--- | :--- | :--- |
| **Cotton** | ₹0.60 | 0.0005 (0.05%/day) | ₹4.20 / qtl | 0.35% |
| **Soybean** | ₹0.50 | 0.0005 (0.05%/day) | ₹3.50 / qtl | 0.35% |
| **Wheat** | ₹0.40 | 0.0003 (0.03%/day) | ₹2.80 / qtl | 0.21% |
| **Onion** | ₹1.50 | 0.0080 (0.80%/day) | ₹10.50 / qtl | 5.60% |
| **Tur / Arhar** | ₹0.50 | 0.0004 (0.04%/day) | ₹3.50 / qtl | 0.28% |
| **Gram / Chana** | ₹0.45 | 0.0004 (0.04%/day) | ₹3.15 / qtl | 0.28% |

---

### 2.4 Expected Net Price After $t$ Days ($\text{Expected\_Net\_Price}_t$)

The realized net price after holding for $t$ days factors in the degraded volume/quality, storage expenses, and logistics costs:

$$\text{Expected\_Net\_Price}_t = \Big[ P_t \times (1 - \text{Depreciation\_Loss}_t) \Big] - \text{Storage\_Cost}_t - \text{Logistics\_Cost\_per\_qtl}$$

---

### 2.5 Projected Gain, Loss Avoidance & Decision Logic

The net monetary gain per quintal from waiting is:

$$\text{Projected\_Gain\_per\_qtl} = \text{Expected\_Net\_Price}_t - \text{Net\_Price}_{\text{current}}$$
$$\text{Projected\_Gain\_Total} = \text{Projected\_Gain\_per\_qtl} \times \text{Quantity\_Quintals}$$

For **SELL** decisions, the loss avoided by selling today instead of holding is:
$$\text{Loss\_Avoided\_per\_qtl} = \max(0, -\text{Projected\_Gain\_per\_qtl})$$
$$\text{Loss\_Avoided\_Total} = \text{Loss\_Avoided\_per\_qtl} \times \text{Quantity\_Quintals}$$

#### Decision & Reason Breakdown:

1. **HOLD (When $\text{Projected\_Gain\_per\_qtl} > \text{MINIMUM\_GAIN\_THRESHOLD}$ [₹15/qtl])**:
   - **Primary Reason**: Forecast predicts produce listing prices in target mandi $M$ will rise from $P_{\text{current}}$ to $P_7$ ($+ \Delta P$/qtl) due to supply tightening.
   - **Cost Buffer**: 7-day holding costs (storage fee ₹$C_s \times 7$ + degradation loss) are comfortably outpaced by the price surge.
   - **Net Profit Gain**: Waiting generates an extra net profit of **+₹$\text{Projected\_Gain\_per\_qtl}$/quintal** (**+₹$\text{Projected\_Gain\_Total}$ total** for harvest).

2. **SELL (When $\text{Projected\_Gain\_per\_qtl} \le \text{MINIMUM\_GAIN\_THRESHOLD}$)**:
   - **Primary Reason**: Future market listing prices in target mandi $M$ are forecasted to drop or remain flat ($P_7 \le P_{\text{current}}$), failing to cover storage and spoilage costs.
   - **Cost Drain**: Holding produce unnecessarily incurs ₹$\text{Storage\_Cost}_7$/qtl in warehousing fees plus physical moisture loss/spoilage.
   - **Protected Earnings / Loss Avoided**: Selling today secures the top immediate net rate of **₹$\text{Net\_Price}_{\text{current}}$/quintal** and avoids an estimated loss of **₹$\text{Loss\_Avoided\_per\_qtl}$/quintal** (**₹$\text{Loss\_Avoided\_Total}$ total** loss avoided).

3. **UNAVAILABLE**:
   Triggered if historical data is insufficient ($< 15$ days) to generate a reliable forecast.

---

## 3. Step-by-Step Calculation Walkthrough

### Example A: Cotton (Upward Trend $\rightarrow$ HOLD)
- **Home Mandi**: Nagpur | **Recommended Mandi**: Amravati (145 km)
- **Quantity**: 10 quintals
- **Today's Gross Price**: ₹7,250 / qtl
- **Logistics Deductions**: ₹116 / qtl $\rightarrow$ $\text{Net\_Price}_{\text{current}} = ₹7,134.00/\text{qtl}$
- **7-Day SARIMAX Forecast ($P_7$)**: ₹7,895.05 / qtl
- **Parameters**: $C_s = ₹0.60/\text{day}$, $\delta = 0.0005/\text{day}$
- **Holding Costs ($t=7$)**:
  - $\text{Storage\_Cost}_7 = 0.60 \times 7 = ₹4.20/\text{qtl}$
  - $\text{Depreciation}_7 = 0.0005 \times 7 = 0.0035$ (0.35%)
- **Computation**:
  $$\text{Degraded Price} = 7,895.05 \times (1 - 0.0035) = ₹7,867.42/\text{qtl}$$
  $$\text{Expected\_Net\_Price}_7 = 7,867.42 - 4.20 - 116.00 = ₹7,747.22/\text{qtl}$$
  $$\text{Projected\_Gain} = 7,747.22 - 7,134.00 = +₹613.22/\text{qtl}$$
  $$\text{Total Gain} = 613.22 \times 10 = +₹6,132.20$$
- **Decision**: **HOLD** (Since $+₹613.22 > ₹15.00$)

---

### Example B: Onion (Perishable & Downward Trend $\rightarrow$ SELL)
- **Home Mandi**: Nagpur (0 km)
- **Quantity**: 10 quintals
- **Today's Gross Price**: ₹1,900 / qtl
- **Logistics & Handling Deductions**: ₹116 / qtl $\rightarrow$ $\text{Net\_Price}_{\text{current}} = ₹1,784.00/\text{qtl}$
- **7-Day SARIMAX Forecast ($P_7$)**: ₹1,843.03 / qtl
- **Parameters**: $C_s = ₹1.50/\text{day}$, $\delta = 0.0080/\text{day}$ (0.8%/day moisture loss)
- **Holding Costs ($t=7$)**:
  - $\text{Storage\_Cost}_7 = 1.50 \times 7 = ₹10.50/\text{qtl}$
  - $\text{Depreciation}_7 = 0.0080 \times 7 = 0.056$ (5.6% loss)
- **Computation**:
  $$\text{Degraded Price} = 1,843.03 \times (1 - 0.056) = ₹1,739.82/\text{qtl}$$
  $$\text{Expected\_Net\_Price}_7 = 1,739.82 - 10.50 - 116.00 = ₹1,613.32/\text{qtl}$$
  $$\text{Projected\_Gain} = 1,613.32 - 1,784.00 = -₹170.68/\text{qtl}$$
- **Decision**: **SELL** (Loss of ₹170.68/qtl by holding; selling now is optimal).

---

## 4. Architectural Summary

```
+-------------------------------------------------------------+
|               Historical Market Dataset                     |
|        (price_history_extended + weather + fuel)            |
+-------------------------------------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|         Offline SARIMAX Forecast Batch Job (t=7,14,30)      |
|             (forecast_service.py / statsmodels)             |
+-------------------------------------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                      forecast_cache                         |
|      (crop_id, mandi_id, horizon_days, predicted_price)     |
+-------------------------------------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                  advisory_engine.py                         |
|  - Queries current net price from Mandi Compare Engine      |
|  - Reads P_t from forecast_cache                            |
|  - Deducts Storage_Cost_t (C_s * t) & Depreciation (δ * t)  |
|  - Evaluates Projected_Gain vs MINIMUM_GAIN_THRESHOLD       |
+-------------------------------------------------------------+
                               |
            +------------------+------------------+
            |                                     |
            v                                     v
+------------------------+             +------------------------+
| GET /api/v1/recommendation |         | POST /api/speak        |
| JSON explanation keys  |             | Multilingual Audio     |
+------------------------+             +------------------------+
```
