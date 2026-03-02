// --- Data from Django context ---
const geojsonDataString = `{{ geojson_data|safe }}`;
const healthStatsDataString = `{{ health_stats_data|safe }}`;
const sdohDataString = `{{ sdoh_data|safe }}`;
const sdohVariableMapString = `{{ sdoh_variable_map_json|safe }}`;
const zipToMuniMapString = `{{ zip_to_muni_map_json|safe }}`;

// --- Global Variables ---
let geojsonData;
let healthStatsRawData;
let healthStatsLookup = {};
let sdohRawData;
let sdohDataLookup = {};
let sdohVariableMap = {};
let zipToMuniMap = {};
let currentHealthMetricKey = 'composite_risk_score_mean';
let currentSDoHMetricKey = 'ACS_PCT_UNINSURED';
let geojsonLayer;
let sdohLayerGroup = L.layerGroup(); // Initialize LayerGroup
let selectedLayer = null;

// --- Parse Data (Keep as is) ---
try { geojsonData = JSON.parse(geojsonDataString); } catch (e) { console.error("GeoJSON Parse Error:", e); geojsonData = { type: "FeatureCollection", features: [] }; }
try { healthStatsRawData = JSON.parse(healthStatsDataString); if (Array.isArray(healthStatsRawData)) { healthStatsRawData.forEach(item => { if (item.postal) healthStatsLookup[item.postal] = item; }); } else { console.error("Health stats not array"); } } catch (e) { console.error("Health Stats Parse Error:", e); }
try { sdohRawData = JSON.parse(sdohDataString); if (Array.isArray(sdohRawData)) { sdohRawData.forEach(item => { if (item.COUNTY && item.YEAR === 2020) sdohDataLookup[item.COUNTY] = item; }); } else { console.error("SDoH data not array"); } } catch (e) { console.error("SDoH Data Parse Error:", e); }
try { sdohVariableMap = JSON.parse(sdohVariableMapString); } catch (e) { console.error("SDoH Map Parse Error:", e); }
try { zipToMuniMap = JSON.parse(zipToMuniMapString); } catch (e) { console.error("Zip Map Parse Error:", e); }


// --- Color Palettes & Configs (Keep as is) ---
const GOOD_HIGH_COLORS = ['#E7080C', '#DF5E1D', '#FFC300', '#39D834', '#15D886'];
const GOOD_LOW_COLORS = ['#15D886', '#39D834', '#FFC300', '#DF5E1D', '#E7080C'];
const NEUTRAL_COLORS   = ['#f7fcfd','#e0ecf4','#bfd3e6','#9ebcda','#8c96c6','#8c6bb1','#88419d','#6e016b'];
const SDOH_COLORS = ['#feedde','#fdd0a2','#fdae6b','#fd8d3c','#f16913','#d94801','#a63603','#7f2704'];

// Health Metric Configs (Keep as is)
const healthMetricConfigs = {
    'composite_risk_score_mean': { displayName: 'Composite Risk Score (Mean)', dataKey: 'composite_risk_score_mean', type: 'goodIsLow', breaks: [0.5, 0.75, 1.0, 1.25], colors: GOOD_LOW_COLORS, unit: 'score', description: "Average composite risk score (0-4). Calculated based on LDL>160, HDL<40, TG>150, TC/HDL≥5. Lower is better." },
    'composite_risk_score_median': { displayName: 'Composite Risk Score (Median)', dataKey: 'composite_risk_score_median', type: 'goodIsLow', breaks: [0.5, 0.75, 1.0, 1.25], colors: GOOD_LOW_COLORS, unit: 'score', description: "Median composite risk score (0-4). Lower is better." },
    'ldl_value_mean': { displayName: 'Avg. LDL (Mean)', dataKey: 'ldl_value_mean', type: 'goodIsLow', breaks: [100, 130, 160, 190], colors: GOOD_LOW_COLORS, unit: 'mg/dL', description: "Average LDL ('bad') Cholesterol. High Risk: > 160. Lower is better." },
    'ldl_value_median': { displayName: 'Median LDL', dataKey: 'ldl_value_median', type: 'goodIsLow', breaks: [100, 130, 160, 190], colors: GOOD_LOW_COLORS, unit: 'mg/dL', description: "Median LDL Cholesterol. Lower is better." },
    'hdl_value_mean': { displayName: 'Avg. HDL (Mean)', dataKey: 'hdl_value_mean', type: 'goodIsHigh', breaks: [30, 40, 50, 60], colors: GOOD_HIGH_COLORS, unit: 'mg/dL', description: "Average HDL ('good') Cholesterol. Low Risk: < 40. Higher is better." },
    'hdl_value_median': { displayName: 'Median HDL', dataKey: 'hdl_value_median', type: 'goodIsHigh', breaks: [30, 40, 50, 60], colors: GOOD_HIGH_COLORS, unit: 'mg/dL', description: "Median HDL Cholesterol. Higher is better." },
    'tc_value_mean': { displayName: 'Avg. Total Cholesterol (Mean)', dataKey: 'tc_value_mean', type: 'goodIsLow', breaks: [180, 200, 220, 240], colors: GOOD_LOW_COLORS, unit: 'mg/dL', description: "Average Total Cholesterol. High Risk: > 240. Lower is better." },
    'tc_value_median': { displayName: 'Median Total Cholesterol', dataKey: 'tc_value_median', type: 'goodIsLow', breaks: [180, 200, 220, 240], colors: GOOD_LOW_COLORS, unit: 'mg/dL', description: "Median Total Cholesterol. Lower is better." },
    'tg_value_mean': { displayName: 'Avg. Triglycerides (Mean)', dataKey: 'tg_value_mean', type: 'goodIsLow', breaks: [150, 200, 300, 500], colors: GOOD_LOW_COLORS, unit: 'mg/dL', description: "Average Triglycerides. High: > 200. Lower is better." },
    'tc_hdl_ratio_mean': { displayName: 'TC/HDL Ratio (Mean)', dataKey: 'tc_hdl_ratio_mean', type: 'goodIsLow', breaks: [3.5, 4.0, 5.0, 6.0], colors: GOOD_LOW_COLORS, unit: '', description: "Average Total Cholesterol / HDL Ratio. High Risk: ≥ 5.0. Lower is better." },
    'ldl_hdl_ratio_mean': { displayName: 'LDL/HDL Ratio (Mean)', dataKey: 'ldl_hdl_ratio_mean', type: 'goodIsLow', breaks: [2.0, 2.5, 3.0, 3.5], colors: GOOD_LOW_COLORS, unit: '', description: "Average LDL / HDL Ratio. High Risk: > 3.5. Lower is better." },
    'ldl_is_high_percentage': { displayName: '% LDL High (>160)', dataKey: 'ldl_is_high_percentage', type: 'goodIsLow', breaks: [5, 10, 15, 20], colors: GOOD_LOW_COLORS, unit: '%', description: "% of individuals with LDL > 160 mg/dL. Lower is better." },
    'hdl_is_low_percentage': { displayName: '% HDL Low (<40)', dataKey: 'hdl_is_low_percentage', type: 'goodIsLow', breaks: [20, 30, 40, 50], colors: GOOD_LOW_COLORS, unit: '%', description: "% of individuals with HDL < 40 mg/dL. Lower is better." },
    'patient_month_count': { displayName: 'Test Volumn', dataKey: 'patient_month_count', type: 'neutral', breaks: [1000, 2500, 5000, 10000, 20000, 50000, 100000], colors: NEUTRAL_COLORS, unit: '', description: "Totalnumber of laboratory tests performed in the ZIP code. Higher is better." },
};
// SDoH Metric Configs (Keep as is, ensure breaks are good)
const sdohMetricConfigs = {
    'ACS_PCT_UNINSURED': { type: 'percentage', breaks: [4, 6, 8, 10, 12, 14, 16], colors: SDOH_COLORS, unit: '%' },
    'ACS_PCT_LT_HS': { type: 'percentage', breaks: [15, 20, 25, 30, 35, 40, 45], colors: SDOH_COLORS, unit: '%' },
    'ACS_PCT_HH_PUB_ASSIST': { type: 'percentage', breaks: [25, 35, 45, 50, 55, 60, 65], colors: SDOH_COLORS, unit: '%' },
    'ACS_PCT_INC50_BELOW17': { type: 'percentage', breaks: [25, 35, 45, 50, 55, 60, 65], colors: SDOH_COLORS, unit: '%' },
    'ACS_PCT_INC50_ABOVE65': { type: 'percentage', breaks: [10, 15, 20, 25, 30, 35, 40], colors: SDOH_COLORS, unit: '%' },
    'ACS_PCT_DISABLE': { type: 'percentage', breaks: [10, 15, 20, 25, 30, 35, 40], colors: SDOH_COLORS, unit: '%' },
    'ACS_PCT_NONVET_DISABLE_18_64': { type: 'percentage', breaks: [10, 15, 20, 25, 30, 35, 40], colors: SDOH_COLORS, unit: '%' },
    'ACS_PCT_VET_DISABLE_18_64': { type: 'percentage', breaks: [10, 20, 30, 40, 50, 60, 70], colors: SDOH_COLORS, unit: '%' },
    'HIFLD_MIN_DIST_UC': { type: 'distance', breaks: [2, 5, 8, 12, 16, 20, 25], colors: SDOH_COLORS, unit: ' mi' },
    'POS_MIN_DIST_ED': { type: 'distance', breaks: [1, 3, 5, 8, 12, 15, 20], colors: SDOH_COLORS, unit: ' mi' },
    'POS_MIN_DIST_ALC': { type: 'distance', breaks: [5, 10, 15, 20, 25, 30, 40], colors: SDOH_COLORS, unit: ' mi' },
    'ACS_TOT_CIVIL_EMPLOY_POP': { type: 'count', breaks: [2500, 5000, 10000, 20000, 40000, 80000, 120000], colors: SDOH_COLORS, unit: '' },
    'ACS_PCT_COLLEGE_ASSOCIATE_DGR': { type: 'percentage', breaks: [10, 15, 20, 25, 30, 35, 40], colors: SDOH_COLORS, unit: '%' },
    'ACS_PCT_BACHELOR_DGR': { type: 'percentage', breaks: [5, 10, 15, 20, 25, 30, 35], colors: SDOH_COLORS, unit: '%' },
    'ACS_PCT_GRADUATE_DGR': { type: 'percentage', breaks: [1, 3, 5, 7, 10, 13, 16], colors: SDOH_COLORS, unit: '%' },
    'ACS_PCT_HS_GRADUATE': { type: 'percentage', breaks: [20, 25, 30, 35, 40, 45, 50], colors: SDOH_COLORS, unit: '%' },
    'ACS_PCT_POSTHS_ED': { type: 'percentage', breaks: [20, 30, 40, 45, 50, 55, 60], colors: SDOH_COLORS, unit: '%' },
    'ACS_PCT_HEALTH_INC_BELOW137': { type: 'percentage', breaks: [30, 40, 50, 60, 70, 80, 90], colors: SDOH_COLORS, unit: '%' },
    'ACS_PCT_HEALTH_INC_138_199': { type: 'percentage', breaks: [5, 10, 15, 20, 25, 30, 35], colors: SDOH_COLORS, unit: '%' },
    'ACS_PCT_HEALTH_INC_200_399': { type: 'percentage', breaks: [5, 10, 15, 20, 25, 30, 35], colors: SDOH_COLORS, unit: '%' },
    'ACS_PCT_HEALTH_INC_ABOVE400': { type: 'percentage', breaks: [1, 3, 5, 8, 12, 16, 20], colors: SDOH_COLORS, unit: '%' },
};

// --- Map Initialization ---
const map = L.map('map').setView([18.2208, -66.255167], 9);
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap contributors © CARTO | Health: Abartys | SDoH: ACS 2020', // Slightly shorter
    subdomains: 'abcd', minZoom: 8, maxZoom: 14
}).addTo(map);

// --- *** CREATE CUSTOM PANE FOR SDoH CIRCLES *** ---
map.createPane('sdohPane');
map.getPane('sdohPane').style.zIndex = 650; // Higher than default overlay (400) and shadow (500), but below markers/popups (600/700/800)
map.getPane('sdohPane').style.pointerEvents = 'none'; // Allow clicks to pass through to the layers below (like ZIP codes)

// Add the layer group (it will inherit pane settings from its children)
sdohLayerGroup.addTo(map);

// --- Get DOM Elements (Keep as is) ---
const healthMetricSelect = document.getElementById('metric-select');
const healthMetricDescriptionPanel = document.getElementById('metric-description');
const sdohSelect = document.getElementById('sdoh-select');
const sdohDescriptionPanel = document.getElementById('sdoh-description');
const healthLegendDiv = document.getElementById('health-legend');
const sdohLegendDiv = document.getElementById('sdoh-legend');
const infoPanel = document.getElementById('info-panel');

// --- Populate Select Dropdowns (Keep as is) ---
function populateSelect(selectElement, configObject, defaultKey) {
    selectElement.innerHTML = '';
    const sortedKeys = Object.keys(configObject).sort((a, b) => {
        const itemA = configObject[a]; const itemB = configObject[b];
        const stringA = (typeof itemA === 'object' && itemA?.displayName) ? itemA.displayName : (typeof itemA === 'string' ? itemA : String(a));
        const stringB = (typeof itemB === 'object' && itemB?.displayName) ? itemB.displayName : (typeof itemB === 'string' ? itemB : String(b));
        return stringA.localeCompare(stringB);
    });
    sortedKeys.forEach(key => {
        if (selectElement.id === 'sdoh-select') {
            const nonNumericSDoHKeys = ["YEAR", "COUNTYFIPS", "COUNTY", "STATE", "lon", "lat"];
            if (nonNumericSDoHKeys.includes(key) || !sdohMetricConfigs[key]) return;
        }
        const option = document.createElement('option'); option.value = key;
        const item = configObject[key];
        option.textContent = (typeof item === 'object' && item?.displayName) ? item.displayName : (typeof item === 'string' ? item : key);
        if (key === defaultKey) option.selected = true;
        selectElement.appendChild(option);
    });
}
populateSelect(healthMetricSelect, healthMetricConfigs, currentHealthMetricKey);
populateSelect(sdohSelect, sdohVariableMap, currentSDoHMetricKey);


// --- Update Description Panels (Keep as is) ---
function updateDescriptionPanel(panelElement, key, configMap, variableMap = null) {
    let description = "Description not available.";
    if (variableMap && variableMap[key]) { description = variableMap[key]; }
    else if (configMap && configMap[key]?.description) { description = configMap[key].description; }
    else if (configMap && configMap[key]?.displayName) { description = configMap[key].displayName; }
    panelElement.innerHTML = description ? `<p>${description.replace(/\n/g, '<br>')}</p>` : '<p class="placeholder-text">Select an indicator.</p>';
}
updateDescriptionPanel(healthMetricDescriptionPanel, currentHealthMetricKey, healthMetricConfigs);
updateDescriptionPanel(sdohDescriptionPanel, currentSDoHMetricKey, sdohMetricConfigs, sdohVariableMap);


// --- Merge Health Data into GeoJSON (Keep as is) ---
if (geojsonData?.features && Object.keys(healthStatsLookup).length > 0) {
    geojsonData.features.forEach(feature => {
        const zipCode = feature.properties.ZCTA5CE10;
        feature.properties.healthData = healthStatsLookup[zipCode] || null;
    });
} else { console.warn("GeoJSON/health stats missing."); }

// --- Styling Functions (Keep getHealthColor, styleHealthLayer, getSDoHColor, getSDoHRadius as is) ---
function getHealthColor(value, metricKey) { /* ... keep existing ... */
    const config = healthMetricConfigs[metricKey];
    if (!config || value === null || value === undefined || isNaN(value)) return '#E0E0E0';
    const { breaks, colors } = config;
    if (!breaks || !colors || breaks.length === 0 || colors.length === 0) return '#E0E0E0';
    if (colors.length < breaks.length + 1) console.warn(`Health colors array short for ${metricKey}.`);
    for (let i = 0; i < breaks.length; i++) { if (value <= breaks[i]) return colors[i] || '#E0E0E0'; }
    return colors[colors.length - 1] || '#E0E0E0';
}
function styleHealthLayer(feature) { /* ... keep existing ... */
    const value = feature.properties.healthData ? feature.properties.healthData[currentHealthMetricKey] : null;
    return { fillColor: getHealthColor(value, currentHealthMetricKey), weight: 1, opacity: 1, color: '#666', fillOpacity: 0.7 };
}
function getSDoHColor(value, metricKey) { /* ... keep existing ... */
    const config = sdohMetricConfigs[metricKey];
    if (!config || value === null || value === undefined || isNaN(value)) return '#999999';
    const { breaks, colors } = config;
    if (!breaks || !colors || breaks.length === 0 || colors.length === 0) { console.error(`Invalid breaks/colors for SDoH: ${metricKey}`); return '#999999'; }
    if (colors.length < breaks.length + 1) console.warn(`SDoH colors array short for ${metricKey}.`);
    for (let i = 0; i < breaks.length; i++) { if (value <= breaks[i]) return colors[i] || '#999999'; }
    return colors[colors.length - 1] || '#999999';
}
function getSDoHRadius(value, metricKey) { /* ... keep existing ... */
    const config = sdohMetricConfigs[metricKey]; const minRadius = 4; const maxRadius = 20;
    if (!config || value === null || value === undefined || isNaN(value) || value <= 0) return minRadius;
    let radius; let minVal = Infinity; let maxVal = -Infinity;
    Object.values(sdohDataLookup).forEach(m => { const v = m[metricKey]; if (v !== null && !isNaN(v)) { if (v < minVal) minVal = v; if (v > maxVal) maxVal = v; } });
    if (minVal === Infinity || maxVal === -Infinity || minVal === maxVal) { radius = (config.type === 'count') ? minRadius + Math.log1p(value) * 2 : (minRadius + maxRadius) / 2; }
    else { const range = maxVal - minVal; radius = minRadius + ((value - minVal) / range) * (maxRadius - minRadius); }
    return Math.max(minRadius, Math.min(maxRadius, radius));
}

// --- Interaction Functions ---
function highlightFeature(e) { // For ZIP Layer
    const layer = e.target;
    if (layer !== selectedLayer) { layer.setStyle({ weight: 3, color: '#051B35', fillOpacity: 0.8 }); }
    if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) { if (layer !== selectedLayer) layer.bringToFront(); }
    // NO need to bring SDoH pane forward here, it stays on top via zIndex
}

function resetHighlight(e) { // For ZIP Layer
    if (e.target !== selectedLayer) { geojsonLayer.resetStyle(e.target); }
}

function selectFeature(e) { // For ZIP Layer
    const layer = e.target;
    if (selectedLayer && selectedLayer !== layer) { try { geojsonLayer.resetStyle(selectedLayer); } catch (error) { console.warn("Reset style error:", error); } }
    map.fitBounds(layer.getBounds().pad(0.1));
    layer.setStyle({ weight: 4, color: '#041427', dashArray: '', fillOpacity: 0.85 });
    layer.bringToFront(); // Bring selected ZIP polygon forward
    // NO need to bring SDoH pane forward here
    selectedLayer = layer;
    updateInfoPanel(layer.feature.properties);
}

function onEachFeature(feature, layer) { // Attaches interactions to ZIP Layer
    layer.on({ mouseover: highlightFeature, mouseout: resetHighlight, click: selectFeature });
}

// --- Update Info Panel (Keep as is) ---
function updateInfoPanel(zipProps) { /* ... keep existing logic ... */
    if (!zipProps?.ZCTA5CE10) { infoPanel.innerHTML = '<p>Click ZIP area for details.</p>'; return; }
    const zipCode = zipProps.ZCTA5CE10; const healthData = zipProps.healthData;
    const municipalityName = zipToMuniMap[zipCode]; const sdohData = municipalityName ? sdohDataLookup[municipalityName] : null;
    let content = `<h3>ZIP: ${zipCode}</h3>`;
    content += municipalityName ? `<h4>Muni: ${municipalityName}</h4>` : `<p><small>(Muni N/A)</small></p>`;
    content += `<hr style="margin:10px 0;"><h4>Health (ZIP)</h4>`;
    if (healthData) { const hc = healthMetricConfigs[currentHealthMetricKey]; const hv = healthData[currentHealthMetricKey]; const hd = (hv !== null && !isNaN(hv)) ? `${parseFloat(hv).toFixed(2)} ${hc.unit || ''}` : 'N/A'; content += `<p><span class="data-label">${hc.displayName}:</span> <strong class="data-value">${hd}</strong></p>`; } else { content += `<p>No health data.</p>`; }
    content += `<h4 style="margin-top:15px;">SDoH (Muni)</h4>`;
    if (sdohData) {
        const sc = sdohMetricConfigs[currentSDoHMetricKey]; const sv = sdohData[currentSDoHMetricKey];
        const sd = sdohVariableMap[currentSDoHMetricKey] || sc?.displayName || currentSDoHMetricKey;
        const sdv = (sv !== null && !isNaN(sv)) ? `${parseFloat(sv).toFixed(sc?.type === 'percentage' ? 1 : 2)}${sc?.unit || ''}` : 'N/A';
        content += `<p><span class="data-label">${sd}:</span> <strong class="data-value">${sdv}</strong></p>`;
        content += `<p style="margin-top:10px;"><small><i>Other examples:</i></small></p>`;
        const exampleSDoH = ['ACS_PCT_UNINSURED', 'ACS_PCT_LT_HS', 'ACS_PCT_HH_PUB_ASSIST', 'ACS_PCT_DISABLE'];
        exampleSDoH.forEach(key => { if (key !== currentSDoHMetricKey && sdohData[key] !== undefined && sdohVariableMap[key] && sdohMetricConfigs[key]) { const v = sdohData[key]; const d = sdohVariableMap[key]; const c = sdohMetricConfigs[key]; const dv = (v !== null && !isNaN(v)) ? `${parseFloat(v).toFixed(c.type === 'percentage' ? 1 : 2)}${c.unit || ''}` : 'N/A'; content += `<p style="font-size:0.9em;"><span class="data-label">${d}:</span> <span class="data-value">${dv}</span></p>`; } });
    } else if (municipalityName) { content += `<p>No SDoH data for ${municipalityName}.</p>`; } else { content += `<p>Cannot determine muni.</p>`; }
    infoPanel.innerHTML = content;
}

// --- Update Legends (Keep as is) ---
function updateHealthLegend(metricKey) { /* ... keep existing logic ... */
    const config = healthMetricConfigs[metricKey]; healthLegendDiv.innerHTML = '';
    if (!config?.breaks?.length || !config?.colors?.length) { healthLegendDiv.innerHTML = '<p>Health legend N/A.</p>'; return; }
    const { breaks, colors, unit, displayName } = config;
    if (colors.length < breaks.length + 1) { healthLegendDiv.innerHTML = `<p>Legend config error.</p>`; return; }
    let html = `<h5>${displayName} (ZIP)</h5>`; const p = unit === '%' ? 1 : 2;
    html += `<span><i style="background:${colors[0]}"></i> ≤ ${breaks[0].toFixed(p)} ${unit || ''}</span>`;
    for (let i = 0; i < breaks.length - 1; i++) { html += `<span><i style="background:${colors[i+1]}"></i> ${breaks[i].toFixed(p)} - ${breaks[i+1].toFixed(p)} ${unit || ''}</span>`; }
    html += `<span><i style="background:${colors[colors.length-1]}"></i> > ${breaks[breaks.length-1].toFixed(p)} ${unit || ''}</span>`;
    html += `<span><i style="background:#E0E0E0"></i> No Data</span>`;
    healthLegendDiv.innerHTML = html;
}
function updateSDoHLegend(metricKey) { /* ... keep existing logic ... */
    const config = sdohMetricConfigs[metricKey]; const variableDesc = sdohVariableMap[metricKey] || metricKey;
    sdohLegendDiv.innerHTML = '';
    if (!config?.breaks?.length || !config?.colors?.length) { sdohLegendDiv.innerHTML = `<p>SDoH legend N/A.</p>`; return; }
    const { breaks, colors, unit, type } = config;
    if (colors.length < breaks.length + 1) { sdohLegendDiv.innerHTML = `<p>Legend config error.</p>`; return; }
    let html = `<h5>${variableDesc} (Municipality)</h5>`; const numSteps = 5;
    let minVal = breaks[0]; let maxVal = breaks[breaks.length - 1]; let hasRange = !(minVal === undefined || maxVal === undefined || minVal === maxVal);
    const valueRange = hasRange ? maxVal - minVal : 1; const stepValue = hasRange && valueRange > 0 ? valueRange / (numSteps - 1) : 1;
    for (let i = 0; i < numSteps; i++) {
        const value = hasRange ? minVal + (i * stepValue) : (type === 'count' ? Math.pow(10, i+1) : 10*i);
        const displayValue = (i === numSteps - 1 && hasRange) ? maxVal : value;
        const radius = getSDoHRadius(displayValue, metricKey); const color = getSDoHColor(displayValue, metricKey);
        const precision = (type === 'percentage' || displayValue < 10) ? 1 : 0;
        const label = displayValue >= 1000 ? (displayValue/1000).toFixed(precision)+'k' : displayValue.toFixed(precision);
        html += `<div style="margin-bottom: 5px;"><span class="legend-circle" style="background-color:${color}; width:${radius*1.8}px; height:${radius*1.8}px; border-color: #444"></span><span class="legend-circle-label"> ≈ ${label}${unit || ''}</span></div>`;
    }
    const noDataRadius = getSDoHRadius(null, metricKey);
    html += `<div style="margin-bottom: 5px;"><span class="legend-circle" style="background-color:#999999; width:${noDataRadius*1.8}px; height:${noDataRadius*1.8}px; border-color: #666"></span><span class="legend-circle-label"> No Data</span></div>`;
    sdohLegendDiv.innerHTML = html;
}


// --- Event Listeners (Keep as is) ---
healthMetricSelect.addEventListener('change', function() {
    currentHealthMetricKey = this.value;
    if (geojsonLayer) { geojsonLayer.setStyle(styleHealthLayer); }
    updateHealthLegend(currentHealthMetricKey);
    updateDescriptionPanel(healthMetricDescriptionPanel, currentHealthMetricKey, healthMetricConfigs);
    if (selectedLayer) { updateInfoPanel(selectedLayer.feature.properties); } else { updateInfoPanel(null); }
});

sdohSelect.addEventListener('change', function() {
    currentSDoHMetricKey = this.value;
    if (!sdohMetricConfigs[currentSDoHMetricKey]) {
        console.error(`Config missing for SDoH key: ${currentSDoHMetricKey}`);
        sdohLegendDiv.innerHTML = `<p>Viz config missing.</p>`;
        if (sdohLayerGroup) sdohLayerGroup.clearLayers();
        updateDescriptionPanel(sdohDescriptionPanel, currentSDoHMetricKey, null, sdohVariableMap);
        return;
    }
    drawSDoHLayer(); // Redraw circles (pane ensures they are on top)
    updateSDoHLegend(currentSDoHMetricKey);
    updateDescriptionPanel(sdohDescriptionPanel, currentSDoHMetricKey, sdohMetricConfigs, sdohVariableMap);
    if (selectedLayer) { updateInfoPanel(selectedLayer.feature.properties); }
});


// --- Drawing Layers ---

// Draw ZIP Code Layer (into default pane)
if (geojsonData?.features?.length > 0) {
    geojsonLayer = L.geoJson(geojsonData, {
        style: styleHealthLayer,
        onEachFeature: onEachFeature
        // No pane specified, defaults to overlayPane (zIndex 400)
    }).addTo(map);
    updateHealthLegend(currentHealthMetricKey);
} else {
    document.getElementById('map').innerHTML = "<p>Could not load map boundary data.</p>";
    updateHealthLegend(currentHealthMetricKey);
}

// --- Function to Draw SDoH Circle Layer ---
function drawSDoHLayer() {
    // console.log(`--- Redrawing SDoH Layer for Metric: ${currentSDoHMetricKey} ---`);
    sdohLayerGroup.clearLayers(); // Clear existing circles from the group
    let circlesAddedCount = 0; let dataErrors = 0;

    Object.values(sdohDataLookup).forEach(muniData => {
        if (muniData?.COUNTY && typeof muniData.lat === 'number' && typeof muniData.lon === 'number') {
            const value = muniData[currentSDoHMetricKey];
            if (value === undefined) { dataErrors++; }
            const radius = getSDoHRadius(value, currentSDoHMetricKey);
            const color = getSDoHColor(value, currentSDoHMetricKey);
            const sdohConfig = sdohMetricConfigs[currentSDoHMetricKey];
            const displayValue = (value !== null && !isNaN(value))
                            ? `${parseFloat(value).toFixed(sdohConfig?.type === 'percentage' ? 1 : 2)}${sdohConfig?.unit || ''}` : 'N/A';
            const sdohDescription = sdohVariableMap[currentSDoHMetricKey] || currentSDoHMetricKey;

            const circle = L.circleMarker([muniData.lat, muniData.lon], {
                radius: radius,
                fillColor: color,
                color: '#444444', // Fixed border
                weight: 1,
                opacity: 0.9,
                fillOpacity: 0.8,
                pane: 'sdohPane' // *** Assign marker to the custom pane ***
            });

            circle.bindTooltip(`<b>${muniData.COUNTY}</b><br>${sdohDescription}: ${displayValue}`, { sticky: true });
            sdohLayerGroup.addLayer(circle); // Add circle to the group
            circlesAddedCount++;
        } else { dataErrors++; }
    });
    // The layer group itself is already on the map and pane setting is inherited
    // No need to call bringToFront here for basic stacking
    // console.log(`Finished SDoH layer: ${circlesAddedCount} circles, ${dataErrors} errors.`);
}

// --- Initial Draws ---
drawSDoHLayer(); // Draw initial SDoH circles into the sdohPane
updateSDoHLegend(currentSDoHMetricKey);
updateInfoPanel(null);
