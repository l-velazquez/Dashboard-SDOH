// ── Data ──────────────────────────────────────────────────────────────────────

const HEALTH_METRICS = [
  { key: 'CHD_High',    label: 'CHD\nHigh Risk',         short: 'CHD',       path: ['Risk of Coronary Heart Disease', 'percentages', 'High'],              unit: '%', badIsHigh: true },
  { key: 'AO_High',     label: 'Arterial\nObstruction',  short: 'Arterial',  path: ['Risk of Arterial Obstruction', 'percentages', 'High'],                  unit: '%', badIsHigh: true },
  { key: 'HA_High',     label: 'Heart\nAttack',          short: 'Heart Atk', path: ['Risk of Heart Attack or Atherosclerosis', 'percentages', 'High'],       unit: '%', badIsHigh: true },
  { key: 'VitD_Def',    label: 'Vitamin D\nDeficiency',  short: 'Vit-D Def', path: ['Vitamin D Risk', 'percentages', 'Deficiency'],                          unit: '%', badIsHigh: true },
  { key: 'eGFR_Mild',   label: 'eGFR\nMild Decline',    short: 'eGFR Mild', path: ['eGFR CKD-EPI Risk', 'percentages', 'Mild'],                             unit: '%', badIsHigh: true },
  { key: 'BCR_High',    label: 'BUN/Creat.\nHigh',       short: 'BUN High',  path: ['BUN/Creatinine Ratio Risk', 'percentages', 'High'],                     unit: '%', badIsHigh: true },
  { key: 'AST_Fib',     label: 'Liver:\nFibrosis',       short: 'Fibrosis',  path: ['AST/ALT Ratio Risk', 'percentages', 'Suggests fibrosis/active hepatitis'], unit: '%', badIsHigh: true },
  { key: 'APRI_Mod',    label: 'APRI\nModerate',         short: 'APRI Mod',  path: ['APRI Score Risk', 'percentages', 'Moderate risk'],                      unit: '%', badIsHigh: true },
  { key: 'FIB4_High',   label: 'FIB-4\nHigh Risk',       short: 'FIB-4',     path: ['FIB-4 Index Risk', 'percentages', 'High risk'],                         unit: '%', badIsHigh: true },
];

const SDOH_METRICS = [
  { key: 'ACS_PCT_UNINSURED',           label: '% Uninsured',               unit: '%',  badIsHigh: true  },
  { key: 'ACS_PCT_LT_HS',               label: '% < High School',           unit: '%',  badIsHigh: true  },
  { key: 'ACS_PCT_HH_PUB_ASSIST',       label: '% Public Assistance',       unit: '%',  badIsHigh: true  },
  { key: 'ACS_PCT_INC50_BELOW17',       label: '% Children in Poverty',     unit: '%',  badIsHigh: true  },
  { key: 'ACS_PCT_INC50_ABOVE65',       label: '% Elderly in Poverty',      unit: '%',  badIsHigh: true  },
  { key: 'ACS_PCT_HEALTH_INC_BELOW137', label: '% Below 137% FPL',          unit: '%',  badIsHigh: true  },
  { key: 'ACS_PCT_DISABLE',             label: '% Disabled',                unit: '%',  badIsHigh: true  },
  { key: 'HIFLD_MIN_DIST_UC',           label: 'Dist. Urgent Care (mi)',     unit: ' mi', badIsHigh: true },
  { key: 'POS_MIN_DIST_ED',             label: 'Dist. Emergency Dept (mi)', unit: ' mi', badIsHigh: true  },
  { key: 'ACS_PCT_POSTHS_ED',           label: '% Post-HS Education',       unit: '%',  badIsHigh: false },
  { key: 'ACS_PCT_BACHELOR_DGR',        label: "% Bachelor's Degree",       unit: '%',  badIsHigh: false },
  { key: 'ACS_PCT_HEALTH_INC_ABOVE400', label: '% Above 400% FPL',          unit: '%',  badIsHigh: false },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function getNestedVal(obj, path) {
  let cur = obj;
  for (const k of path) {
    if (cur == null || typeof cur !== 'object') return null;
    cur = cur[k];
  }
  return cur == null ? null : cur;
}

function computePearsonR(pairs) {
  const n = pairs.length;
  if (n < 3) return { r: null, slope: null, intercept: null, n };
  let sx = 0, sy = 0, sxy = 0, sx2 = 0, sy2 = 0;
  for (const p of pairs) {
    sx += p.x; sy += p.y; sxy += p.x * p.y;
    sx2 += p.x * p.x; sy2 += p.y * p.y;
  }
  const num = n * sxy - sx * sy;
  const den = Math.sqrt((n * sx2 - sx * sx) * (n * sy2 - sy * sy));
  const r = den === 0 ? 0 : num / den;
  const mx = sx / n, my = sy / n;
  const slopeNum = sxy - n * mx * my;
  const slopeDen = sx2 - n * mx * mx;
  const slope = slopeDen === 0 ? 0 : slopeNum / slopeDen;
  const intercept = my - slope * mx;
  return { r, slope, intercept, n, mx, my };
}

function getRStrength(r) {
  const a = Math.abs(r);
  if (a >= 0.7) return 'Strong';
  if (a >= 0.4) return 'Moderate';
  if (a >= 0.2) return 'Weak';
  return 'Very Weak / Negligible';
}

function getRColor(r) {
  const a = Math.abs(r);
  if (a >= 0.7) return r > 0 ? '#f87171' : '#60a5fa';
  if (a >= 0.4) return r > 0 ? '#fb923c' : '#818cf8';
  if (a >= 0.2) return '#fbbf24';
  return '#a1a1aa';
}

function getHeatColor(r) {
  if (r === null) return '#1f2937';
  const a = Math.abs(r);
  if (r > 0) {
    if (a >= 0.7) return '#dc2626';
    if (a >= 0.4) return '#f97316';
    if (a >= 0.2) return '#fbbf24';
    return '#374151';
  } else {
    if (a >= 0.7) return '#1d4ed8';
    if (a >= 0.4) return '#4f46e5';
    if (a >= 0.2) return '#7c3aed';
    return '#374151';
  }
}

function getTextColor(bgHex) {
  // Pick white or dark text depending on background brightness
  const bright = ['#fbbf24', '#f97316'];
  return bright.includes(bgHex) ? '#111' : '#f1f5f9';
}

function fmtVal(v, unit) {
  if (v == null || isNaN(v)) return 'N/A';
  const dec = unit === ' mi' ? 1 : 1;
  return parseFloat(v).toFixed(dec) + unit;
}

function median(arr) {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// ── State ─────────────────────────────────────────────────────────────────────
let healthData = {};   // { muniName: { "Risk of...": {...}, ... } }
let sdohLookup = {};   // { muniName: { ACS_PCT_...: value, ... } }
let detailChartInstance = null;
let correlationMatrix = {}; // { "sdohKey|healthKey": { r, pairs } }

// ── Build sdohLookup from array ───────────────────────────────────────────────
function buildSdohLookup(arr) {
  const lookup = {};
  for (const item of arr) {
    if (item.COUNTY && item.YEAR === 2020) {
      lookup[item.COUNTY.trim()] = item;
    }
  }
  return lookup;
}

// ── Compute pairs for one (sdoh, health) combo ────────────────────────────────
function getPairs(sdohKey, healthPath) {
  const pairs = [];
  for (const [muni, hd] of Object.entries(healthData)) {
    const sd = sdohLookup[muni];
    if (!sd) continue;
    const hv = getNestedVal(hd, healthPath);
    const sv = sd[sdohKey];
    if (hv != null && !isNaN(parseFloat(hv)) && sv != null && !isNaN(parseFloat(sv))) {
      pairs.push({ name: muni, x: parseFloat(sv), y: parseFloat(hv) });
    }
  }
  return pairs;
}

// ── Correlation Matrix ────────────────────────────────────────────────────────
function buildMatrix() {
  const result = {};
  for (const sm of SDOH_METRICS) {
    for (const hm of HEALTH_METRICS) {
      const key = `${sm.key}|${hm.key}`;
      const pairs = getPairs(sm.key, hm.path);
      const stats = computePearsonR(pairs);
      result[key] = { stats, pairs, sm, hm };
    }
  }
  return result;
}

function renderMatrix(matrix) {
  const table = document.getElementById('matrix-table');

  // Header row
  let html = '<thead><tr><th class="row-header">SDoH / Health →</th>';
  for (const hm of HEALTH_METRICS) {
    html += `<th class="col-header">${hm.label.replace('\n', '<br>')}</th>`;
  }
  html += '</tr></thead><tbody>';

  for (const sm of SDOH_METRICS) {
    html += `<tr><th class="row-header">${sm.label}</th>`;
    for (const hm of HEALTH_METRICS) {
      const key = `${sm.key}|${hm.key}`;
      const { stats } = matrix[key];
      const r = stats.r;
      const bg = getHeatColor(r);
      const fg = getTextColor(bg);
      const rDisp = r != null ? (r >= 0 ? '+' : '') + r.toFixed(2) : 'N/A';
      html += `<td class="matrix-cell" data-key="${key}" style="background:none;">
        <div class="matrix-cell-inner" style="background:${bg}; color:${fg};">
          <span class="r-val">${rDisp}</span>
        </div>
      </td>`;
    }
    html += '</tr>';
  }

  html += '</tbody>';
  table.innerHTML = html;

  // Click handlers
  table.querySelectorAll('.matrix-cell').forEach(cell => {
    cell.addEventListener('click', () => {
      table.querySelectorAll('.matrix-cell').forEach(c => c.classList.remove('selected'));
      cell.classList.add('selected');
      showDetail(matrix[cell.dataset.key]);
    });
  });
}

// ── Detail Panel ──────────────────────────────────────────────────────────────
function showDetail({ stats, pairs, sm, hm }) {
  const panel = document.getElementById('detail-panel');
  panel.classList.add('visible');
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  document.getElementById('detail-title').textContent =
    `${hm.label.replace('\n', ' ')} vs. ${sm.label}`;

  // Stats
  const { r, n } = stats;
  const rEl = document.getElementById('detail-r-number');
  const rDisp = r != null ? (r >= 0 ? '+' : '') + r.toFixed(3) : '—';
  rEl.textContent = rDisp;
  rEl.style.background = r != null ? `linear-gradient(135deg, ${getRColor(r)}, #b2dfdb)` : '';
  rEl.style.webkitBackgroundClip = 'text';
  rEl.style.backgroundClip = 'text';
  rEl.style.webkitTextFillColor = 'transparent';

  document.getElementById('detail-r-strength').textContent = r != null ? getRStrength(r) : '—';
  document.getElementById('detail-r-direction').textContent =
    r != null ? (r > 0 ? 'Positive correlation' : r < 0 ? 'Negative correlation' : 'No correlation') : '';

  const pct = r != null ? `${((r + 1) / 2 * 100).toFixed(1)}%` : '50%';
  document.getElementById('detail-r-gauge').style.left = pct;

  document.getElementById('detail-r-narrative').innerHTML = buildNarrative(r, stats, sm, hm);
  document.getElementById('detail-r-sample').textContent =
    n >= 3 ? `Based on ${n} municipalities` : 'Insufficient data (< 3 pairs)';

  // Scatter
  renderDetailScatter(pairs, stats, sm, hm);
}

function buildNarrative(r, stats, sm, hm) {
  if (r == null) return '<em>Not enough data to compute a correlation.</em>';
  const strength = getRStrength(r);
  const dir = r > 0 ? 'positive' : 'negative';
  const a = Math.abs(r);
  const r2 = (r * r * 100).toFixed(1);
  let interp = '';
  if (a >= 0.7) {
    interp = r > 0
      ? `Municipalities with higher <strong>${sm.label}</strong> tend to also have significantly higher <strong>${hm.label.replace('\n',' ')}</strong>.`
      : `Municipalities with higher <strong>${sm.label}</strong> tend to have notably lower <strong>${hm.label.replace('\n',' ')}</strong>.`;
  } else if (a >= 0.4) {
    interp = r > 0
      ? `There is a moderate tendency: higher <strong>${sm.label}</strong> is associated with higher <strong>${hm.label.replace('\n',' ')}</strong>.`
      : `There is a moderate tendency: higher <strong>${sm.label}</strong> is associated with lower <strong>${hm.label.replace('\n',' ')}</strong>.`;
  } else if (a >= 0.2) {
    interp = `There is a weak ${dir} relationship between <strong>${sm.label}</strong> and <strong>${hm.label.replace('\n',' ')}</strong>.`;
  } else {
    interp = `<strong>${sm.label}</strong> and <strong>${hm.label.replace('\n',' ')}</strong> show little to no linear relationship across municipalities.`;
  }
  return `<strong>${strength} ${dir} (r = ${r >= 0 ? '+' : ''}${r.toFixed(3)})</strong>. ${interp} The factor explains about <strong>${r2}%</strong> of the variance (R² = ${(r*r).toFixed(3)}).`;
}

function renderDetailScatter(pairs, stats, sm, hm) {
  const canvas = document.getElementById('detail-scatter-canvas');
  if (!canvas) return;
  if (detailChartInstance) { detailChartInstance.destroy(); detailChartInstance = null; }
  if (!pairs.length) return;

  const { r, slope, intercept } = stats;
  const xs = pairs.map(p => p.x);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const trendData = slope != null
    ? [{ x: minX, y: slope * minX + intercept }, { x: maxX, y: slope * maxX + intercept }]
    : [];
  const ptColor = getRColor(r ?? 0);

  detailChartInstance = new Chart(canvas, {
    data: {
      datasets: [
        {
          type: 'scatter',
          label: 'Municipalities',
          data: pairs.map(p => ({ x: p.x, y: p.y, label: p.name })),
          backgroundColor: ptColor + '99',
          borderColor: ptColor,
          borderWidth: 1,
          pointRadius: 5,
          pointHoverRadius: 7,
        },
        {
          type: 'line',
          label: 'Trend',
          data: trendData,
          borderColor: 'rgba(167,139,250,0.7)',
          borderWidth: 2,
          borderDash: [6, 3],
          pointRadius: 0,
          fill: false,
        },
      ],
    },
    options: {
      animation: { duration: 300 },
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => {
              if (ctx.datasetIndex === 0) {
                const { label, x, y } = ctx.raw;
                return [`${label}`, `${sm.label}: ${fmtVal(x, sm.unit)}`, `${hm.label.replace('\n',' ')}: ${fmtVal(y, hm.unit)}`];
              }
              return null;
            },
          },
        },
      },
      scales: {
        x: {
          title: { display: true, text: sm.label.replace('\n', ' '), color: 'rgba(255,255,255,0.5)', font: { size: 11 } },
          ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 10 } },
          grid: { color: 'rgba(255,255,255,0.06)' },
        },
        y: {
          title: { display: true, text: hm.label.replace('\n', ' '), color: 'rgba(255,255,255,0.5)', font: { size: 11 } },
          ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 10 } },
          grid: { color: 'rgba(255,255,255,0.06)' },
        },
      },
    },
  });
}

// ── Summary Statistics Table ──────────────────────────────────────────────────
function renderSummaryStats() {
  const tbody = document.getElementById('stats-table-body');
  let html = '';

  for (const hm of HEALTH_METRICS) {
    const vals = [];
    for (const [muni, hd] of Object.entries(healthData)) {
      const v = getNestedVal(hd, hm.path);
      if (v != null && !isNaN(parseFloat(v))) vals.push({ muni, v: parseFloat(v) });
    }
    if (!vals.length) continue;

    vals.sort((a, b) => a.v - b.v);
    const nums = vals.map(x => x.v);
    const mean = nums.reduce((s, x) => s + x, 0) / nums.length;
    const med = median(nums);
    const best = vals[0];       // lowest value = best (since badIsHigh)
    const worst = vals[vals.length - 1];

    html += `<tr>
      <td class="metric-name">${hm.label.replace('\n', ' ')}</td>
      <td>${mean.toFixed(2)}${hm.unit}</td>
      <td>${med.toFixed(2)}${hm.unit}</td>
      <td>
        <span class="val-good">${best.v.toFixed(2)}${hm.unit}</span><br>
        <span class="muni-pill">${best.muni}</span>
      </td>
      <td>
        <span class="val-bad">${worst.v.toFixed(2)}${hm.unit}</span><br>
        <span class="muni-pill">${worst.muni}</span>
      </td>
    </tr>`;
  }

  tbody.innerHTML = html;
}

// ── Municipality Spotlight ────────────────────────────────────────────────────
function buildIslandStats() {
  // Returns { sdohKey: { mean, std } }
  const stats = {};
  for (const sm of SDOH_METRICS) {
    const vals = Object.values(sdohLookup)
      .map(d => parseFloat(d[sm.key]))
      .filter(v => !isNaN(v));
    if (!vals.length) continue;
    const mean = vals.reduce((s, x) => s + x, 0) / vals.length;
    const std = Math.sqrt(vals.reduce((s, x) => s + (x - mean) ** 2, 0) / vals.length);
    stats[sm.key] = { mean, std };
  }
  return stats;
}

let islandSdohStats = {};

function renderSpotlight(muniName) {
  const container = document.getElementById('spotlight-content');
  if (!muniName) {
    container.innerHTML = '<div class="spotlight-placeholder">Select a municipality above to see its profile.</div>';
    return;
  }

  const sdoh = sdohLookup[muniName];
  const health = healthData[muniName];

  if (!sdoh && !health) {
    container.innerHTML = `<div class="spotlight-placeholder">No data found for ${muniName}.</div>`;
    return;
  }

  let html = '<div class="spotlight-grid">';

  // ── SDoH panel
  html += `<div class="glass-card">
    <div class="card-label">Demographic Factors vs Island Average</div>
    <div class="spotlight-table-wrapper">
      <table class="spotlight-table">
        <thead><tr><th>Factor</th><th>Value</th><th>Island Avg</th><th>Status</th></tr></thead>
        <tbody>`;

  for (const sm of SDOH_METRICS) {
    const raw = sdoh ? parseFloat(sdoh[sm.key]) : NaN;
    const isNaV = isNaN(raw);
    const ist = islandSdohStats[sm.key];
    const avg = ist ? ist.mean : null;
    const std = ist ? ist.std : null;

    let badge = '';
    if (!isNaV && avg != null && std > 0) {
      const zScore = (raw - avg) / std;
      const threshold = 0.5;
      if (sm.badIsHigh) {
        if (zScore > threshold)       badge = `<span class="badge-above">&#8679; Above avg</span>`;
        else if (zScore < -threshold) badge = `<span class="badge-below">&#8681; Below avg</span>`;
        else                          badge = `<span class="badge-avg">Near avg</span>`;
      } else {
        // higher is better
        if (zScore > threshold)       badge = `<span class="badge-below">&#8679; Above avg</span>`;
        else if (zScore < -threshold) badge = `<span class="badge-above">&#8681; Below avg</span>`;
        else                          badge = `<span class="badge-avg">Near avg</span>`;
      }
    }

    html += `<tr>
      <td class="field-name">${sm.label}</td>
      <td>${isNaV ? 'N/A' : fmtVal(raw, sm.unit)}</td>
      <td>${avg != null ? fmtVal(avg, sm.unit) : 'N/A'}</td>
      <td>${badge}</td>
    </tr>`;
  }

  html += '</tbody></table></div></div>';

  // ── Health panel
  html += `<div class="glass-card">
    <div class="card-label">Health Outcomes vs Island Average</div>
    <div class="spotlight-table-wrapper">
      <table class="spotlight-table">
        <thead><tr><th>Metric</th><th>Value</th><th>Island Avg</th><th>Status</th></tr></thead>
        <tbody>`;

  for (const hm of HEALTH_METRICS) {
    const raw = health ? parseFloat(getNestedVal(health, hm.path)) : NaN;
    const isNaV = isNaN(raw);

    // compute island avg for this health metric
    const vals = Object.values(healthData)
      .map(hd => parseFloat(getNestedVal(hd, hm.path)))
      .filter(v => !isNaN(v));
    const avg = vals.length ? vals.reduce((s, x) => s + x, 0) / vals.length : null;
    const std2 = avg != null
      ? Math.sqrt(vals.reduce((s, x) => s + (x - avg) ** 2, 0) / vals.length)
      : null;

    let badge = '';
    if (!isNaV && avg != null && std2 > 0) {
      const z = (raw - avg) / std2;
      const t = 0.5;
      if (z > t)        badge = `<span class="badge-above">&#8679; Above avg</span>`;
      else if (z < -t)  badge = `<span class="badge-below">&#8681; Below avg</span>`;
      else              badge = `<span class="badge-avg">Near avg</span>`;
    }

    html += `<tr>
      <td class="field-name">${hm.label.replace('\n', ' ')}</td>
      <td>${isNaV ? 'N/A' : fmtVal(raw, hm.unit)}</td>
      <td>${avg != null ? fmtVal(avg, hm.unit) : 'N/A'}</td>
      <td>${badge}</td>
    </tr>`;
  }

  html += '</tbody></table></div></div>';
  html += '</div>';

  container.innerHTML = html;
}

// ── Populate municipality dropdown ────────────────────────────────────────────
function populateSpotlightDropdown() {
  const sel = document.getElementById('spotlight-select');
  const names = [...new Set([
    ...Object.keys(healthData),
    ...Object.keys(sdohLookup),
  ])].sort();
  for (const name of names) {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    sel.appendChild(opt);
  }
  sel.addEventListener('change', () => renderSpotlight(sel.value));
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  Promise.all([
    fetch('./data/cardio_vitd_hepatic_kidney.json').then(r => r.json()),
    fetch('./data/sdoh_by_municipality.json').then(r => r.json()),
  ])
    .then(([hd, sdoh]) => {
      healthData = hd;
      sdohLookup = buildSdohLookup(sdoh);
      islandSdohStats = buildIslandStats();

      correlationMatrix = buildMatrix();
      renderMatrix(correlationMatrix);
      renderSummaryStats();
      populateSpotlightDropdown();

      // Hide loading overlay
      document.getElementById('loading-overlay').style.display = 'none';
    })
    .catch(err => {
      console.error('Failed to load analytics data:', err);
      const ov = document.getElementById('loading-overlay');
      ov.innerHTML = '<p style="color:#f87171;">Failed to load data. Please check the console.</p>';
    });
});
