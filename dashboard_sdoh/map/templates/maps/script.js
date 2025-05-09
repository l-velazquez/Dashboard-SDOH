// --- Data to be populated (e.g., from JSON files or directly as strings) ---
// For a static setup, replace these template literals with actual JSON strings
// or fetch data from external .json files.
const geojsonDataString = `{{ geojson_data|safe }}`; // Replace with GeoJSON string or fetch
const healthStatsDataString = `{{ health_stats_data|safe }}`; // Replace with health stats JSON string or fetch

let geojsonData;
let healthStatsRawData;
let healthStatsLookup = {};

try {
    geojsonData = JSON.parse(geojsonDataString);
} catch (e) {
    console.error("Error parsing GeoJSON data. Ensure it's a valid JSON string or fetched correctly.", e);
    geojsonData = { "type": "FeatureCollection", "features": [] }; // Fallback
}

try {
    healthStatsRawData = JSON.parse(healthStatsDataString);
    if (Array.isArray(healthStatsRawData)) {
        healthStatsRawData.forEach(item => {
            if (item.postal) { // Assuming 'postal' is the ZIP code key in your health data
                healthStatsLookup[item.postal] = item;
            }
        });
    } else {
        console.error("Health stats data is not an array:", healthStatsRawData);
        healthStatsLookup = {};
    }
} catch (e) {
    console.error("Error parsing health stats data. Ensure it's a valid JSON string or fetched correctly.", e);
    healthStatsLookup = {};
}

const GOOD_HIGH_COLORS = ['#E7080C', '#DF5E1D', '#FFC300', '#39D834', '#15D886']; // Bad (low) to Good (high)
const GOOD_LOW_COLORS = ['#15D886', '#39D834', '#FFC300', '#DF5E1D', '#E7080C']; // Good (low) to Bad (high)
const NEUTRAL_COLORS = ['#edf8fb', '#b3cde3', '#8c96c6', '#8856a7', '#810f7c']; // Sequential

const metricConfigs = {
    'composite_risk_score_mean': {
        displayName: 'Avg. Composite Risk Score',
        dataKey: 'composite_risk_score_mean',
        type: 'goodIsLow',
        breaks: [1.0, 1.5, 2.0, 2.5],
        colors: GOOD_LOW_COLORS,
        unit: 'points',
        description: `<p><strong>Average Composite Risk Score:</strong></p><p>A simple score (0-4) calculated for individuals by counting how many of these risk factors they have:<ul><li>LDL > 160 mg/dL</li><li>HDL < 40 mg/dL</li><li>Triglycerides > 150 mg/dL</li><li>TC/HDL Ratio ≥ 5.0</li></ul></p><p>This map shows the <em>average</em> of these individual scores for each ZIP code area.</p><p><em>Interpretation:</em> A higher average score suggests a greater prevalence of multiple cardiovascular risk factors in the area. Lower scores are better.</p>`
    },
    'composite_risk_score_median': {
        displayName: 'Median Composite Risk Score',
        dataKey: 'composite_risk_score_median',
        type: 'goodIsLow',
        breaks: [1.0, 1.5, 2.0, 2.5],
        colors: GOOD_LOW_COLORS,
        unit: 'points',
        description: `<p><strong>Median Composite Risk Score:</strong></p><p>Similar to the average, but this is the <em>median</em> (middle value) of the individual composite risk scores (0-4) in the area. See 'Avg. Composite Risk Score' for factor details.</p><p><em>Interpretation:</em> The median can be less affected by extreme outliers than the average. Lower scores are better.</p>`
    },
    'has_2_plus_risk_factors_percentage': {
        displayName: '% Ppl with ≥2 Risk Factors',
        dataKey: 'has_2_plus_risk_factors_percentage',
        type: 'goodIsLow',
        breaks: [10, 20, 30, 40],
        colors: GOOD_LOW_COLORS,
        unit: '%',
        description: `<p><strong>Percentage of Population with ≥2 Risk Factors:</strong></p><p>This shows the percentage of individuals in the area who have <strong>2 or more</strong> of the following risk factors:<ul><li>LDL > 160 mg/dL</li><li>HDL < 40 mg/dL</li><li>Triglycerides > 150 mg/dL</li><li>TC/HDL Ratio ≥ 5.0</li></ul></p><p><em>Interpretation:</em> A higher percentage indicates more individuals with multiple risk factors. Lower percentages are better.</p>`
    },
    'ldl_value_mean': {
        displayName: 'Avg. LDL ("Bad" Cholesterol)',
        dataKey: 'ldl_value_mean',
        type: 'goodIsLow',
        breaks: [100, 130, 160, 190],
        colors: GOOD_LOW_COLORS,
        unit: 'mg/dL',
        description: `<p><strong>Average LDL Cholesterol:</strong></p><p>Average Low-Density Lipoprotein (LDL), often called "bad" cholesterol. High LDL contributes to plaque buildup in arteries.</p><p><em>Interpretation (General Ranges):</em> Optimal: <em><100 mg/dL</em><br/> Near Optimal: <em>100-129 mg/dL</em><br/> Borderline High: <em>130-159 mg/dL</em><br/> High: <em>160-189 mg/dL</em><br/> Very High: <em>≥190 mg/dL</em></p><p>Lower values are better.</p>`
    },
    'ldl_value_median': {
        displayName: 'Median LDL ("Bad" Cholesterol)',
        dataKey: 'ldl_value_median',
        type: 'goodIsLow',
        breaks: [100, 130, 160, 190],
        colors: GOOD_LOW_COLORS,
        unit: 'mg/dL',
        description: `<p><strong>Median LDL Cholesterol:</strong></p><p>Median Low-Density Lipoprotein (LDL). See 'Avg. LDL' for general interpretation. The median is less affected by extreme values.</p><p>Lower values are better.</p>`
    },
    'ldl_is_borderline_percentage': {
        displayName: '% LDL 130-159 mg/dL (Borderline)',
        dataKey: 'ldl_is_borderline_percentage',
        type: 'goodIsLow',
        breaks: [10, 20, 30, 40],
        colors: GOOD_LOW_COLORS,
        unit: '%',
        description: `<p><strong>Percentage with Borderline High LDL:</strong></p><p>Percentage of individuals with LDL cholesterol between <em>130-159 mg/dL</em> (Borderline High).</p><p><em>Interpretation:</em> Indicates prevalence of moderately elevated LDL. Lower percentages are better.</p>`
    },
    'ldl_is_high_percentage': {
        displayName: '% LDL >160 mg/dL (High)',
        dataKey: 'ldl_is_high_percentage',
        type: 'goodIsLow',
        breaks: [5, 10, 15, 25],
        colors: GOOD_LOW_COLORS,
        unit: '%',
        description: `<p><strong>Percentage with High LDL:</strong></p><p>Percentage of individuals with LDL cholesterol <em>>160 mg/dL</em> (High or Very High).</p><p><em>Interpretation:</em> A direct measure of high-risk LDL in the population. Lower percentages are better.</p>`
    },
    'hdl_value_mean': {
        displayName: 'Avg. HDL ("Good" Cholesterol)',
        dataKey: 'hdl_value_mean',
        type: 'goodIsHigh',
        breaks: [35, 40, 50, 60],
        colors: GOOD_HIGH_COLORS,
        unit: 'mg/dL',
        description: `<p><strong>Average HDL Cholesterol:</strong></p><p>Average High-Density Lipoprotein (HDL), often called "good" cholesterol. HDL helps remove cholesterol from arteries.</p><p><em>Interpretation (General Ranges):</em> Low (Risk Factor): <em><40 mg/dL</em><br/> Acceptable: <em>40-59 mg/dL</em> (Higher end better, esp. for women ~50+)<br/> Optimal/Protective: <em>≥60 mg/dL</em></p><p>Higher values are better.</p>`
    },
    'hdl_value_median': {
        displayName: 'Median HDL ("Good" Cholesterol)',
        dataKey: 'hdl_value_median',
        type: 'goodIsHigh',
        breaks: [35, 40, 50, 60],
        colors: GOOD_HIGH_COLORS,
        unit: 'mg/dL',
        description: `<p><strong>Median HDL Cholesterol:</strong></p><p>Median High-Density Lipoprotein (HDL). See 'Avg. HDL' for general interpretation. Higher values are better.</p>`
    },
    'hdl_is_low_percentage': {
        displayName: '% HDL <40 mg/dL (Low)',
        dataKey: 'hdl_is_low_percentage',
        type: 'goodIsLow',
        breaks: [20, 30, 40, 50],
        colors: GOOD_LOW_COLORS,
        unit: '%',
        description: `<p><strong>Percentage with Low HDL:</strong></p><p>Percentage of individuals with HDL cholesterol <em><40 mg/dL</em> (considered low and a risk factor).</p><p><em>Interpretation:</em> A higher percentage means more individuals lack sufficient "good" cholesterol. Lower percentages are better.</p>`
    },
    'tc_value_mean': {
        displayName: 'Avg. Total Cholesterol',
        dataKey: 'tc_value_mean',
        type: 'goodIsLow',
        breaks: [180, 200, 220, 240],
        colors: GOOD_LOW_COLORS,
        unit: 'mg/dL',
        description: `<p><strong>Average Total Cholesterol (TC):</strong></p><p>Average of all cholesterol types in the blood.</p><p><em>Interpretation (General Ranges):</em> Desirable: <em><200 mg/dL</em><br/> Borderline High: <em>200-239 mg/dL</em><br/> High: <em>≥240 mg/dL</em></p><p>While lower is generally better, TC should be considered with HDL/LDL. Non-HDL cholesterol is often a better indicator.</p>`
    },
    'tc_value_median': {
        displayName: 'Median Total Cholesterol',
        dataKey: 'tc_value_median',
        type: 'goodIsLow',
        breaks: [180, 200, 220, 240],
        colors: GOOD_LOW_COLORS,
        unit: 'mg/dL',
        description: `<p><strong>Median Total Cholesterol (TC):</strong></p><p>Median total cholesterol level. See 'Avg. Total Cholesterol' for general interpretation.</p>`
    },
    'tc_is_borderline_percentage': {
        displayName: '% TC 200-239 mg/dL (Borderline)',
        dataKey: 'tc_is_borderline_percentage',
        type: 'goodIsLow',
        breaks: [15, 25, 35, 45],
        colors: GOOD_LOW_COLORS,
        unit: '%',
        description: `<p><strong>Percentage with Borderline High Total Cholesterol:</strong></p><p>Percentage of individuals with Total Cholesterol between <em>200-239 mg/dL</em>.</p><p><em>Interpretation:</em> Indicates prevalence of moderately elevated total cholesterol. Lower percentages are better.</p>`
    },
    'tc_is_high_percentage': {
        displayName: '% TC >240 mg/dL (High)',
        dataKey: 'tc_is_high_percentage',
        type: 'goodIsLow',
        breaks: [5, 10, 15, 20],
        colors: GOOD_LOW_COLORS,
        unit: '%',
        description: `<p><strong>Percentage with High Total Cholesterol:</strong></p><p>Percentage of individuals with Total Cholesterol <em>>240 mg/dL</em>.</p><p><em>Interpretation:</em> Direct measure of high total cholesterol. Lower percentages are better.</p>`
    },
    'tg_value_mean': {
        displayName: 'Avg. Triglycerides',
        dataKey: 'tg_value_mean',
        type: 'goodIsLow',
        breaks: [150, 200, 300, 500],
        colors: GOOD_LOW_COLORS,
        unit: 'mg/dL',
        description: `<p><strong>Average Triglycerides (TG):</strong></p><p>A type of fat found in the blood. High levels are associated with increased cardiovascular risk.</p><p><em>Interpretation (General Ranges):</em> Normal: <em><150 mg/dL</em><br/> Borderline High: <em>150-199 mg/dL</em><br/> High: <em>200-499 mg/dL</em><br/> Very High: <em>≥500 mg/dL</em></p><p>Lower values are better.</p>`
    },
    'tg_value_median': {
        displayName: 'Median Triglycerides',
        dataKey: 'tg_value_median',
        type: 'goodIsLow',
        breaks: [150, 200, 300, 500],
        colors: GOOD_LOW_COLORS,
        unit: 'mg/dL',
        description: `<p><strong>Median Triglycerides (TG):</strong></p><p>Median triglyceride level. See 'Avg. Triglycerides' for general interpretation.</p>`
    },
    'tg_is_borderline_percentage': {
        displayName: '% TG 150-199 mg/dL (Borderline)',
        dataKey: 'tg_is_borderline_percentage',
        type: 'goodIsLow',
        breaks: [10, 15, 20, 30],
        colors: GOOD_LOW_COLORS,
        unit: '%',
        description: `<p><strong>Percentage with Borderline High Triglycerides:</strong></p><p>Percentage of individuals with Triglycerides between <em>150-199 mg/dL</em>.</p><p><em>Interpretation:</em> Indicates prevalence of moderately elevated triglycerides. Lower percentages are better.</p>`
    },
    'tg_is_high_percentage': {
        displayName: '% TG >200 mg/dL (High)',
        dataKey: 'tg_is_high_percentage',
        type: 'goodIsLow',
        breaks: [10, 15, 20, 25],
        colors: GOOD_LOW_COLORS,
        unit: '%',
        description: `<p><strong>Percentage with High Triglycerides:</strong></p><p>Percentage of individuals with Triglycerides <em>>200 mg/dL</em> (High or Very High).</p><p><em>Interpretation:</em> Direct measure of elevated triglycerides. Lower percentages are better.</p>`
    },
    'non_hdl_chol_mean': {
        displayName: 'Avg. Non-HDL Cholesterol',
        dataKey: 'non_hdl_chol_mean',
        type: 'goodIsLow',
        breaks: [130, 160, 190, 220],
        colors: GOOD_LOW_COLORS,
        unit: 'mg/dL',
        description: `<p><strong>Average Non-HDL Cholesterol:</strong></p><p>Calculated as: <em>Total Cholesterol - HDL Cholesterol</em>. Represents all "bad" cholesterol types.</p><p><em>Interpretation (General Goals are ~30mg/dL higher than LDL goals):</em> Desirable: <em><130 mg/dL</em><br/> Borderline High: <em>160-189 mg/dL</em><br/> High: <em>190-219 mg/dL</em><br/> Very High: <em>≥220 mg/dL</em></p><p>Lower values are better. Often considered a better risk marker than LDL alone, especially with high triglycerides.</p>`
    },
    'non_hdl_chol_median': {
        displayName: 'Median Non-HDL Cholesterol',
        dataKey: 'non_hdl_chol_median',
        type: 'goodIsLow',
        breaks: [130, 160, 190, 220],
        colors: GOOD_LOW_COLORS,
        unit: 'mg/dL',
        description: `<p><strong>Median Non-HDL Cholesterol:</strong></p><p>Median Non-HDL cholesterol level. See 'Avg. Non-HDL Cholesterol' for interpretation. Lower values are better.</p>`
    },
    'non_hdl_is_borderline_percentage': {
        displayName: '% Non-HDL 160-189 mg/dL (Borderline)',
        dataKey: 'non_hdl_is_borderline_percentage',
        type: 'goodIsLow',
        breaks: [10, 15, 20, 25],
        colors: GOOD_LOW_COLORS,
        unit: '%',
        description: `<p><strong>Percentage with Borderline High Non-HDL Cholesterol:</strong></p><p>Percentage of individuals with Non-HDL Cholesterol between <em>160-189 mg/dL</em>.</p><p><em>Interpretation:</em> Indicates prevalence of moderately elevated Non-HDL cholesterol. Lower percentages are better.</p>`
    },
    'non_hdl_is_high_percentage': {
        displayName: '% Non-HDL >190 mg/dL (High)',
        dataKey: 'non_hdl_is_high_percentage',
        type: 'goodIsLow',
        breaks: [5, 10, 15, 20],
        colors: GOOD_LOW_COLORS,
        unit: '%',
        description: `<p><strong>Percentage with High Non-HDL Cholesterol:</strong></p><p>Percentage of individuals with Non-HDL Cholesterol <em>>190 mg/dL</em> (High or Very High).</p><p><em>Interpretation:</em> Direct measure of high-risk Non-HDL cholesterol. Lower percentages are better.</p>`
    },
    'tc_hdl_ratio_mean': {
        displayName: 'Avg. TC/HDL Ratio',
        dataKey: 'tc_hdl_ratio_mean',
        type: 'goodIsLow',
        breaks: [3.5, 4.0, 5.0, 6.0],
        colors: GOOD_LOW_COLORS,
        unit: '',
        description: `<p><strong>Average TC/HDL Ratio:</strong></p><p>Ratio of Total Cholesterol to HDL Cholesterol. A strong predictor of heart disease risk.</p><p><em>Interpretation:</em> Desirable: <em><3.5</em><br/> Good: <em><5.0</em><br/> High Risk: <em>≥5.0</em></p><p>Lower ratios are better.</p>`
    },
    'tc_hdl_ratio_median': {
        displayName: 'Median TC/HDL Ratio',
        dataKey: 'tc_hdl_ratio_median',
        type: 'goodIsLow',
        breaks: [3.5, 4.0, 5.0, 6.0],
        colors: GOOD_LOW_COLORS,
        unit: '',
        description: `<p><strong>Median TC/HDL Ratio:</strong></p><p>Median TC/HDL ratio. See 'Avg. TC/HDL Ratio' for interpretation. Lower ratios are better.</p>`
    },
    'tc_hdl_ratio_is_high_percentage': {
        displayName: '% TC/HDL Ratio ≥5.0 (High Risk)',
        dataKey: 'tc_hdl_ratio_is_high_percentage',
        type: 'goodIsLow',
        breaks: [10, 20, 30, 40],
        colors: GOOD_LOW_COLORS,
        unit: '%',
        description: `<p><strong>Percentage with High TC/HDL Ratio:</strong></p><p>Percentage of individuals with a TC/HDL Ratio <em>≥5.0</em>, indicating high risk.</p><p><em>Interpretation:</em> A higher percentage means more individuals are at high risk based on this ratio. Lower percentages are better.</p>`
    },
    'ldl_hdl_ratio_mean': {
        displayName: 'Avg. LDL/HDL Ratio',
        dataKey: 'ldl_hdl_ratio_mean',
        type: 'goodIsLow',
        breaks: [2.0, 2.5, 3.0, 3.5],
        colors: GOOD_LOW_COLORS,
        unit: '',
        description: `<p><strong>Average LDL/HDL Ratio:</strong></p><p>Ratio of LDL Cholesterol to HDL Cholesterol.</p><p><em>Interpretation:</em> Desirable: <em><2.5</em> (some sources say <2.0)<br/> Acceptable: <em><3.5</em><br/> High Risk: <em>>3.5</em></p><p>Lower ratios are better.</p>`
    },
    'ldl_hdl_ratio_median': {
        displayName: 'Median LDL/HDL Ratio',
        dataKey: 'ldl_hdl_ratio_median',
        type: 'goodIsLow',
        breaks: [2.0, 2.5, 3.0, 3.5],
        colors: GOOD_LOW_COLORS,
        unit: '',
        description: `<p><strong>Median LDL/HDL Ratio:</strong></p><p>Median LDL/HDL ratio. See 'Avg. LDL/HDL Ratio' for interpretation. Lower ratios are better.</p>`
    },
    'ldl_hdl_ratio_is_high_percentage': {
        displayName: '% LDL/HDL Ratio >3.5 (High Risk)',
        dataKey: 'ldl_hdl_ratio_is_high_percentage',
        type: 'goodIsLow',
        breaks: [5, 10, 15, 25],
        colors: GOOD_LOW_COLORS,
        unit: '%',
        description: `<p><strong>Percentage with High LDL/HDL Ratio:</strong></p><p>Percentage of individuals with an LDL/HDL Ratio <em>>3.5</em>, indicating high risk.</p><p><em>Interpretation:</em> A higher percentage suggests more individuals at higher risk. Lower percentages are better.</p>`
    },
    'patient_month_count': {
        displayName: 'Patient-Month Count',
        dataKey: 'patient_month_count',
        type: 'neutral',
        breaks: [1000, 5000, 10000, 20000],
        colors: NEUTRAL_COLORS,
        unit: 'records',
        description: `<p><strong>Patient-Month Count:</strong></p><p>This represents the total number of patient-months of data available for this ZIP code area. A patient-month is one patient's data for one month.</p><p><em>Interpretation:</em> Higher counts generally indicate that the health statistics for this area are based on a larger and potentially more reliable dataset. It's not a direct health measure itself.</p>`
    }
};

let currentMetricKey = 'composite_risk_score_mean'; // Initial metric

// --- Map Initialization and Core Logic (reconstructed based on typical Leaflet setup) ---
const map = L.map('map').setView([18.2208, -66.5901], 9); // Centered on Puerto Rico
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

let geojsonLayer = null;
let selectedLayer = null;

// DOM Elements
const metricSelect = document.getElementById('metric-select');
const legendDiv = document.getElementById('legend');
const infoPanel = document.getElementById('info-panel');
const metricDescriptionPanel = document.getElementById('metric-description');

// Populate metric select dropdown
Object.keys(metricConfigs).forEach(key => {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = metricConfigs[key].displayName;
    metricSelect.appendChild(option);
});
metricSelect.value = currentMetricKey;

// --- Core Functions (implementations for a working map) ---

function getColor(value, metricKey) {
    const config = metricConfigs[metricKey];
    if (!config || value === undefined || value === null || isNaN(value)) {
        return '#ccc'; // Default for no data, missing config, or non-numeric value
    }

    const breaks = config.breaks; // e.g., [100, 130, 160, 190]
    const colors = config.colors; // 5 colors for 4 breaks ( <b1, b1-b2, b2-b3, b3-b4, >b4 )
    
    for (let i = 0; i < breaks.length; i++) {
        if (value < breaks[i]) {
            return colors[i];
        }
    }
    return colors[breaks.length]; // Value is >= last break, or if breaks/colors are misconfigured
}

function style(feature) {
    // Attempt to get postal code from common GeoJSON properties
    const postalCodePropertyKeys = ['ZCTA5CE10', 'GEOID', 'postal', 'zip']; // Add other potential keys
    let postalCode;
    for (const key of postalCodePropertyKeys) {
        if (feature.properties && feature.properties[key]) {
            postalCode = feature.properties[key];
            break;
        }
    }

    const stats = healthStatsLookup[postalCode] || {};
    const value = stats[metricConfigs[currentMetricKey]?.dataKey];
    
    return {
        fillColor: getColor(value, currentMetricKey),
        weight: 1,
        opacity: 1,
        color: '#666', // Darker border for better visibility
        dashArray: '',  // Solid line
        fillOpacity: 0.7
    };
}

function highlightFeature(e) {
    const layer = e.target;
    layer.setStyle({
        weight: 3,
        color: '#333', // Even darker for highlight
        dashArray: '',
        fillOpacity: 0.9
    });
    if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
        layer.bringToFront();
    }
}

function resetHighlight(e) {
    if (geojsonLayer && selectedLayer !== e.target) {
        geojsonLayer.resetStyle(e.target);
    }
}

function selectFeature(e) {
    if (selectedLayer && geojsonLayer) {
        geojsonLayer.resetStyle(selectedLayer);
    }
    selectedLayer = e.target;
    highlightFeature(e); // Apply highlight style
    
    // Optional: Fit bounds to selected feature
    // map.fitBounds(e.target.getBounds()); 
    
    updateInfoPanel(selectedLayer.feature.properties);
}

function onEachFeature(feature, layer) {
    layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlight,
        click: selectFeature
    });
}

function updateInfoPanel(props) {
    if (props) {
        const postalCodePropertyKeys = ['ZCTA5CE10', 'GEOID', 'postal', 'zip'];
        let postalCode = "N/A";
        for (const key of postalCodePropertyKeys) {
            if (props[key]) {
                postalCode = props[key];
                break;
            }
        }
        
        const areaStats = healthStatsLookup[postalCode] || {};
        let content = `<h3>ZIP Code: ${postalCode}</h3>`;
        const currentConfig = metricConfigs[currentMetricKey];
        
        if (currentConfig) {
            const value = areaStats[currentConfig.dataKey];
            const unit = currentConfig.unit || '';
            const displayValue = (value !== undefined && value !== null && !isNaN(value)) 
                                 ? parseFloat(value).toFixed(2) + (unit ? ' ' + unit : '') 
                                 : 'No data';
            content += `<div class="data-item">
                          <span class="data-label">${currentConfig.displayName}:</span>
                          <span class="data-value">${displayValue}</span>
                        </div>`;
        }

        const patientCount = areaStats.patient_month_count;
        content += `<p class="data-item"><span class="data-label">Patient-Month Count:</span> <span class="data-value">${patientCount !== undefined ? patientCount : 'N/A'}</span></p>`;
        
        infoPanel.innerHTML = content;
    } else {
        infoPanel.innerHTML = '<p class="placeholder-text">Click on a ZIP code area on the map to see details.</p>';
    }
}

function updateLegend(metricKey) {
    const config = metricConfigs[metricKey];
    if (!config) {
        legendDiv.innerHTML = '<p class="placeholder-text">Legend not available.</p>';
        return;
    }

    const breaks = config.breaks;
    const colors = config.colors;
    const unit = config.unit || '';
    let legendHTML = `<strong>${config.displayName}${unit ? ' (' + unit + ')' : ''}</strong><br>`;

    legendHTML += `<span><i style="background:${colors[0]}"></i> < ${breaks[0]}</span>`;
    for (let i = 0; i < breaks.length - 1; i++) {
        legendHTML += `<span><i style="background:${colors[i+1]}"></i> ${breaks[i]} – <${breaks[i+1]}</span>`;
    }
    legendHTML += `<span><i style="background:${colors[colors.length - 1]}"></i> ≥ ${breaks[breaks.length - 1]}</span>`;
    legendHTML += '<span><i style="background:#ccc"></i> No Data</span>';
    
    legendDiv.innerHTML = legendHTML;
}

function updateMetricDescription(metricKey) {
    const config = metricConfigs[metricKey];
    if (config && config.description) {
        metricDescriptionPanel.innerHTML = config.description;
    } else {
        metricDescriptionPanel.innerHTML = '<p class="placeholder-text">Description not available for this indicator.</p>';
    }
}

// Event listener for metric selection
metricSelect.addEventListener('change', function() {
    currentMetricKey = this.value;
    if (geojsonLayer) {
        geojsonLayer.setStyle(style); // Re-style the map based on new metric
    }
    updateLegend(currentMetricKey);
    updateMetricDescription(currentMetricKey);
    if (selectedLayer) { // If a feature is selected, update its info panel
        updateInfoPanel(selectedLayer.feature.properties);
    } else { // Otherwise, show default info panel text
        updateInfoPanel(null);
    }
});

// Initial setup
if (geojsonData && geojsonData.features && geojsonData.features.length > 0) {
    geojsonLayer = L.geoJson(geojsonData, {
        style: style,
        onEachFeature: onEachFeature
    }).addTo(map);
    
    // Initial UI updates
    updateLegend(currentMetricKey);
    updateMetricDescription(currentMetricKey);
    updateInfoPanel(null); // No initial selection
} else {
    console.error("GeoJSON data is empty or not loaded properly. Map layer cannot be added.");
    map. όταν(div => div.innerHTML = '<p style="text-align:center; padding-top: 20px;">Map data unavailable.</p>'); // Display message on map
    legendDiv.innerHTML = '<p class="placeholder-text">Map data unavailable.</p>';
    metricDescriptionPanel.innerHTML = '<p class="placeholder-text">Map data unavailable.</p>';
    infoPanel.innerHTML = '<p class="placeholder-text">Map data unavailable.</p>';
}