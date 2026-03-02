// --- Data from Django context ---
const geojsonData ="{{ geojson_data|safe }}";
const healthStatsRawData = "{{ health_stats_data|safe }}";
const sdohRawData = "{{ sdoh_data|safe }}";
const sdohVariableMap = "{{ sdoh_variable_map_json|safe }}";

// --- Global Variables ---
let healthStatsLookup = {};
let sdohDataLookup = {};
// let sdohVariableMap = {}; // Removed redeclaration to avoid error
let currentHealthMetricKey = "AO_High";
let currentSDoHMetricKey = "POS_MIN_DIST_ED";
let geojsonLayer;
let healthRiskCirclesLayerGroup = L.layerGroup();
let selectedLayer = null;

const riskCalculationDescriptions = {
    "Risk of Coronary Heart Disease":
        "Coronary Heart Disease risk is often assessed using ratios like TC/HDL (Total Cholesterol to HDL). <br> - TC/HDL < 4.0: Low Risk <br> - TC/HDL 4.0-5.0: Moderate Risk <br> - TC/HDL > 5.0: High Risk",
    "Risk of Arterial Obstruction":
        "Arterial Obstruction risk can be indicated by LDL/HDL ratios. <br> - LDL/HDL < 2.5: Low Risk <br> - LDL/HDL 2.5-3.5: Moderate Risk <br> - LDL/HDL > 3.5: High Risk",
    "Risk of Heart Attack or Atherosclerosis":
        "Risk of Heart Attack or Atherosclerosis can be evaluated using Non-HDL Cholesterol levels. <br> - Non-HDL < 130 mg/dL: Low Risk <br> - Non-HDL 130-160 mg/dL: Moderate Risk <br> - Non-HDL > 160 mg/dL: High Risk",
};

healthStatsLookup = healthStatsRawData || {};
if (Array.isArray(sdohRawData)) {
    sdohRawData.forEach((item) => {
        if (item.COUNTY && item.YEAR === 2020)
            sdohDataLookup[item.COUNTY] = item;
    });
} else {
    console.warn("SDoH data not array");
}
if (geojsonData?.features && Object.keys(healthStatsLookup).length > 0) {
    geojsonData.features.forEach((feature) => {
        const municipalityName = feature.properties.NAME;
        if (municipalityName) {
            feature.properties.healthData =
                healthStatsLookup[municipalityName] || null;
        } else {
            feature.properties.healthData = null;
        }
    });
} else {
    console.warn("GeoJSON features or healthStatsLookup is missing/empty.");
}

// --- FIXED Styling Functions ---
function getHealthColor(value, metricKey) {
    const config = filteredHealthMetricConfigs[metricKey];
    if (!config || value === null || value === undefined || isNaN(value))
        return "#E0E0E0"; // Default for no/invalid data

    const { breaks, colors } = config;
    if (!breaks || !colors || breaks.length === 0 || colors.length === 0) {
        console.warn(
            `Color configuration missing for health metric ${metricKey}`
        );
        return "#E0E0E0";
    }

    // Ensure enough colors for the breaks
    if (colors.length < breaks.length + 1) {
        console.warn(
            `Health colors array too short for ${metricKey}. Needs ${breaks.length + 1
            }, got ${colors.length}.`
        );
        // Fallback to last available color or grey
        return colors[colors.length - 1] || "#E0E0E0";
    }

    for (let i = 0; i < breaks.length; i++) {
        if (value <= breaks[i]) {
            return colors[i];
        }
    }
    // Value is greater than all breaks, use the color for the highest category
    return colors[breaks.length];
}

function getSDoHColor(value, metricKey) {
    const config = sdohMetricConfigs[metricKey];
    if (!config || value === null || value === undefined || isNaN(value))
        return "transparent"; // transparent for SDoH no-data
    const { breaks, colors } = config;
    if (!breaks || !colors || breaks.length === 0 || colors.length === 0) {
        console.error(`Invalid breaks/colors for SDoH: ${metricKey}`);
        return "#DDDDDD";
    }
    if (colors.length < breaks.length + 1)
        console.warn(`SDoH colors array short for ${metricKey}.`);
    for (let i = 0; i < breaks.length; i++) {
        if (value <= breaks[i]) return colors[i] || "#DDDDDD";
    }
    return colors[breaks.length] || colors[colors.length - 1] || "#DDDDDD"; // Use colors[breaks.length] if possible
}

function styleHealthLayer(feature) {
    const municipalityName = feature.properties.NAME;
    const sdohMuniData = sdohDataLookup[municipalityName];
    let sdohValue = null;
    if (sdohMuniData) {
        sdohValue = sdohMuniData[currentSDoHMetricKey];
    }
    return {
        fillColor: getSDoHColor(sdohValue, currentSDoHMetricKey),
        weight: 1.5,
        opacity: 1,
        color: "#555",
        fillOpacity: 0.9,
    };
}

// --- FIXED Circle Radius Function ---
function getHealthRiskCircleRadius(value, valueForMaxRadius) {
    const minRadius = 5;
    const maxRadius = 16;

    if (value === null || value === undefined || isNaN(value) || value <= 0) {
        return minRadius / 2; // Smallest radius for zero or no data
    }

    let radius;
    if (valueForMaxRadius <= 0) {
        // Avoid division by zero or negative scaling factor
        // If the max value for scaling is zero or less, and value is positive,
        // it implies an unusual data state. Default to minRadius.
        radius = minRadius;
    } else {
        // Scale radius: 'value' relative to 'valueForMaxRadius'.
        // If value > valueForMaxRadius, it will be clamped by Math.min later.
        radius =
            minRadius + (value / valueForMaxRadius) * (maxRadius - minRadius);
    }
    // Ensure radius is within [minRadius/2, maxRadius]
    return Math.max(minRadius / 2, Math.min(maxRadius, radius));
}

function highlightFeature(e) {
    const layer = e.target;
    if (layer !== selectedLayer) {
        layer.setStyle({ weight: 3, color: "#051B35", fillOpacity: 0.8 });
    }
    if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
        if (layer !== selectedLayer) layer.bringToFront();
    }
}

function resetHighlight(e) {
    if (e.target !== selectedLayer) {
        geojsonLayer.resetStyle(e.target);
    }
}

function selectFeature(e) {
    const layer = e.target;
    if (selectedLayer && selectedLayer !== layer) {
        try {
            geojsonLayer.resetStyle(selectedLayer);
        } catch (error) {
            console.warn("Error resetting style on previous selection:", error);
        }
    }
    map.fitBounds(layer.getBounds().pad(0.1));
    layer.setStyle({
        weight: 4,
        color: "#020c1a",
        dashArray: "",
        fillOpacity: 0.99,
    });
    layer.bringToFront();
    selectedLayer = layer;
    updateInfoPanel(layer.feature.properties);
}

function onEachFeature(feature, layer) {
    layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlight,
        click: selectFeature,
    });
}

function updateInfoPanel(muniProps) {
    if (!muniProps?.NAME) {
        infoPanel.innerHTML =
            '<p class="placeholder-text">Click on a municipality on the map to see details.</p>';
        return;
    }
    const municipalityName = muniProps.NAME;
    const healthData = muniProps.healthData;
    const sdohData = sdohDataLookup[municipalityName] || null;

    let content = `<h3>Municipality: ${municipalityName}</h3>`;

    content += `<hr style="margin:10px 0;"><h4>SDoH Indicator (Outline)</h4>`;
    if (sdohData) {
        const sc = sdohMetricConfigs[currentSDoHMetricKey];
        const sv = sdohData[currentSDoHMetricKey];
        const sd =
            sdohVariableMap[currentSDoHMetricKey] ||
            sc?.displayName ||
            currentSDoHMetricKey;
        const sdv =
            sv !== null && !isNaN(sv)
                ? `${parseFloat(sv).toFixed(
                    sc?.type === "percentage" ? 1 : sc?.type === "count" ? 0 : 2
                )}${sc?.unit || ""}`
                : "N/A";
        content += `<p><span class="data-label">${sd}:</span> <strong class="data-value">${sdv}</strong></p>`;
    } else {
        content += `<p>No SDoH data for "${currentSDoHMetricKey}" in ${municipalityName}.</p>`;
    }

    content += `<h4 style="margin-top:15px;">Cardiovascular Health Risk (Circles)</h4>`;
    if (healthData) {
        const currentHealthConfig =
            filteredHealthMetricConfigs[currentHealthMetricKey];
        if (currentHealthConfig && currentHealthConfig.dataPath) {
            const healthValue = getNestedHealthValue(
                healthData,
                currentHealthConfig.dataPath
            );
            const displayValue =
                healthValue !== null && !isNaN(healthValue)
                    ? `${parseFloat(healthValue).toFixed(
                        currentHealthConfig.unit === "%" ? 2 : 0
                    )} ${currentHealthConfig.unit || ""}`
                    : "N/A";
            content += `<p><span class="data-label">${currentHealthConfig.displayName}:</span> <strong class="data-value">${displayValue}</strong></p>`;

            const riskTypeKey = currentHealthConfig.dataPath[0];
            const calculationInfo = riskCalculationDescriptions[riskTypeKey];
            if (calculationInfo) {
                content += `<p style="font-size:0.85em; margin-top:5px; color:#555;"><em><strong>Note on Calculation:</strong> ${calculationInfo}</em></p>`;
            }

            content += `<p style="margin-top:10px;"><small><i>Other risk levels for ${riskTypeKey}:</i></small></p>`;
            const levels = ["Low", "Moderate"];
            levels.forEach((level) => {
                const levelPath = [riskTypeKey, "percentages", level];
                const val = getNestedHealthValue(healthData, levelPath);
                const dispVal =
                    val !== null && !isNaN(val)
                        ? `${parseFloat(val).toFixed(2)}%`
                        : "N/A";
                content += `<p style="font-size:0.9em;"><span class="data-label">% ${level} Risk:</span> <span class="data-value">${dispVal}</span></p>`;
            });
            const totalEvalPath = [riskTypeKey, "total_evaluated"];
            const totalEval = getNestedHealthValue(healthData, totalEvalPath);
            const totalEvalDisp =
                totalEval !== null && !isNaN(totalEval)
                    ? `${parseFloat(totalEval).toLocaleString()}`
                    : "N/A";
            const riskShortName =
                riskTypeKey.split(" ").length > 2
                    ? riskTypeKey.split(" ")[2]
                    : riskTypeKey.split(" ")[0];
            content += `<p style="font-size:0.9em;"><span class="data-label">Total Evaluated (${riskShortName}):</span> <span class="data-value">${totalEvalDisp}</span></p>`;
        } else {
            content += `<p>Configuration for current health metric (${currentHealthMetricKey}) is incomplete.</p>`;
        }
    } else {
        content += `<p>No cardiovascular health data available for ${municipalityName}.</p>`;
    }
    infoPanel.innerHTML = content;
}

// --- FIXED Legends Update ---
function updateHealthLegend(metricKey, valueForMaxRadiusForLegend) {
    // Added valueForMaxRadiusForLegend
    const config = filteredHealthMetricConfigs[metricKey];
    healthLegendDiv.innerHTML = "";
    if (!config?.breaks?.length || !config?.colors?.length) {
        healthLegendDiv.innerHTML = "<p>Health Risk legend N/A.</p>";
        return;
    }
    const { breaks, colors, unit, displayName } = config;
    if (colors.length < breaks.length + 1) {
        healthLegendDiv.innerHTML = `<p>Legend config error for ${metricKey}.</p>`;
        return;
    }

    let html = `<h5>${displayName} (Circles)</h5>`;
    const numSteps = 5;

    let minValForLegend = Infinity,
        maxValForLegend = -Infinity;
    Object.values(healthStatsLookup).forEach((muniHealthData) => {
        if (muniHealthData) {
            const val = getNestedHealthValue(muniHealthData, config.dataPath);
            if (val !== null && !isNaN(val)) {
                minValForLegend = Math.min(minValForLegend, val);
                maxValForLegend = Math.max(maxValForLegend, val);
            }
        }
    });

    if (minValForLegend === Infinity || maxValForLegend === -Infinity) {
        // No data found
        minValForLegend = 0;
        maxValForLegend =
            breaks && breaks.length > 0 ? breaks[breaks.length - 1] * 1.2 : 30; // Fallback max
    } else if (minValForLegend === maxValForLegend) {
        // All data points are the same
        minValForLegend = Math.max(
            0,
            minValForLegend - (minValForLegend * 0.1 || 1)
        ); // slightly less for range
        maxValForLegend = maxValForLegend + (maxValForLegend * 0.1 || 1); // slightly more for range
    }
    if (maxValForLegend <= 0) maxValForLegend = 30; // ensure positive max for legend scaling

    // Use the provided valueForMaxRadiusForLegend for scaling legend circles
    // This should be the same as used for the map circles for consistency
    const effectiveLegendMaxRadiusValue =
        valueForMaxRadiusForLegend > 0
            ? valueForMaxRadiusForLegend
            : maxValForLegend;

    const valueRange = maxValForLegend - minValForLegend;
    const stepValue =
        valueRange > 0
            ? valueRange / (numSteps - 1)
            : maxValForLegend > 0
                ? maxValForLegend / numSteps
                : 1;

    for (let i = 0; i < numSteps; i++) {
        let value;
        if (valueRange > 0) {
            value =
                i === numSteps - 1
                    ? maxValForLegend
                    : minValForLegend + i * stepValue;
        } else {
            // Handle case where minVal === maxVal or no range
            value = minValForLegend + i * stepValue; // Will show steps around the single value
        }

        const radius = getHealthRiskCircleRadius(
            value,
            effectiveLegendMaxRadiusValue
        ); // Use effectiveLegendMaxRadiusValue
        const color = getHealthColor(value, metricKey);
        const precision = unit === "%" || value < 10 ? 1 : 0;
        const label = value.toFixed(precision);
        html += `<div style="margin-bottom: 5px;"><span class="legend-circle" style="background-color:${color}; width:${radius * 1.8
            }px; height:${radius * 1.8
            }px; border-color: #444"></span><span class="legend-circle-label"> ≈ ${label}${unit || ""
            }</span></div>`;
    }
    const noDataRadius = getHealthRiskCircleRadius(
        null,
        effectiveLegendMaxRadiusValue
    ); // Pass scaling max for consistency
    html += `<div style="margin-bottom: 5px;"><span class="legend-circle" style="background-color:#E0E0E0; width:${noDataRadius * 1.8
        }px; height:${noDataRadius * 1.8
        }px; border-color: #666"></span><span class="legend-circle-label"> No Data / ≤0</span></div>`;
    healthLegendDiv.innerHTML = html;
}

function updateSDoHLegend(metricKey) {
    const config = sdohMetricConfigs[metricKey];
    const variableDesc = sdohVariableMap[metricKey] || metricKey;
    sdohLegendDiv.innerHTML = "";
    if (!config?.breaks?.length || !config?.colors?.length) {
        sdohLegendDiv.innerHTML = `<p>SDoH Legend N/A.</p>`;
        return;
    }
    const { breaks, colors, unit, type } = config;
    if (colors.length < breaks.length + 1) {
        sdohLegendDiv.innerHTML = `<p>Legend config error.</p>`;
        return;
    }

    let html = `<h5>${variableDesc} (Municipality Outline)</h5>`;
    const p =
        type === "percentage" || unit === "%" ? 1 : type === "count" ? 0 : 2;

    html += `<span><i style="background:${colors[0]
        }"></i> ≤ ${breaks[0].toFixed(p)} ${unit || ""}</span>`;
    for (let i = 0; i < breaks.length - 1; i++) {
        html += `<span><i style="background:${colors[i + 1]}"></i> ${breaks[
            i
        ].toFixed(p)} - ${breaks[i + 1].toFixed(p)} ${unit || ""}</span>`;
    }
    html += `<span><i style="background:${colors[breaks.length] || colors[colors.length - 1]
        }"></i> > ${breaks[breaks.length - 1].toFixed(p)} ${unit || ""}</span>`; // Use colors[breaks.length]
    html += `<span><i style="background:#transparent; border: 1px solid #ccc;"></i> No Data / N/A</span>`; // For transparent SDoH no-data
    sdohLegendDiv.innerHTML = html;
}

healthMetricSelect.addEventListener("change", function () {
    currentHealthMetricKey = this.value;
    drawHealthRiskCircles(); // This will now internally calculate V_max and legend will be updated with it
    updateDescriptionPanel(
        healthMetricDescriptionPanel,
        currentHealthMetricKey,
        filteredHealthMetricConfigs
    );
    if (selectedLayer) {
        updateInfoPanel(selectedLayer.feature.properties);
    } else {
        updateInfoPanel(null);
    }
});

sdohSelect.addEventListener("change", function () {
    currentSDoHMetricKey = this.value;
    if (!sdohMetricConfigs[currentSDoHMetricKey]) {
        console.error(`Config missing for SDoH key: ${currentSDoHMetricKey}`);
        sdohLegendDiv.innerHTML = `<p>Viz config missing.</p>`;
        if (geojsonLayer) {
            geojsonLayer.setStyle(styleHealthLayer); // Redraw with default/error style potentially
        }
        updateDescriptionPanel(
            sdohDescriptionPanel,
            currentSDoHMetricKey,
            null,
            sdohVariableMap
        );
        return;
    }
    if (geojsonLayer) {
        geojsonLayer.setStyle(styleHealthLayer);
    }
    updateSDoHLegend(currentSDoHMetricKey);
    updateDescriptionPanel(
        sdohDescriptionPanel,
        currentSDoHMetricKey,
        sdohMetricConfigs,
        sdohVariableMap
    );
    if (selectedLayer) {
        updateInfoPanel(selectedLayer.feature.properties);
    }
});

if (geojsonData?.features?.length > 0) {
    geojsonLayer = L.geoJson(geojsonData, {
        style: styleHealthLayer,
        onEachFeature: onEachFeature,
    }).addTo(map);
} else {
    document.getElementById("map").innerHTML =
        "<p>Could not load map boundary data (municipalities).</p>";
}

// --- FIXED Drawing Layers ---
function drawHealthRiskCircles() {
    healthRiskCirclesLayerGroup.clearLayers();
    let circlesAddedCount = 0;
    let dataErrors = 0;

    const healthConfig = filteredHealthMetricConfigs[currentHealthMetricKey];
    if (!healthConfig || !healthConfig.dataPath) {
        console.error("Health config or dataPath missing for current metric.");
        updateHealthLegend(currentHealthMetricKey, 30); // Fallback V_max for legend
        return;
    }

    // 1. Calculate the actual maximum value for the current health metric from the data
    let V_max_for_scaling = 0;
    let validValuesFound = false;
    geojsonData.features.forEach((feature) => {
        const healthDataForMuni = feature.properties.healthData;
        if (healthDataForMuni) {
            const val = getNestedHealthValue(
                healthDataForMuni,
                healthConfig.dataPath
            );
            if (val !== null && !isNaN(val) && val > 0) {
                // Consider only positive values for max
                V_max_for_scaling = Math.max(V_max_for_scaling, val);
                validValuesFound = true;
            }
        }
    });

    // If no positive values found, or max is 0, fallback strategy for V_max_for_scaling
    if (!validValuesFound || V_max_for_scaling <= 0) {
        if (healthConfig.breaks && healthConfig.breaks.length > 0) {
            V_max_for_scaling =
                healthConfig.breaks[healthConfig.breaks.length - 1] * 1.2; // Use last break * 1.2
        } else {
            V_max_for_scaling = 30; // Absolute fallback
        }
        if (V_max_for_scaling <= 0) V_max_for_scaling = 30; // Ensure it's positive
    }

    geojsonData.features.forEach((feature) => {
        const municipalityName = feature.properties.NAME;
        const healthDataForMuni = feature.properties.healthData;
        const sdohMuniData = sdohDataLookup[municipalityName];

        if (
            municipalityName &&
            healthDataForMuni &&
            sdohMuniData &&
            typeof sdohMuniData.lat === "number" &&
            typeof sdohMuniData.lon === "number"
        ) {
            const healthRiskValue = getNestedHealthValue(
                healthDataForMuni,
                healthConfig.dataPath
            );

            // Pass V_max_for_scaling to getHealthRiskCircleRadius
            const radius = getHealthRiskCircleRadius(
                healthRiskValue,
                V_max_for_scaling
            );
            const color = getHealthColor(healthRiskValue, currentHealthMetricKey);

            const displayValue =
                healthRiskValue !== null && !isNaN(healthRiskValue)
                    ? `${parseFloat(healthRiskValue).toFixed(1)}${healthConfig.unit || ""
                    }`
                    : "N/A";

            const circle = L.circleMarker([sdohMuniData.lat, sdohMuniData.lon], {
                radius: radius,
                fillColor: color,
                color: "#333333",
                weight: 0.75,
                opacity: 0.8,
                fillOpacity: 0.9,
                pane: "healthRiskPane",
            });

            circle.bindTooltip(
                `<b>${municipalityName}</b><br>${healthConfig.displayName}: ${displayValue}`,
                { sticky: true }
            );
            healthRiskCirclesLayerGroup.addLayer(circle);
            circlesAddedCount++;
        } else {
            dataErrors++;
        }
    });
    // Update legend, passing the same V_max_for_scaling so legend items are scaled consistently
    updateHealthLegend(currentHealthMetricKey, V_max_for_scaling);
}

updateSDoHLegend(currentSDoHMetricKey);
drawHealthRiskCircles(); // Initial draw
updateInfoPanel(null);
