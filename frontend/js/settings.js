/**
 * File: settings.js
 * Purpose: Settings & Logistics Configuration logic for managing crops, mandis, rates, distances, and costs.
 * Features:
 *   - Multilingual support (English, Hindi, Marathi)
 *   - Dropdown selection for popular Indian & Maharashtra crops and mandis in all 3 languages
 *   - Fetches full settings dataset from GET /api/admin/overview
 *   - CRUD operations on Crops, Mandis, Distances, Rates, and Other Handling Costs
 *   - Dynamic tabs for seamless configuration
 *   - Immediate UI feedback via toast notifications
 */

let adminData = null;

// ==========================================
// 1. Catalogs with Multilingual Names
// ==========================================
const CROP_CATALOG = [
  { name: "Maize / Corn", en: "Maize / Corn (मक्का / मका)", hi: "मक्का (Maize)", mr: "मका (Maize)", aliases: ["maize", "maze", "makka", "maka", "corn", "bhutta", "makai", "makkai"] },
  { name: "Cotton", en: "Cotton (कपास / कापूस)", hi: "कपास (Cotton)", mr: "कापूस (Cotton)", aliases: ["cotton", "kapas", "kapaas", "kapus", "rooi", "rui"] },
  { name: "Soybean", en: "Soybean (सोयाबीन)", hi: "सोयाबीन (Soybean)", mr: "सोयाबीन (Soybean)", aliases: ["soybean", "soyabean", "soya", "soya bean"] },
  { name: "Wheat", en: "Wheat (गेहूं / गहू)", hi: "गेहूं (Wheat)", mr: "गहू (Wheat)", aliases: ["wheat", "gehu", "gehun", "gahu", "gehoon", "kanak"] },
  { name: "Groundnut / Peanut", en: "Groundnut (मूंगफली / भुईमूग)", hi: "मूंगफली (Groundnut)", mr: "भुईमूग (Groundnut)", aliases: ["groundnut", "peanut", "mungfali", "moongfali", "bhuimug", "bhuyimug", "singdana", "shengdana"] },
  { name: "Jowar / Sorghum", en: "Jowar (ज्वार / ज्वारी)", hi: "ज्वार (Jowar)", mr: "ज्वारी (Jowar)", aliases: ["jowar", "sorghum", "jwari", "jowari", "jondhala", "juar"] },
  { name: "Bajra / Pearl Millet", en: "Bajra (बाजरा / बाजरी)", hi: "बाजरा (Bajra)", mr: "बाजरी (Bajra)", aliases: ["bajra", "pearl millet", "bajri", "sajje"] },
  { name: "Paddy / Rice", en: "Paddy / Rice (धान / भात)", hi: "धान / चावल (Paddy)", mr: "भात / तांदूळ (Paddy)", aliases: ["paddy", "rice", "dhan", "chawal", "bhaat", "bhat", "tandool", "tandul"] },
  { name: "Green Gram / Moong", en: "Green Gram / Moong (मूंग / मूग)", hi: "मूंग (Moong)", mr: "मूग (Moong)", aliases: ["moong", "green gram", "mung", "mug", "moog", "moong dal", "mung dal"] },
  { name: "Black Gram / Urad", en: "Black Gram / Urad (उड़द / उडीद)", hi: "उड़द (Urad)", mr: "उडीद (Urad)", aliases: ["urad", "black gram", "udid", "udad", "urad dal", "mash"] },
  { name: "Tur / Arhar", en: "Tur / Arhar (तूर / अरहर)", hi: "तूर / अरहर (Tur)", mr: "तूर (Tur)", aliases: ["tur", "arhar", "toor", "red gram", "pigeon pea", "tuver", "arhar dal"] },
  { name: "Gram / Chana", en: "Gram / Chana (चना / हरभरा)", hi: "चना (Chana)", mr: "हरभरा (Chana)", aliases: ["chana", "gram", "channa", "chickpea", "harbhara", "harbara", "bengal gram"] },
  { name: "Onion", en: "Onion (प्याज / कांदा)", hi: "प्याज (Onion)", mr: "कांदा (Onion)", aliases: ["onion", "pyaz", "pyaaz", "kanda", "kaanda", "dungri", "pyaj"] },
  { name: "Sunflower", en: "Sunflower (सूरजमुखी / सूर्यफूल)", hi: "सूरजमुखी (Sunflower)", mr: "सूर्यफूल (Sunflower)", aliases: ["sunflower", "surajmukhi", "suryaphul", "suryaphool", "suraj mukhi"] },
  { name: "Sesame / Til", en: "Sesame / Til (तिल / तीळ)", hi: "तिल (Til)", mr: "तीळ (Til)", aliases: ["til", "sesame", "teel", "gingelly", "tila"] },
  { name: "Mustard", en: "Mustard (सरसों / मोहरी)", hi: "सरसों (Mustard)", mr: "मोहरी (Mustard)", aliases: ["mustard", "sarson", "sarso", "mohari", "rai"] },
  { name: "Sugarcane", en: "Sugarcane (गन्ना / ऊस)", hi: "गन्ना (Sugarcane)", mr: "ऊस (Sugarcane)", aliases: ["sugarcane", "ganna", "us", "oos", "ikhu"] },
  { name: "Turmeric", en: "Turmeric (हल्दी / हळद)", hi: "हल्दी (Turmeric)", mr: "हळद (Turmeric)", aliases: ["turmeric", "haldi", "halad", "hardar"] },
  { name: "Ginger", en: "Ginger (अदरक / आले)", hi: "अदरक (Ginger)", mr: "आले (Ginger)", aliases: ["ginger", "adrak", "ale", "aadrak", "aale"] },
  { name: "Chilli / Mirchi", en: "Chilli / Mirchi (मिर्च / मिरची)", hi: "मिर्च (Chilli)", mr: "मिरची (Chilli)", aliases: ["chilli", "chili", "mirchi", "mirch", "lal mirch", "tamda"] },
  { name: "Garlic", en: "Garlic (लहसुन / लसूण)", hi: "लहसुन (Garlic)", mr: "लसूण (Garlic)", aliases: ["garlic", "lasun", "lahsun", "lehsun", "lahsoon"] },
  { name: "Potato", en: "Potato (आलू / बटाटा)", hi: "आलू (Potato)", mr: "बटाटा (Potato)", aliases: ["potato", "aloo", "alu", "batata", "aalu"] },
  { name: "Tomato", en: "Tomato (टमाटर / टोमॅटो)", hi: "टमाटर (Tomato)", mr: "टोमॅटो (Tomato)", aliases: ["tomato", "tamatar", "tamater", "tometo"] },
  { name: "Pomegranate", en: "Pomegranate (अनार / डाळिंब)", hi: "अनार (Pomegranate)", mr: "डाळिंब (Pomegranate)", aliases: ["pomegranate", "anar", "dalimb", "anaar", "dalimba"] },
  { name: "Orange / Santra", en: "Orange (संतरा / संत्री)", hi: "संतरा (Orange)", mr: "संत्री (Orange)", aliases: ["orange", "santra", "santri", "nagpur santra", "mosambi"] },
  { name: "Banana", en: "Banana (केला / केळी)", hi: "केला (Banana)", mr: "केळी (Banana)", aliases: ["banana", "kela", "keli", "kele"] },
  { name: "Grapes", en: "Grapes (अंगूर / द्राक्षे)", hi: "अंगूर (Grapes)", mr: "द्राक्षे (Grapes)", aliases: ["grapes", "angur", "angoor", "draksh", "draksha"] },
  { name: "Coriander", en: "Coriander (धनिया / कोथिंबीर)", hi: "धनिया (Coriander)", mr: "कोथिंबीर (Coriander)", aliases: ["coriander", "dhaniya", "dhania", "kothimbir", "kothmir"] }
];

const MANDI_CATALOG = [
  { name: "Nagpur", en: "Nagpur (नागपुर / नागपूर)", hi: "नागपुर (Nagpur)", mr: "नागपूर (Nagpur)" },
  { name: "Amravati", en: "Amravati (अमरावती)", hi: "अमरावती (Amravati)", mr: "अमरावती (Amravati)" },
  { name: "Wardha", en: "Wardha (वर्धा)", hi: "वर्धा (Wardha)", mr: "वर्धा (Wardha)" },
  { name: "Yavatmal", en: "Yavatmal (यवतमाल / यवतमाळ)", hi: "यवतमाल (Yavatmal)", mr: "यवतमाळ (Yavatmal)" },
  { name: "Akola", en: "Akola (अकोला)", hi: "अकोला (Akola)", mr: "अकोला (Akola)" },
  { name: "Chandrapur", en: "Chandrapur (चंद्रपुर / चंद्रपूर)", hi: "चंद्रपुर (Chandrapur)", mr: "चंद्रपूर (Chandrapur)" },
  { name: "Buldhana", en: "Buldhana (बुलढाणा)", hi: "बुलढाणा (Buldhana)", mr: "बुलढाणा (Buldhana)" },
  { name: "Washim", en: "Washim (वाशिम / वाशीम)", hi: "वाशिम (Washim)", mr: "वाशीम (Washim)" },
  { name: "Gondia", en: "Gondia (गोंदिया)", hi: "गोंदिया (Gondia)", mr: "गोंदिया (Gondia)" },
  { name: "Bhandara", en: "Bhandara (भंडारा)", hi: "भंडारा (Bhandara)", mr: "भंडारा (Bhandara)" },
  { name: "Gadchiroli", en: "Gadchiroli (गडचिरोली)", hi: "गडचिरोली (Gadchiroli)", mr: "गडचिरोली (Gadchiroli)" },
  { name: "Hingoli", en: "Hingoli (हिंगोली)", hi: "हिंगोली (Hingoli)", mr: "हिंगोली (Hingoli)" },
  { name: "Nanded", en: "Nanded (नांदेड़ / नांदेड)", hi: "नांदेड़ (Nanded)", mr: "नांदेड (Nanded)" },
  { name: "Parbhani", en: "Parbhani (परभणी)", hi: "परभणी (Parbhani)", mr: "परभणी (Parbhani)" },
  { name: "Jalna", en: "Jalna (जालना)", hi: "जालना (Jalna)", mr: "जालना (Jalna)" },
  { name: "Chhatrapati Sambhajinagar", en: "Chhatrapati Sambhajinagar (छत्रपती संभाजीनगर)", hi: "छत्रपति संभाजीनगर (Chhatrapati Sambhajinagar)", mr: "छत्रपती संभाजीनगर (Chhatrapati Sambhajinagar)" },
  { name: "Latur", en: "Latur (लातूर)", hi: "लातूर (Latur)", mr: "लातूर (Latur)" },
  { name: "Dharashiv", en: "Dharashiv (धाराशिव)", hi: "धाराशिव (Dharashiv)", mr: "धाराशिव (Dharashiv)" },
  { name: "Beed", en: "Beed (बीड)", hi: "बीड (Beed)", mr: "बीड (Beed)" },
  { name: "Jalgaon", en: "Jalgaon (जलगांव / जळगाव)", hi: "जलगांव (Jalgaon)", mr: "जळगाव (Jalgaon)" },
  { name: "Dhule", en: "Dhule (धुले / धुळे)", hi: "धुले (Dhule)", mr: "धुळे (Dhule)" },
  { name: "Nandurbar", en: "Nandurbar (नंदुरबार)", hi: "नंदुरबार (Nandurbar)", mr: "नंदुरबार (Nandurbar)" },
  { name: "Nashik", en: "Nashik (नासिक / नाशिक)", hi: "नासिक (Nashik)", mr: "नाशिक (Nashik)" },
  { name: "Lasalgaon", en: "Lasalgaon (लासलगांव / लासलगाव)", hi: "लासलगांव (Lasalgaon)", mr: "लासलगाव (Lasalgaon)" },
  { name: "Ahmednagar", en: "Ahmednagar (अहमदनगर / अहिल्यानगर)", hi: "अहमदनगर (Ahmednagar)", mr: "अहिल्यानगर / अहमदनगर (Ahmednagar)" },
  { name: "Pune", en: "Pune (पुणे)", hi: "पुणे (Pune)", mr: "पुणे (Pune)" },
  { name: "Baramati", en: "Baramati (बारामती)", hi: "बारामती (Baramati)", mr: "बारामती (Baramati)" },
  { name: "Solapur", en: "Solapur (सोलापूर)", hi: "सोलापूर (Solapur)", mr: "सोलापूर (Solapur)" },
  { name: "Satara", en: "Satara (सातारा)", hi: "सातारा (Satara)", mr: "सातारा (Satara)" },
  { name: "Sangli", en: "Sangli (सांगली)", hi: "सांगली (Sangli)", mr: "सांगली (Sangli)" },
  { name: "Kolhapur", en: "Kolhapur (कोल्हापुर / कोल्हापूर)", hi: "कोल्हापुर (Kolhapur)", mr: "कोल्हापूर (Kolhapur)" }
];

// ==========================================
// 2. Multilingual Localization Dictionary
// ==========================================
const settingsTranslations = {
  en: {
    appTitle: "KrishiMitra",
    appSubtitle: "Master Data & Logistics Configuration",
    farmerView: "🌾 Farmer View",
    tabRate: "🚛 Transport Rate",
    tabCrops: "🌱 Crops",
    tabMandis: "🏛️ Mandis",
    tabDistances: "📏 Distances",
    tabCosts: "📦 Handling Costs",
    tabPrices: "🏷️ Live Prices",
    
    // Tab 1 Rate
    rateTitle: "🚛 Baseline Transport Freight Rate",
    rateDesc: "Sets the per-kilometer, per-quintal freight rate used by the Transport Cost Calculator.",
    rateLabel: "Rate (₹ / km / quintal)",
    saveRateBtn: "Save Rate",
    
    // Tab 2 Crops
    cropsTitle: "🌱 Manage Crops",
    selectCropOption: "-- Select Crop from Catalog --",
    cropPlaceholder: "Or type crop name (e.g. Maize / मक्का)",
    addCropBtn: "+ Add Crop",
    recToAdd: "Recommended to Add:",
    thId: "ID",
    thCropName: "Crop Name",
    thAction: "Action",
    deleteBtn: "Delete",
    
    // Tab 3 Mandis
    mandisTitle: "🏛️ Manage Mandis (APMCs)",
    selectMandiOption: "-- Select Mandi from Catalog --",
    mandiPlaceholder: "Or type mandi name (e.g. Yavatmal / यवतमाळ)",
    addMandiBtn: "+ Add Mandi",
    geocodingBtn: "📍 Geocoding...",
    mandiNote: "💡 Coordinates (Lat, Lng) and distances to Nagpur & other markets are automatically resolved via Google Maps Geocoding & Distance Matrix API.",
    thMandiName: "Mandi Name",
    thCoords: "Coordinates (Lat, Lng)",
    
    // Tab 4 Distances
    distTitle: "📏 Inter-Mandi Distances",
    distKmPlaceholder: "Distance (km)",
    setDistBtn: "Set Distance",
    thFromMandi: "From Mandi",
    thToMandi: "To Mandi",
    thDistance: "Distance",
    
    // Tab 5 Handling Costs
    costsTitle: "📦 Mandi Handling & Statutory Fees",
    loadingPlaceholder: "Loading (₹)",
    unloadingPlaceholder: "Unloading (₹)",
    marketFeePlaceholder: "Market Fee (₹)",
    saveFeesBtn: "Save Fees",
    thMandi: "Mandi",
    thLoading: "Loading",
    thUnloading: "Unloading",
    thMarketFee: "Market Fee",
    thTotalOther: "Total Other / qtl",
    
    // Tab 6 Prices
    pricesTitle: "🏷️ Override Active Mandi Prices",
    pricePlaceholder: "Price (₹/qtl)",
    updatePriceBtn: "Update Price",
    thPricePerQtl: "Price / Quintal",
    thLastUpdated: "Last Updated",
    
    // Common
    addedBadge: "✓ Added",
    addBadge: "+ Add",
    allAdded: "All popular items added",
    confirmDeleteCrop: "Are you sure you want to delete this crop?",
    confirmDeleteMandi: "Are you sure you want to delete this mandi?",
    cropDeleted: "🗑️ Crop deleted",
    mandiDeleted: "🗑️ Mandi deleted",
    distDeleted: "🗑️ Distance record removed",
    rateUpdated: "✅ Transport rate updated to ₹{rate}/km/qtl",
    distUpdated: "✅ Distance updated successfully",
    costsUpdated: "✅ Handling costs updated successfully",
    priceUpdated: "✅ Active price updated successfully",
    cropAdded: "✅ Crop added successfully",
    failedLoad: "⚠️ Failed to load system settings records."
  },
  hi: {
    appTitle: "कृषिमित्र",
    appSubtitle: "मास्टर डेटा और लॉजिस्टिक्स सेटिंग्स",
    farmerView: "🌾 किसान दृश्य",
    tabRate: "🚛 परिवहन दर",
    tabCrops: "🌱 फसलें",
    tabMandis: "🏛️ मंडियां",
    tabDistances: "📏 दूरियां",
    tabCosts: "📦 हैंडलिंग खर्च",
    tabPrices: "🏷️ लाइव भाव",
    
    // Tab 1 Rate
    rateTitle: "🚛 आधारभूत परिवहन मालभाड़ा दर",
    rateDesc: "परिवहन लागत गणक द्वारा उपयोग की जाने वाली प्रति किलोमीटर, प्रति क्विंटल माल ढुलाई दर निर्धारित करता है।",
    rateLabel: "दर (₹ / किमी / क्विंटल)",
    saveRateBtn: "दर सहेजें",
    
    // Tab 2 Crops
    cropsTitle: "🌱 फसलें प्रबंधित करें",
    selectCropOption: "-- सूची में से फसल चुनें --",
    cropPlaceholder: "या फसल का नाम लिखें (उदा. मक्का / Maize)",
    addCropBtn: "+ फसल जोड़ें",
    recToAdd: "जोड़ने हेतु सुझाई गई फसलें:",
    thId: "आईडी",
    thCropName: "फसल का नाम",
    thAction: "कार्रवाई",
    deleteBtn: "हटाएं",
    
    // Tab 3 Mandis
    mandisTitle: "🏛️ मंडियां (APMC) प्रबंधित करें",
    selectMandiOption: "-- सूची में से मंडी चुनें --",
    mandiPlaceholder: "या मंडी का नाम लिखें (उदा. यवतमाल / Yavatmal)",
    addMandiBtn: "+ मंडी जोड़ें",
    geocodingBtn: "📍 जियोकोडिंग...",
    mandiNote: "💡 निर्देशांक (अक्षांश, देशांतर) एवं नागपुर व अन्य मंडियों की दूरियां गूगल मैप्स द्वारा स्वतः निर्धारित होती हैं।",
    thMandiName: "मंडी का नाम",
    thCoords: "निर्देशांक (Lat, Lng)",
    
    // Tab 4 Distances
    distTitle: "📏 मंडियों के बीच की दूरियां",
    distKmPlaceholder: "दूरी (किमी)",
    setDistBtn: "दूरी निर्धारित करें",
    thFromMandi: "प्रारंभिक मंडी",
    thToMandi: "गंतव्य मंडी",
    thDistance: "दूरी",
    
    // Tab 5 Handling Costs
    costsTitle: "📦 मंडी हमाली और वैधानिक शुल्क",
    loadingPlaceholder: "लोडिंग/तुलाई (₹)",
    unloadingPlaceholder: "उतराई (₹)",
    marketFeePlaceholder: "मंडी शुल्क (₹)",
    saveFeesBtn: "शुल्क सहेजें",
    thMandi: "मंडी",
    thLoading: "लोडिंग",
    thUnloading: "उतराई",
    thMarketFee: "मंडी शुल्क",
    thTotalOther: "कुल अन्य खर्च / क्विंटल",
    
    // Tab 6 Prices
    pricesTitle: "🏷️ सक्रिय मंडी भाव अद्यतित करें",
    pricePlaceholder: "भाव (₹/क्विंटल)",
    updatePriceBtn: "भाव अपडेट करें",
    thPricePerQtl: "भाव / क्विंटल",
    thLastUpdated: "अंतिम अपडेट",
    
    // Common
    addedBadge: "✓ जोड़ा गया",
    addBadge: "+ जोड़ें",
    allAdded: "सभी प्रमुख आइटम पहले से जोड़े जा चुके हैं",
    confirmDeleteCrop: "क्या आप वाकई इस फसल को हटाना चाहते हैं?",
    confirmDeleteMandi: "क्या आप वाकई इस मंडी को हटाना चाहते हैं?",
    cropDeleted: "🗑️ फसल हटा दी गई",
    mandiDeleted: "🗑️ मंडी हटा दी गई",
    distDeleted: "🗑️ दूरी रिकॉर्ड हटा दिया गया",
    rateUpdated: "✅ परिवहन दर ₹{rate}/किमी/क्विंटल पर अपडेट की गई",
    distUpdated: "✅ दूरी सफलतापूर्वक अपडेट की गई",
    costsUpdated: "✅ हैंडलिंग खर्च सफलतापूर्वक अपडेट किए गए",
    priceUpdated: "✅ सक्रिय भाव सफलतापूर्वक अपडेट किया गया",
    cropAdded: "✅ फसल सफलतापूर्वक जोड़ी गई",
    failedLoad: "⚠️ सिस्टम सेटिंग्स लोड करने में विफल।"
  },
  mr: {
    appTitle: "कृषि मित्र",
    appSubtitle: "मास्टर डेटा आणि वाहतूक व्यवस्थापन",
    farmerView: "🌾 शेतकरी दृश्य",
    tabRate: "🚛 वाहतूक दर",
    tabCrops: "🌱 पिके",
    tabMandis: "🏛️ बाजारपेठा",
    tabDistances: "📏 अंतर",
    tabCosts: "📦 हमाली/इतर खर्च",
    tabPrices: "🏷️ थेट भाव",
    
    // Tab 1 Rate
    rateTitle: "🚛 मूलभूत वाहतूक मालवाहतूक दर",
    rateDesc: "वाहतूक खर्च गणकाद्वारे वापरला जाणारा प्रति किलोमीटर, प्रति क्विंटल मालवाहतूक दर सेट करतो.",
    rateLabel: "दर (₹ / किमी / क्विंटल)",
    saveRateBtn: "दर जतन करा",
    
    // Tab 2 Crops
    cropsTitle: "🌱 पिके व्यवस्थापित करा",
    selectCropOption: "-- यादीतून पीक निवडा --",
    cropPlaceholder: "किंवा पिकाचे नाव लिहा (उदा. मका / Maize)",
    addCropBtn: "+ पीक जोडा",
    recToAdd: "जोडण्यासाठी शिफारसी:",
    thId: "आयडी",
    thCropName: "पिकाचे नाव",
    thAction: "कृती",
    deleteBtn: "हटवा",
    
    // Tab 3 Mandis
    mandisTitle: "🏛️ बाजारपेठा (कृषी उत्पन्न बाजार समित्या) व्यवस्थापित करा",
    selectMandiOption: "-- यादीतून बाजारपेठ निवडा --",
    mandiPlaceholder: "किंवा बाजारपेठेचे नाव लिहा (उदा. यवतमाळ / Yavatmal)",
    addMandiBtn: "+ बाजारपेठ जोडा",
    geocodingBtn: "📍 जिओकोडिंग...",
    mandiNote: "💡 अक्षांश, रेखांश आणि नागपूर व इतर बाजारपेठांमधील अंतर गुगल मॅप्सद्वारे आपोआप निश्चित केले जाते.",
    thMandiName: "बाजारपेठेचे नाव",
    thCoords: "निर्देशांक (Lat, Lng)",
    
    // Tab 4 Distances
    distTitle: "📏 बाजारपेठांमधील अंतर",
    distKmPlaceholder: "अंतर (किमी)",
    setDistBtn: "अंतर सेट करा",
    thFromMandi: "मूळ बाजारपेठ",
    thToMandi: "गंतव्य बाजारपेठ",
    thDistance: "अंतर",
    
    // Tab 5 Handling Costs
    costsTitle: "📦 हमाली, तोलाई आणि बाजार शुल्क",
    loadingPlaceholder: "हमाली/लोडिंग (₹)",
    unloadingPlaceholder: "उतराई (₹)",
    marketFeePlaceholder: "बाजार शुल्क (₹)",
    saveFeesBtn: "शुल्क जतन करा",
    thMandi: "बाजारपेठ",
    thLoading: "हमाली/लोडिंग",
    thUnloading: "उतराई",
    thMarketFee: "बाजार शुल्क",
    thTotalOther: "एकूण इतर खर्च / क्विंटल",
    
    // Tab 6 Prices
    pricesTitle: "🏷️ सक्रिय बाजारभाव अद्ययावत करा",
    pricePlaceholder: "भाव (₹/क्विंटल)",
    updatePriceBtn: "भाव अपडेट करा",
    thPricePerQtl: "दर / क्विंटल",
    thLastUpdated: "शेवटचे अपडेट",
    
    // Common
    addedBadge: "✓ जोडले",
    addBadge: "+ जोडा",
    allAdded: "सर्व प्रमुख बाबी जोडल्या आहेत",
    confirmDeleteCrop: "तुम्हाला नक्की हे पीक हटवायचे आहे का?",
    confirmDeleteMandi: "तुम्हाला नक्की ही बाजारपेठ हटवायची आहे का?",
    cropDeleted: "🗑️ पीक हटवले",
    mandiDeleted: "🗑️ बाजारपेठ हटवली",
    distDeleted: "🗑️ अंतराची नोंद हटवली",
    rateUpdated: "✅ वाहतूक दर ₹{rate}/किमी/क्विंटल अपडेट केला",
    distUpdated: "✅ अंतर यशस्वीरीत्या अपडेट केले",
    costsUpdated: "✅ हमाली खर्च यशस्वीरीत्या अपडेट केले",
    priceUpdated: "✅ सक्रिय भाव यशस्वीरीत्या अपडेट केला",
    cropAdded: "✅ पीक यशस्वीरीत्या जोडले",
    failedLoad: "⚠️ सिस्टम सेटिंग्ज लोड करण्यात अयशस्वी."
  }
};

let currentLang = localStorage.getItem("krishimitra_lang") || "en";

function t(key) {
  const dict = settingsTranslations[currentLang] || settingsTranslations.en;
  return dict[key] || settingsTranslations.en[key] || key;
}

// ==========================================
// 3. Language Switcher Helper
// ==========================================
function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem("krishimitra_lang", lang);

  // Update active pill button UI
  document.querySelectorAll(".lang-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.lang === lang);
  });

  // Update localized text labels across DOM
  const dict = settingsTranslations[lang] || settingsTranslations.en;
  document.querySelectorAll("[data-i18n]").forEach(elem => {
    const key = elem.getAttribute("data-i18n");
    if (dict[key]) {
      elem.textContent = dict[key];
    }
  });

  // Update input placeholders
  document.querySelectorAll("[data-i18n-placeholder]").forEach(elem => {
    const key = elem.getAttribute("data-i18n-placeholder");
    if (dict[key]) {
      elem.placeholder = dict[key];
    }
  });

  // Re-populate dropdown catalogs with new language
  populateCropPresetDropdown();
  populateMandiPresetDropdown();

  // Re-render table buttons / dynamic items if loaded
  if (adminData) {
    renderAllAdminSections();
  }
}

// Helper to provide headers for API calls
function getAuthHeaders() {
  return {
    "Content-Type": "application/json"
  };
}

// ==========================================
// 4. Populate Dropdown Catalogs (Multilingual)
// ==========================================
function populateCropPresetDropdown() {
  const select = document.getElementById("cropPresetSelect");
  if (!select) return;

  const existingNames = new Set();
  if (adminData && adminData.crops) {
    adminData.crops.forEach(c => {
      existingNames.add(c.name.toLowerCase());
      const clean = c.name.replace(/\(.*?\)/g, "").split("/")[0].trim().toLowerCase();
      existingNames.add(clean);
    });
  }

  const promptText = t("selectCropOption");
  select.innerHTML = `<option value="">${promptText}</option>`;

  CROP_CATALOG.forEach(item => {
    const clean = item.name.toLowerCase();
    const isAdded = existingNames.has(clean);
    const label = item[currentLang] || item.en;
    const suffix = isAdded ? ` (${t("addedBadge")})` : "";
    
    const opt = document.createElement("option");
    opt.value = item.name;
    opt.textContent = `${label}${suffix}`;
    if (isAdded) {
      opt.disabled = true;
      opt.style.color = "#94a3b8";
    }
    select.appendChild(opt);
  });
}

function populateMandiPresetDropdown() {
  const select = document.getElementById("mandiPresetSelect");
  if (!select) return;

  const existingNames = new Set();
  if (adminData && adminData.mandis) {
    adminData.mandis.forEach(m => {
      existingNames.add(m.name.toLowerCase());
      const clean = m.name.replace(/\(.*?\)/g, "").split("/")[0].trim().toLowerCase();
      existingNames.add(clean);
    });
  }

  const promptText = t("selectMandiOption");
  select.innerHTML = `<option value="">${promptText}</option>`;

  MANDI_CATALOG.forEach(item => {
    const clean = item.name.toLowerCase();
    const isAdded = existingNames.has(clean);
    const label = item[currentLang] || item.en;
    const suffix = isAdded ? ` (${t("addedBadge")})` : "";
    
    const opt = document.createElement("option");
    opt.value = item.name;
    opt.textContent = `${label}${suffix}`;
    if (isAdded) {
      opt.disabled = true;
      opt.style.color = "#94a3b8";
    }
    select.appendChild(opt);
  });
}

// ==========================================
// 5. Load Overview Data
// ==========================================
async function loadSettingsData() {
  try {
    const res = await fetch("/api/admin/overview", {
      headers: getAuthHeaders()
    });
    const result = await res.json();
    if (result.status === "success") {
      adminData = result.data;
      populateCropPresetDropdown();
      populateMandiPresetDropdown();
      renderAllAdminSections();
    }
  } catch (err) {
    console.error("Settings data load failed:", err);
    showToast(t("failedLoad"));
  }
}

// ==========================================
// 6. Render Settings Sections
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

// Crops Table
function renderCropsTable(crops) {
  const tbody = document.getElementById("cropsTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  const delText = t("deleteBtn");

  crops.forEach(c => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${c.id}</td>
      <td><strong>${c.name}</strong></td>
      <td style="text-align: center;">
        <button class="admin-delete-btn" onclick="deleteCrop(${c.id})">${delText}</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Refresh crop recommendation pills & catalog dropdown
  loadCropRecommendations("");
  populateCropPresetDropdown();
}

// Mandis Table
function renderMandisTable(mandis) {
  const tbody = document.getElementById("mandisTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  const delText = t("deleteBtn");

  mandis.forEach(m => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${m.id}</td>
      <td><strong>${m.name}</strong></td>
      <td>${m.latitude || "N/A"}, ${m.longitude || "N/A"}</td>
      <td style="text-align: center;">
        <button class="admin-delete-btn" onclick="deleteMandi(${m.id})">${delText}</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Refresh location recommendation pills & catalog dropdown
  loadMandiRecommendations("");
  populateMandiPresetDropdown();
}

// Distances Table
function renderDistancesTable(distances, mandis) {
  const tbody = document.getElementById("distancesTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  const delText = t("deleteBtn");

  distances.forEach(d => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${d.from_name}</td>
      <td>${d.to_name}</td>
      <td><strong>${d.distance_km} km</strong></td>
      <td style="text-align: center;">
        <button class="admin-delete-btn" onclick="deleteDistance(${d.id})">${delText}</button>
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

// Other Costs Table
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

// Prices Table
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
// 7. CRUD Action Handlers
// ==========================================

async function handleAddCrop(e) {
  e.preventDefault();
  const dropdownVal = document.getElementById("cropPresetSelect") ? document.getElementById("cropPresetSelect").value.trim() : "";
  const inputVal = document.getElementById("newCropName") ? document.getElementById("newCropName").value.trim() : "";
  const name = dropdownVal || inputVal;
  if (!name) return;

  const res = await fetch("/api/admin/crops", {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ name })
  });
  const data = await res.json();
  if (data.status === "success") {
    showToast(t("cropAdded"));
    if (document.getElementById("newCropName")) document.getElementById("newCropName").value = "";
    if (document.getElementById("cropPresetSelect")) document.getElementById("cropPresetSelect").value = "";
    loadSettingsData();
  } else {
    showToast("⚠️ " + (data.message || "Failed to add crop"));
  }
}

async function deleteCrop(id) {
  if (!confirm(t("confirmDeleteCrop"))) return;
  await fetch(`/api/admin/crops/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders()
  });
  showToast(t("cropDeleted"));
  loadSettingsData();
}

async function handleAddMandi(e) {
  e.preventDefault();
  const dropdownVal = document.getElementById("mandiPresetSelect") ? document.getElementById("mandiPresetSelect").value.trim() : "";
  const inputElem = document.getElementById("newMandiName");
  const inputVal = inputElem ? inputElem.value.trim() : "";
  const name = dropdownVal || inputVal;
  if (!name) return;

  const addBtn = document.getElementById("addMandiBtn");
  if (addBtn) {
    addBtn.disabled = true;
    addBtn.textContent = t("geocodingBtn");
  }
  showToast(`🗺️ Resolving coordinates & distances for ${name}...`);

  try {
    const res = await fetch("/api/admin/mandis", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ name })
    });
    const data = await res.json();
    if (data.status === "success") {
      showToast(`✅ Added ${name} (${data.latitude}, ${data.longitude})`);
      if (inputElem) inputElem.value = "";
      if (document.getElementById("mandiPresetSelect")) document.getElementById("mandiPresetSelect").value = "";
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
      addBtn.textContent = t("addMandiBtn");
    }
  }
}

async function deleteMandi(id) {
  if (!confirm(t("confirmDeleteMandi"))) return;
  await fetch(`/api/admin/mandis/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders()
  });
  showToast(t("mandiDeleted"));
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
    showToast(t("rateUpdated").replace("{rate}", rate));
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
    showToast(t("distUpdated"));
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
  showToast(t("distDeleted"));
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
    showToast(t("costsUpdated"));
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
    showToast(t("priceUpdated"));
    loadSettingsData();
  } else {
    showToast("⚠️ " + (data.message || "Failed to update price"));
  }
}

// ==========================================
// 8. Tab Navigation Logic
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
  const dropdown = document.getElementById("mandiSuggestionsDropdown");

  if (pillsContainer) {
    pillsContainer.innerHTML = "";
    const unadded = recs ? recs.filter(r => !r.already_added).slice(0, 8) : [];
    if (unadded.length === 0) {
      pillsContainer.innerHTML = `<span style="font-size: 0.78rem; color: var(--text-light); font-style: italic;">${t("allAdded")}</span>`;
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
    const addedBadgeText = t("addedBadge");
    const addBadgeText = t("addBadge");

    recs.slice(0, 6).forEach(r => {
      const item = document.createElement("div");
      item.className = "admin-suggestion-item";
      item.innerHTML = `
        <div>
          <strong>🏛️ ${r.name}</strong>
          <span style="font-size:0.75rem; color:var(--text-light); margin-left:6px;">${r.district || ''}</span>
        </div>
        ${r.already_added ? `<span style="font-size:0.72rem; color:var(--primary); font-weight:700;">${addedBadgeText}</span>` : `<span style="font-size:0.72rem; background:var(--primary-subtle); color:var(--primary-dark); padding:2px 6px; border-radius:4px; font-weight:700;">${addBadgeText}</span>`}
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
  const presetSelect = document.getElementById("mandiPresetSelect");

  if (presetSelect) {
    presetSelect.addEventListener("change", (e) => {
      if (e.target.value) {
        if (input) input.value = e.target.value;
      }
    });
  }

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
    let recs = (data.status === "success" && data.recommendations) ? data.recommendations : [];

    // Also match locally via CROP_CATALOG aliases if user types phonetic/Hinglish (e.g. 'makka', 'maze')
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      const existingNames = new Set();
      if (adminData && adminData.crops) {
        adminData.crops.forEach(c => {
          existingNames.add(c.name.toLowerCase());
          const clean = c.name.replace(/\(.*?\)/g, "").split("/")[0].trim().toLowerCase();
          existingNames.add(clean);
        });
      }

      CROP_CATALOG.forEach(cat => {
        const matchesAlias = (cat.aliases && cat.aliases.some(a => a.includes(q) || q.includes(a))) ||
                             (cat.en && cat.en.toLowerCase().includes(q)) ||
                             (cat.hi && cat.hi.toLowerCase().includes(q)) ||
                             (cat.mr && cat.mr.toLowerCase().includes(q));
        
        if (matchesAlias) {
          const alreadyInRecs = recs.some(r => r.name.toLowerCase().includes(cat.name.toLowerCase().split("/")[0].trim()));
          if (!alreadyInRecs) {
            recs.unshift({
              name: cat[currentLang] || cat.en,
              category: "Recommended",
              already_added: existingNames.has(cat.name.toLowerCase())
            });
          }
        }
      });
    }

    renderCropRecommendations(recs, query, isTyping);
  } catch (err) {
    console.warn("Failed to load crop recommendations:", err);
  }
}

function renderCropRecommendations(recs, query = "", isTyping = false) {
  const pillsContainer = document.getElementById("cropQuickPills");
  const dropdown = document.getElementById("cropSuggestionsDropdown");

  if (pillsContainer) {
    pillsContainer.innerHTML = "";
    const unadded = recs ? recs.filter(r => !r.already_added).slice(0, 8) : [];
    if (unadded.length === 0) {
      pillsContainer.innerHTML = `<span style="font-size: 0.78rem; color: var(--text-light); font-style: italic;">${t("allAdded")}</span>`;
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
    const addedBadgeText = t("addedBadge");
    const addBadgeText = t("addBadge");

    recs.slice(0, 6).forEach(r => {
      const item = document.createElement("div");
      item.className = "admin-suggestion-item";
      item.innerHTML = `
        <div>
          <strong>🌱 ${r.name}</strong>
          <span style="font-size:0.75rem; color:var(--text-light); margin-left:6px;">${r.category || ''}</span>
        </div>
        ${r.already_added ? `<span style="font-size:0.72rem; color:var(--primary); font-weight:700;">${addedBadgeText}</span>` : `<span style="font-size:0.72rem; background:var(--primary-subtle); color:var(--primary-dark); padding:2px 6px; border-radius:4px; font-weight:700;">${addBadgeText}</span>`}
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
  const presetSelect = document.getElementById("cropPresetSelect");

  if (presetSelect) {
    presetSelect.addEventListener("change", (e) => {
      if (e.target.value) {
        if (input) input.value = e.target.value;
      }
    });
  }

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

// ==========================================
// 9. Initialization
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  // Language button event listeners
  document.querySelectorAll(".lang-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const lang = btn.dataset.lang;
      setLanguage(lang);
    });
  });

  // Apply saved language on start
  setLanguage(currentLang);

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
