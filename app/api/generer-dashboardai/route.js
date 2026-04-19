import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ════════════════════════════════════════════════════════════════
// THEME TOKENS
// ════════════════════════════════════════════════════════════════
const THEMES = {
  dark: {
    bg: '#080d19', bg2: '#0f1729', bg3: '#162040', card: '#111827',
    border: '#1e2d4a', text: '#e8f0fe', text2: '#6b87b0', text3: '#3a5070',
    accent: '#3b82f6', accent2: '#8b5cf6', green: '#10b981',
    red: '#ef4444', amber: '#f59e0b', cyan: '#06b6d4',
  },
  light: {
    bg: '#f8fafc', bg2: '#ffffff', bg3: '#f1f5f9', card: '#ffffff',
    border: '#e2e8f0', text: '#0f172a', text2: '#64748b', text3: '#94a3b8',
    accent: '#3b82f6', accent2: '#8b5cf6', green: '#059669',
    red: '#dc2626', amber: '#d97706', cyan: '#0891b2',
  },
  purple: {
    bg: '#1e1b4b', bg2: '#312e81', bg3: '#3730a3', card: '#2e2b72',
    border: '#4338ca', text: '#ede9fe', text2: '#a5b4fc', text3: '#6d6aaa',
    accent: '#818cf8', accent2: '#c4b5fd', green: '#34d399',
    red: '#f87171', amber: '#fbbf24', cyan: '#22d3ee',
  },
  green: {
    bg: '#022c22', bg2: '#064e3b', bg3: '#065f46', card: '#053d35',
    border: '#047857', text: '#d1fae5', text2: '#6ee7b7', text3: '#34856a',
    accent: '#34d399', accent2: '#6ee7b7', green: '#10b981',
    red: '#f87171', amber: '#fbbf24', cyan: '#22d3ee',
  },
}

// ════════════════════════════════════════════════════════════════
// STEP 1 — Analyse schema from rows and infer KPIs / charts
// ════════════════════════════════════════════════════════════════
async function analyseSchema(rows, description, dashboardType, language) {
  const sample = rows.slice(0, 20)
  const sampleStr = JSON.stringify(sample, null, 2).slice(0, 6000)
  const columns = rows.length ? Object.keys(rows[0]) : []

  const msg = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1800,
    messages: [{
      role: 'user',
      content: `You are a data analyst. Analyse this dataset and return a JSON schema for building a dashboard.

Dashboard type: ${dashboardType}
User description: ${description}
Language: ${language}
Columns: ${columns.join(', ')}

Sample data (up to 20 rows):
${sampleStr}

Return ONLY a valid JSON object (no markdown, no backticks, no explanation):
{
  "columns": [
    {"name": "colName", "type": "number|string|date|percent|currency", "role": "kpi|metric|dimension|date|id"}
  ],
  "numericCols": ["col1", "col2"],
  "categoryCols": ["col3", "col4"],
  "dateCols": ["col5"],
  "kpis": [
    {"label": "KPI Label", "col": "columnName", "agg": "sum|avg|count|max|min", "format": "currency|percent|number", "icon": "💰"},
    {"label": "KPI Label", "col": "columnName", "agg": "avg", "format": "number", "icon": "📈"},
    {"label": "KPI Label", "col": "columnName", "agg": "count", "format": "number", "icon": "✅"},
    {"label": "KPI Label", "col": "columnName", "agg": "avg", "format": "percent", "icon": "⭐"}
  ],
  "charts": [
    {"id": "c1", "type": "bar", "title": "Chart Title", "groupBy": "categoryCol", "valueCol": "numericCol", "agg": "sum"},
    {"id": "c2", "type": "doughnut", "title": "Chart Title", "groupBy": "categoryCol", "valueCol": null, "agg": "count"},
    {"id": "c3", "type": "bar_horizontal", "title": "Chart Title", "groupBy": "categoryCol", "valueCol": "numericCol", "agg": "avg"}
  ],
  "filterCols": ["col3", "col4"],
  "searchCols": ["col1", "col2"],
  "tableCols": ["col1", "col2", "col3", "col4", "col5"],
  "insights": {
    "anomalyLogic": "Brief description of what to look for as anomaly (e.g. rows where Expenses > Budget)",
    "predictionLogic": "Brief description of prediction (e.g. project likely to succeed based on completion > 80)",
    "recommendLogic": "Brief description of recommendation (e.g. focus on highest ROI department)"
  },
  "demoRows": []
}`
    }]
  })

  const raw = msg.content[0]?.text?.trim() || '{}'
  try {
    const clean = raw.replace(/```json|```/gi, '').trim()
    return JSON.parse(clean)
  } catch {
    // Fallback schema when parsing fails
    return {
      columns: columns.map(c => ({ name: c, type: 'string', role: 'dimension' })),
      numericCols: columns.filter(c => rows.some(r => !isNaN(Number(r[c])))),
      categoryCols: columns.filter(c => rows.some(r => isNaN(Number(r[c])))),
      dateCols: [],
      kpis: [
        { label: 'Total', col: columns[1] || columns[0], agg: 'sum', format: 'number', icon: '📊' },
        { label: 'Moyenne', col: columns[1] || columns[0], agg: 'avg', format: 'number', icon: '📈' },
        { label: 'Entrées', col: columns[0], agg: 'count', format: 'number', icon: '✅' },
        { label: 'Maximum', col: columns[1] || columns[0], agg: 'max', format: 'number', icon: '🔝' },
      ],
      charts: [
        { id: 'c1', type: 'bar', title: 'Distribution', groupBy: columns[0], valueCol: columns[1] || columns[0], agg: 'count' },
        { id: 'c2', type: 'doughnut', title: 'Répartition', groupBy: columns[0], valueCol: null, agg: 'count' },
        { id: 'c3', type: 'bar_horizontal', title: 'Top valeurs', groupBy: columns[0], valueCol: columns[1] || columns[0], agg: 'sum' },
      ],
      filterCols: columns.slice(0, 2),
      searchCols: columns.slice(0, 3),
      tableCols: columns.slice(0, 8),
      insights: {
        anomalyLogic: 'Rows with extreme values',
        predictionLogic: 'Trend based on numeric columns',
        recommendLogic: 'Focus on highest value groups',
      },
      demoRows: rows.slice(0, 5),
    }
  }
}

// ════════════════════════════════════════════════════════════════
// STEP 2 — Ask Claude for data-intelligence snippets ONLY
//           (insight text, KPI labels, anomaly detection logic)
// ════════════════════════════════════════════════════════════════
async function generateInsightSnippets(schema, rows, description, language) {
  const sample = rows.slice(0, 10)
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1200,
    messages: [{
      role: 'user',
      content: `You are a business analyst. Based on this data sample, generate insight text snippets for a dashboard.

Description: ${description}
Language: ${language}
Sample data: ${JSON.stringify(sample, null, 2).slice(0, 3000)}
Schema insights: ${JSON.stringify(schema.insights)}

Return ONLY valid JSON (no markdown):
{
  "anomalies": ["anomaly text 1", "anomaly text 2", "anomaly text 3"],
  "predictions": ["prediction text 1", "prediction text 2", "prediction text 3"],
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"]
}`
    }]
  })

  const raw = msg.content[0]?.text?.trim() || '{}'
  try {
    return JSON.parse(raw.replace(/```json|```/gi, '').trim())
  } catch {
    return {
      anomalies: ['Analyse en cours…', 'Vérifier les valeurs extrêmes', 'Données incomplètes détectées'],
      predictions: ['Tendance positive attendue', 'Croissance modérée projetée', 'Stabilité à court terme'],
      recommendations: ['Optimiser les coûts opérationnels', 'Renforcer les segments performants', 'Améliorer le suivi des KPIs'],
    }
  }
}

// ════════════════════════════════════════════════════════════════
// STEP 3 — Assemble the complete HTML using PROVEN scaffold
//           Only the data-specific computation is dynamic
// ════════════════════════════════════════════════════════════════
function buildDashboardHTML(rows, schema, insights, theme, description, language, dashboardType) {
  const t = THEMES[theme] || THEMES.dark
  const isLight = theme === 'light'

  // Serialise rows as JS literal — this is the REAL data embedded in the HTML
  const rowsJson = JSON.stringify(rows)

  // Build filter <select> options from schema
  const filterSelects = (schema.filterCols || []).slice(0, 2).map((col, idx) => `
    <div class="filter-group">
      <label class="filter-label">${col}</label>
      <select class="filter-select" id="filter${idx}" data-col="${col}" onchange="applyFilters()">
        <option value="">Tous</option>
      </select>
    </div>`).join('\n')

  // Build KPI HTML
  const kpiAccentColors = [t.accent, t.green, t.amber, t.cyan]
  const kpiCards = (schema.kpis || []).slice(0, 4).map((kpi, i) => `
    <div class="kpi-card" style="--kpi-accent:${kpiAccentColors[i] || t.accent}">
      <span class="kpi-icon">${kpi.icon || '📊'}</span>
      <div class="kpi-label">${kpi.label}</div>
      <div class="kpi-value" id="kpiVal${i}">—</div>
      <div class="kpi-trend" id="kpiTrend${i}"></div>
    </div>`).join('\n')

  // Build KPI computation JS
  const kpiCompute = (schema.kpis || []).slice(0, 4).map((kpi, i) => {
    const col = kpi.col || ''
    const agg = kpi.agg || 'count'
    let compute = ''
    if (agg === 'sum')   compute = `var v = data.reduce(function(a,r){ return a+(Number(r[${JSON.stringify(col)}])||0);},0); var formatted = fmtVal(v, ${JSON.stringify(kpi.format)});`
    if (agg === 'avg')   compute = `var nums = data.map(function(r){return Number(r[${JSON.stringify(col)}])||0;}); var v = nums.length?nums.reduce(function(a,b){return a+b;},0)/nums.length:0; var formatted = fmtVal(v, ${JSON.stringify(kpi.format)});`
    if (agg === 'count') compute = `var v = data.length; var formatted = String(v);`
    if (agg === 'max')   compute = `var v = Math.max.apply(null, data.map(function(r){return Number(r[${JSON.stringify(col)}])||0;})); var formatted = fmtVal(v, ${JSON.stringify(kpi.format)});`
    if (agg === 'min')   compute = `var v = Math.min.apply(null, data.map(function(r){return Number(r[${JSON.stringify(col)}])||0;})); var formatted = fmtVal(v, ${JSON.stringify(kpi.format)});`
    return `
    // KPI ${i}: ${kpi.label}
    (function(){
      ${compute}
      document.getElementById('kpiVal${i}').textContent = formatted;
      var trend = document.getElementById('kpiTrend${i}');
      if (trend) { trend.textContent = '${agg === 'count' ? 'total entrées' : kpi.format === 'percent' ? 'moyenne %' : agg + ' · ' + col}'; }
    })();`
  }).join('\n')

  // Build chart computation JS
  const chartColors = [t.accent, t.green, t.amber, t.cyan, t.accent2, t.red]
  const chartCompute = (schema.charts || []).slice(0, 3).map((chart, ci) => {
    const groupBy = chart.groupBy || ''
    const valueCol = chart.valueCol || ''
    const agg = chart.agg || 'count'
    const chartType = chart.type === 'bar_horizontal' ? 'bar' : (chart.type || 'bar')
    const isHorizontal = chart.type === 'bar_horizontal'
    const isDoughnut = chart.type === 'doughnut'

    let dataCompute = ''
    if (agg === 'count') {
      dataCompute = `
      var map = {};
      data.forEach(function(r){ var k=String(r[${JSON.stringify(groupBy)}]||'Other'); map[k]=(map[k]||0)+1; });`
    } else if (agg === 'sum') {
      dataCompute = `
      var map = {};
      data.forEach(function(r){ var k=String(r[${JSON.stringify(groupBy)}]||'Other'); map[k]=(map[k]||0)+(Number(r[${JSON.stringify(valueCol)}])||0); });`
    } else {
      dataCompute = `
      var map = {}; var cnt = {};
      data.forEach(function(r){ var k=String(r[${JSON.stringify(groupBy)}]||'Other'); map[k]=(map[k]||0)+(Number(r[${JSON.stringify(valueCol)}])||0); cnt[k]=(cnt[k]||0)+1; });
      Object.keys(map).forEach(function(k){ map[k]=map[k]/cnt[k]; });`
    }

    const bgColors = isDoughnut
      ? `[${chartColors.map(c => JSON.stringify(c + 'cc')).join(',')}]`
      : JSON.stringify(chartColors[ci % chartColors.length] + 'cc')

    const chartOptions = isDoughnut ? `{
        responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{ position:'bottom', labels:{ color:${JSON.stringify(t.text2)}, font:{size:10}, padding:8 }}},
        cutout:'62%'
      }` : `{
        indexAxis: ${JSON.stringify(isHorizontal ? 'y' : 'x')},
        responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{ display:false }},
        scales:{
          x:{ ticks:{color:${JSON.stringify(t.text2)},font:{size:9}}, grid:{color:'${t.border}44'}},
          y:{ ticks:{color:${JSON.stringify(t.text2)},font:{size:9},callback:function(v){return typeof v==='number'?fmtVal(v,'number'):v;}}, grid:{color:'${t.border}44'}}
        }
      }`

    return `
    // Chart ${ci+1}: ${chart.title}
    (function(){
      if(window._ch${ci}){ try{window._ch${ci}.destroy();}catch(e){} window._ch${ci}=null; }
      ${dataCompute}
      var labels = Object.keys(map).slice(0,12);
      var values = labels.map(function(k){return map[k];});
      var ctx = document.getElementById('chart${ci+1}');
      if(!ctx) return;
      window._ch${ci} = new Chart(ctx.getContext('2d'), {
        type: ${JSON.stringify(chartType)},
        data:{
          labels:labels,
          datasets:[{ data:values, backgroundColor:${bgColors}, borderRadius:${isDoughnut?0:5}, borderWidth:${isDoughnut?2:0}, borderColor:${JSON.stringify(t.card)} }]
        },
        options: ${chartOptions}
      });
    })();`
  }).join('\n')

  // Table columns
  const tableCols = (schema.tableCols || Object.keys(rows[0] || {})).slice(0, 10)

  // Insights
  const anomaliesHtml   = (insights.anomalies || []).map(t => `<li class="insight-item anomaly">${t}</li>`).join('\n')
  const predictionsHtml = (insights.predictions || []).map(t => `<li class="insight-item predict">${t}</li>`).join('\n')
  const recommendsHtml  = (insights.recommendations || []).map(t => `<li class="insight-item recommend">${t}</li>`).join('\n')

  // Filter select population
  const filterPopulate = (schema.filterCols || []).slice(0, 2).map((col, idx) => `
    var sel${idx} = document.getElementById('filter${idx}');
    if(sel${idx}){
      var vals${idx} = [...new Set(ALLDATA.map(function(r){return String(r[${JSON.stringify(col)}]||'');}).filter(Boolean))].sort();
      vals${idx}.forEach(function(v){ var o=document.createElement('option'); o.value=v; o.textContent=v; sel${idx}.appendChild(o); });
    }`).join('\n')

  // Search columns
  const searchColsJson = JSON.stringify((schema.searchCols || tableCols).slice(0, 5))

  return `<!DOCTYPE html>
<html lang="${language === 'English' ? 'en' : 'fr'}">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>${description.slice(0, 60)} · DashboardAI</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"/>
<script src="https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
:root{
  --bg:${t.bg};--bg2:${t.bg2};--bg3:${t.bg3};--card:${t.card};
  --border:${t.border};--text:${t.text};--text2:${t.text2};--text3:${t.text3};
  --accent:${t.accent};--green:${t.green};--red:${t.red};--amber:${t.amber};--cyan:${t.cyan};
}
body{background:var(--bg);color:var(--text);font-family:'Inter',sans-serif;font-size:14px;min-height:100vh;}
::-webkit-scrollbar{width:5px;height:5px;}
::-webkit-scrollbar-track{background:var(--bg2);}
::-webkit-scrollbar-thumb{background:var(--border);border-radius:4px;}

/* Topbar */
#topbar{position:sticky;top:0;z-index:100;background:${t.bg}ee;backdrop-filter:blur(20px);
  border-bottom:1px solid var(--border);padding:0 24px;height:58px;
  display:flex;align-items:center;justify-content:space-between;}
.logo{font-family:'Syne',sans-serif;font-size:18px;font-weight:800;letter-spacing:-.5px;}
.logo span{color:var(--accent);}
.badge{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;
  background:${t.accent}22;color:var(--accent);border:1px solid ${t.accent}44;
  border-radius:20px;padding:2px 8px;margin-left:8px;}
.btn{display:inline-flex;align-items:center;gap:5px;padding:7px 13px;border-radius:9px;border:none;
  font-family:'Inter',sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;
  letter-spacing:.07em;cursor:pointer;transition:all .15s;}
.btn-primary{background:var(--accent);color:${isLight?'white':'white'};}
.btn-primary:hover{filter:brightness(1.1);transform:translateY(-1px);}
.btn-ghost{background:${t.text}11;color:var(--text2);border:1px solid var(--border);}
.btn-ghost:hover{background:${t.text}22;color:var(--text);}

/* Layout */
#app{display:flex;min-height:calc(100vh - 58px);}
#sidebar{width:255px;min-height:100%;flex-shrink:0;background:var(--bg2);
  border-right:1px solid var(--border);padding:18px 14px;
  display:flex;flex-direction:column;gap:20px;}
.sidebar-title{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.15em;color:var(--text3);margin-bottom:6px;}

/* Upload zone */
#uploadZone{border:2px dashed var(--border);border-radius:12px;padding:18px 12px;
  text-align:center;cursor:pointer;transition:all .2s;background:${t.accent}05;}
#uploadZone:hover,#uploadZone.drag-over{border-color:var(--accent);background:${t.accent}12;}
#uploadZone .uico{font-size:26px;display:block;margin-bottom:7px;}
#uploadZone p{font-size:11px;color:var(--text2);font-weight:500;}
#uploadZone small{font-size:10px;color:var(--text3);}
#fileInput{display:none;}
#uploadStatus{display:none;background:${t.green}15;border:1px solid ${t.green}30;
  border-radius:9px;padding:9px 11px;font-size:11px;color:var(--green);}
#uploadFileName{font-weight:700;font-family:'DM Mono',monospace;font-size:10px;}
#uploadRowCount{color:${t.green}99;}

/* Filters */
.filter-group{display:flex;flex-direction:column;gap:5px;margin-bottom:9px;}
.filter-label{font-size:10px;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:.05em;}
.filter-input,.filter-select{width:100%;background:var(--bg3);border:1px solid var(--border);
  color:var(--text);border-radius:8px;padding:7px 9px;font-size:12px;
  font-family:'Inter',sans-serif;outline:none;transition:border-color .15s;}
.filter-input:focus,.filter-select:focus{border-color:var(--accent);}
.filter-select option{background:var(--bg3);}

/* Side stats */
.side-stat{background:var(--bg3);border:1px solid var(--border);border-radius:9px;
  padding:9px 11px;display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;}
.side-stat-label{font-size:10px;color:var(--text2);font-weight:500;}
.side-stat-value{font-size:13px;font-weight:700;font-family:'DM Mono',monospace;}

/* Main */
#main{flex:1;padding:22px 24px;display:flex;flex-direction:column;gap:20px;overflow:auto;}

/* KPI grid */
#kpiGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;}
.kpi-card{background:var(--card);border:1px solid var(--border);border-radius:13px;
  padding:17px 18px;position:relative;overflow:hidden;transition:transform .2s,box-shadow .2s;}
.kpi-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:var(--kpi-accent);}
.kpi-card:hover{transform:translateY(-2px);box-shadow:0 8px 28px ${t.bg}88;}
.kpi-icon{font-size:19px;margin-bottom:9px;display:block;}
.kpi-label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:var(--text2);margin-bottom:3px;}
.kpi-value{font-family:'Syne',sans-serif;font-size:24px;font-weight:800;color:var(--text);line-height:1;margin-bottom:5px;}
.kpi-trend{font-size:10px;font-weight:600;color:var(--text3);}

/* Charts */
#chartsGrid{display:grid;grid-template-columns:2fr 1fr 1fr;gap:12px;}
.chart-card{background:var(--card);border:1px solid var(--border);border-radius:13px;padding:17px 18px;}
.chart-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--text2);
  margin-bottom:14px;display:flex;align-items:center;gap:5px;}
.chart-title::before{content:'';display:inline-block;width:3px;height:13px;border-radius:2px;background:var(--accent);}

/* Table */
#tableSection{background:var(--card);border:1px solid var(--border);border-radius:13px;overflow:hidden;}
.table-header{padding:14px 18px;border-bottom:1px solid var(--border);
  display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;}
.table-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--text2);}
#rowBadge{font-size:10px;font-weight:700;font-family:'DM Mono',monospace;
  background:${t.accent}18;color:var(--accent);border:1px solid ${t.accent}30;border-radius:20px;padding:2px 8px;}
.table-wrap{overflow-x:auto;max-height:340px;overflow-y:auto;}
table{width:100%;border-collapse:collapse;}
thead tr{background:var(--bg3);position:sticky;top:0;z-index:2;}
th{padding:9px 12px;text-align:left;font-size:9px;font-weight:700;text-transform:uppercase;
  letter-spacing:.1em;color:var(--text3);border-bottom:1px solid var(--border);
  white-space:nowrap;cursor:pointer;user-select:none;}
th:hover{color:var(--text);}
td{padding:9px 12px;font-size:12px;color:var(--text2);border-bottom:1px solid ${t.border}55;white-space:nowrap;}
tbody tr:hover td{background:${t.accent}07;color:var(--text);}
tbody tr:last-child td{border-bottom:none;}

/* Status badges — generic */
.badge-pos{background:${t.green}18;color:var(--green);padding:2px 7px;border-radius:20px;font-size:10px;font-weight:700;}
.badge-neg{background:${t.red}18;color:var(--red);padding:2px 7px;border-radius:20px;font-size:10px;font-weight:700;}
.badge-neu{background:${t.text}11;color:var(--text2);padding:2px 7px;border-radius:20px;font-size:10px;font-weight:700;}

/* Pagination */
#pagination{padding:11px 18px;border-top:1px solid var(--border);
  display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;}
.page-info{font-size:11px;color:var(--text3);font-family:'DM Mono',monospace;}
.page-buttons{display:flex;gap:3px;}
.page-btn{min-width:27px;height:27px;border-radius:6px;background:var(--bg3);
  border:1px solid var(--border);color:var(--text2);font-size:11px;font-weight:700;
  cursor:pointer;transition:all .15s;display:flex;align-items:center;justify-content:center;}
.page-btn:hover{background:${t.accent}18;border-color:${t.accent}55;color:var(--accent);}
.page-btn.active{background:var(--accent);border-color:var(--accent);color:white;}

/* Insights */
#insightsGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;}
.insight-card{background:var(--card);border:1px solid var(--border);border-radius:13px;padding:17px 18px;}
.insight-header{display:flex;align-items:center;gap:7px;margin-bottom:12px;}
.insight-icon{width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:15px;}
.insight-icon.a{background:${t.red}15;} .insight-icon.p{background:${t.accent}15;} .insight-icon.r{background:${t.green}15;}
.insight-title{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;}
.insight-title.a{color:var(--red);} .insight-title.p{color:var(--accent);} .insight-title.r{color:var(--green);}
.insight-list{list-style:none;display:flex;flex-direction:column;gap:7px;}
.insight-item{font-size:11px;color:var(--text2);line-height:1.5;padding:7px 9px;
  background:var(--bg3);border-radius:7px;border-left:2px solid;}
.insight-item.anomaly{border-left-color:var(--red);}
.insight-item.predict{border-left-color:var(--accent);}
.insight-item.recommend{border-left-color:var(--green);}

/* Toast */
#toast{position:fixed;bottom:22px;right:22px;z-index:9999;
  background:var(--card);border:1px solid var(--border);border-radius:11px;padding:12px 16px;
  font-size:12px;color:var(--text);box-shadow:0 18px 36px ${t.bg}88;
  transform:translateY(70px);opacity:0;transition:all .28s;pointer-events:none;}
#toast.show{transform:translateY(0);opacity:1;}

/* Progress bar */
.prog-wrap{width:72px;background:var(--bg3);border-radius:4px;height:5px;overflow:hidden;display:inline-block;vertical-align:middle;}
.prog-bar{height:100%;border-radius:4px;background:var(--accent);}

@media(max-width:1100px){#chartsGrid{grid-template-columns:1fr 1fr;}#kpiGrid{grid-template-columns:repeat(2,1fr);}#insightsGrid{grid-template-columns:1fr;}}
@media(max-width:700px){#app{flex-direction:column;}#sidebar{width:100%;min-height:auto;}#kpiGrid{grid-template-columns:1fr 1fr;}#chartsGrid{grid-template-columns:1fr;}}
input[type='range']::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;border-radius:50%;background:var(--accent);cursor:pointer;border:2px solid white;}
</style>
</head>
<body>

<header id="topbar">
  <div style="display:flex;align-items:center;gap:9px;">
    <div style="width:32px;height:32px;background:linear-gradient(135deg,${t.accent},${t.accent2||t.cyan});border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:16px;">📊</div>
    <div><span class="logo">Dashboard<span>.AI</span></span><span class="badge">${dashboardType}</span></div>
  </div>
  <div style="display:flex;align-items:center;gap:8px;">
    <button class="btn btn-ghost" id="btnExportPNG">⬇ PNG</button>
    <button class="btn btn-ghost" id="btnExportPDF">⬇ PDF</button>
    <button class="btn btn-primary" id="btnRefresh">↻ Refresh</button>
  </div>
</header>

<div id="app">
  <aside id="sidebar">

    <div>
      <div class="sidebar-title">📁 Importer des données</div>
      <div id="uploadZone">
        <span class="uico">⬆</span>
        <p>Glissez CSV / JSON ici</p>
        <small>ou cliquez pour parcourir</small>
      </div>
      <input type="file" id="fileInput" accept=".csv,.json,.txt"/>
      <div id="uploadStatus" style="margin-top:7px;">
        <div id="uploadFileName"></div>
        <div id="uploadRowCount"></div>
      </div>
    </div>

    <div>
      <div class="sidebar-title">🔍 Filtres</div>
      <div class="filter-group">
        <label class="filter-label">Recherche</label>
        <input class="filter-input" id="searchInput" type="text" placeholder="Rechercher…" oninput="applyFilters()"/>
      </div>
      ${filterSelects}
    </div>

    <div>
      <div class="sidebar-title">⚡ Stats rapides</div>
      <div class="side-stat"><span class="side-stat-label">Lignes totales</span><span class="side-stat-value" id="ssTotal">—</span></div>
      <div class="side-stat"><span class="side-stat-label">Colonnes</span><span class="side-stat-value" id="ssCols">—</span></div>
      <div class="side-stat"><span class="side-stat-label">Fichier chargé</span><span class="side-stat-value" id="ssFile">démo</span></div>
    </div>

  </aside>

  <main id="main">

    <div id="kpiGrid">${kpiCards}</div>

    <div id="chartsGrid">
      ${(schema.charts || []).slice(0, 3).map((c, i) => `
      <div class="chart-card">
        <div class="chart-title">${c.title || 'Graphique ' + (i+1)}</div>
        <div style="position:relative;height:200px;"><canvas id="chart${i+1}"></canvas></div>
      </div>`).join('\n')}
    </div>

    <div id="tableSection">
      <div class="table-header">
        <div style="display:flex;align-items:center;gap:9px;">
          <span class="table-title">Données</span>
          <span id="rowBadge">0 lignes</span>
        </div>
        <button class="btn btn-ghost" style="font-size:10px;" id="btnReset">Réinitialiser</button>
      </div>
      <div class="table-wrap">
        <table><thead id="tHead"></thead><tbody id="tBody"></tbody></table>
      </div>
      <div id="pagination">
        <span class="page-info" id="pageInfo"></span>
        <div class="page-buttons" id="pageBtns"></div>
      </div>
    </div>

    <div id="insightsGrid">
      <div class="insight-card">
        <div class="insight-header"><div class="insight-icon a">🚨</div><span class="insight-title a">Anomalies</span></div>
        <ul class="insight-list">${anomaliesHtml}</ul>
      </div>
      <div class="insight-card">
        <div class="insight-header"><div class="insight-icon p">🔮</div><span class="insight-title p">Prédictions</span></div>
        <ul class="insight-list">${predictionsHtml}</ul>
      </div>
      <div class="insight-card">
        <div class="insight-header"><div class="insight-icon r">💡</div><span class="insight-title r">Recommandations</span></div>
        <ul class="insight-list">${recommendsHtml}</ul>
      </div>
    </div>

  </main>
</div>

<div id="toast"></div>

<script>
(function(){
'use strict';

// ── Embedded data (from uploaded file) ──────────────────────────
var ALLDATA = ${rowsJson};

// ── State ────────────────────────────────────────────────────────
var filteredData = ALLDATA.slice();
var currentPage  = 1;
var PAGE_SIZE    = 8;
var sortCol      = null;
var sortAsc      = true;
var TABLE_COLS   = ${JSON.stringify(tableCols)};
var SEARCH_COLS  = ${JSON.stringify((schema.searchCols || tableCols).slice(0, 5))};

// ── Format helper ─────────────────────────────────────────────────
function fmtVal(n, format) {
  n = Number(n);
  if (isNaN(n)) return '—';
  if (format === 'currency') {
    if (Math.abs(n) >= 1e6) return '$' + (n/1e6).toFixed(2) + 'M';
    if (Math.abs(n) >= 1e3) return '$' + (n/1e3).toFixed(1) + 'K';
    return '$' + n.toFixed(0);
  }
  if (format === 'percent') return n.toFixed(1) + '%';
  if (Math.abs(n) >= 1e6) return (n/1e6).toFixed(2) + 'M';
  if (Math.abs(n) >= 1e3) return (n/1e3).toFixed(1) + 'K';
  return n % 1 === 0 ? String(n) : n.toFixed(2);
}

function toast(msg, type) {
  var el = document.getElementById('toast');
  el.textContent = (type === 'success' ? '✓ ' : '✗ ') + msg;
  el.className = 'show';
  setTimeout(function(){ el.className = ''; }, 3000);
}

// ── KPIs ──────────────────────────────────────────────────────────
function renderKPIs(data) {
  ${kpiCompute}
  document.getElementById('ssTotal').textContent = data.length;
  document.getElementById('ssCols').textContent  = TABLE_COLS.length;
}

// ── Charts ────────────────────────────────────────────────────────
function renderCharts(data) {
  ${chartCompute}
}

// ── Table ─────────────────────────────────────────────────────────
function buildHead() {
  var thead = document.getElementById('tHead');
  thead.innerHTML = '';
  var tr = document.createElement('tr');
  TABLE_COLS.forEach(function(col) {
    var th = document.createElement('th');
    th.innerHTML = col + ' <span style="opacity:.35">⇅</span>';
    th.addEventListener('click', function(){
      if (sortCol === col) sortAsc = !sortAsc; else { sortCol = col; sortAsc = true; }
      applyFilters();
    });
    tr.appendChild(th);
  });
  thead.appendChild(tr);
}

function cellHTML(col, val) {
  if (val === null || val === undefined || val === '') return '<span style="opacity:.3">—</span>';
  var n = Number(val);
  // Numeric: format nicely
  if (!isNaN(n) && val !== '') return '<span style="font-family:DM Mono,monospace;font-size:11px;">' + fmtVal(n, 'number') + '</span>';
  // Percentage-like string
  if (String(val).endsWith('%')) {
    var pct = parseFloat(val);
    return '<div class="prog-wrap"><div class="prog-bar" style="width:'+Math.min(pct,100)+'%"></div></div> <span style="font-size:10px;opacity:.6">'+val+'</span>';
  }
  return '<span>' + String(val).slice(0, 60) + '</span>';
}

function renderTable(data) {
  var start = (currentPage - 1) * PAGE_SIZE;
  var page  = data.slice(start, start + PAGE_SIZE);
  var tbody = document.getElementById('tBody');
  tbody.innerHTML = '';
  if (!data.length) {
    var tr = document.createElement('tr');
    var td = document.createElement('td');
    td.colSpan = TABLE_COLS.length;
    td.style.cssText = 'text-align:center;padding:36px;opacity:.4';
    td.textContent = 'Aucune donnée.';
    tr.appendChild(td); tbody.appendChild(tr);
    return;
  }
  page.forEach(function(row) {
    var tr = document.createElement('tr');
    TABLE_COLS.forEach(function(col) {
      var td = document.createElement('td');
      td.innerHTML = cellHTML(col, row[col]);
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  document.getElementById('rowBadge').textContent = data.length + ' ligne' + (data.length > 1 ? 's' : '');
  renderPagination(data.length);
  var end = Math.min(start + PAGE_SIZE, data.length);
  document.getElementById('pageInfo').textContent = 'Affichage ' + (Math.min(start+1,data.length)) + '–' + end + ' sur ' + data.length;
}

function renderPagination(total) {
  var totalPages = Math.ceil(total / PAGE_SIZE);
  var container  = document.getElementById('pageBtns');
  container.innerHTML = '';
  function mkBtn(label, page, active) {
    var b = document.createElement('button');
    b.className = 'page-btn' + (active ? ' active' : '');
    b.textContent = label;
    b.addEventListener('click', function(){ currentPage = page; renderTable(filteredData); });
    return b;
  }
  if (currentPage > 1) container.appendChild(mkBtn('‹', currentPage-1, false));
  for (var p = 1; p <= Math.min(totalPages, 7); p++) container.appendChild(mkBtn(p, p, p===currentPage));
  if (currentPage < totalPages) container.appendChild(mkBtn('›', currentPage+1, false));
}

// ── Filters ───────────────────────────────────────────────────────
function applyFilters() {
  var search = (document.getElementById('searchInput').value || '').toLowerCase();
  var filterEls = document.querySelectorAll('[id^="filter"][data-col]');
  var activeFilters = [];
  filterEls.forEach(function(el){ if(el.value) activeFilters.push({col:el.dataset.col, val:el.value}); });

  filteredData = ALLDATA.filter(function(r) {
    var matchSearch = !search || SEARCH_COLS.some(function(c){
      return String(r[c]||'').toLowerCase().includes(search);
    });
    var matchFilters = activeFilters.every(function(f){ return String(r[f.col]||'') === f.val; });
    return matchSearch && matchFilters;
  });

  if (sortCol) {
    filteredData.sort(function(a,b){
      var av = a[sortCol], bv = b[sortCol];
      if (!isNaN(Number(av)) && !isNaN(Number(bv))){ av=Number(av); bv=Number(bv); }
      if (av < bv) return sortAsc ? -1 : 1;
      if (av > bv) return sortAsc ? 1 : -1;
      return 0;
    });
  }

  currentPage = 1;
  renderTable(filteredData);
  renderKPIs(filteredData);
  renderCharts(filteredData);
}

// ── CSV/JSON Upload ────────────────────────────────────────────────
function processFile(file) {
  if (!file) return;
  var name = file.name.toLowerCase();

  if (name.endsWith('.json')) {
    var reader = new FileReader();
    reader.onload = function(e) {
      try {
        var parsed = JSON.parse(e.target.result);
        var rows = Array.isArray(parsed) ? parsed : [parsed];
        if (!rows.length) throw new Error('Tableau vide');
        loadData(rows, file.name);
      } catch(err) { toast('JSON: ' + err.message, 'error'); }
    };
    reader.readAsText(file);
    return;
  }

  // CSV — PapaParse (handles quoted commas correctly)
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
    transformHeader: function(h){ return h.trim(); },
    complete: function(results) {
      var rows = (results.data || []).filter(function(r){
        return r && typeof r === 'object' && Object.keys(r).length > 0;
      });
      if (!rows.length){ toast('Aucune ligne valide trouvée.', 'error'); return; }
      loadData(rows, file.name);
    },
    error: function(err){ toast('Erreur CSV: ' + err.message, 'error'); }
  });
}

function loadData(rows, fileName) {
  ALLDATA = rows;
  // Auto-detect table columns from new data
  var newCols = Object.keys(rows[0] || {});
  if (newCols.length) TABLE_COLS = newCols.slice(0, 12);

  currentPage = 1; sortCol = null; sortAsc = true;
  buildHead();
  populateFilters();
  applyFilters();
  document.getElementById('uploadStatus').style.display = 'block';
  document.getElementById('uploadFileName').textContent = '📄 ' + fileName;
  document.getElementById('uploadRowCount').textContent = rows.length + ' lignes chargées';
  document.getElementById('ssFile').textContent = fileName.slice(0, 12) + '…';
  toast(rows.length + ' lignes chargées depuis ' + fileName, 'success');
}

function populateFilters() {
  document.querySelectorAll('[id^="filter"][data-col]').forEach(function(sel) {
    var col = sel.dataset.col;
    var currentVal = sel.value;
    sel.innerHTML = '<option value="">Tous</option>';
    var vals = [...new Set(ALLDATA.map(function(r){ return String(r[col]||''); }).filter(Boolean))].sort();
    vals.forEach(function(v){ var o=document.createElement('option'); o.value=v; o.textContent=v; sel.appendChild(o); });
    sel.value = currentVal;
  });
}

// ── Export ─────────────────────────────────────────────────────────
function exportPNG() {
  toast('Capture en cours…', 'success');
  html2canvas(document.getElementById('main'), { backgroundColor: '${t.bg}', scale: 1.5 })
    .then(function(c){
      var a=document.createElement('a'); a.href=c.toDataURL('image/png'); a.download='dashboard-'+Date.now()+'.png'; a.click();
      toast('PNG téléchargé !', 'success');
    }).catch(function(e){ toast('Erreur PNG: '+e.message,'error'); });
}

function exportPDF() {
  toast('Génération PDF…', 'success');
  html2canvas(document.getElementById('main'), { backgroundColor: '${t.bg}', scale: 1.2 })
    .then(function(c){
      var img=c.toDataURL('image/jpeg',.92);
      var pdf=new jspdf.jsPDF({orientation:'landscape',unit:'mm',format:'a4'});
      var pw=pdf.internal.pageSize.getWidth(), ph=pdf.internal.pageSize.getHeight();
      var r=Math.min(pw/c.width, ph/c.height)*.97;
      pdf.addImage(img,'JPEG',(pw-c.width*r)/2,(ph-c.height*r)/2,c.width*r,c.height*r);
      pdf.save('dashboard-'+Date.now()+'.pdf');
      toast('PDF téléchargé !', 'success');
    }).catch(function(e){ toast('Erreur PDF: '+e.message,'error'); });
}

// ── Init ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function(){
  // Upload zone
  var zone = document.getElementById('uploadZone');
  zone.addEventListener('click', function(){ document.getElementById('fileInput').click(); });
  zone.addEventListener('dragover', function(e){ e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', function(){ zone.classList.remove('drag-over'); });
  zone.addEventListener('drop', function(e){
    e.preventDefault(); zone.classList.remove('drag-over');
    var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) processFile(f);
  });

  document.getElementById('fileInput').addEventListener('change', function(e){
    var f = e.target.files && e.target.files[0];
    if (f) processFile(f);
    e.target.value = '';
  });

  // Buttons
  document.getElementById('btnRefresh').addEventListener('click', function(){ applyFilters(); toast('Actualisé', 'success'); });
  document.getElementById('btnReset').addEventListener('click', function(){
    document.getElementById('searchInput').value = '';
    document.querySelectorAll('[id^="filter"][data-col]').forEach(function(s){ s.value=''; });
    sortCol = null; currentPage = 1; applyFilters();
  });
  document.getElementById('btnExportPNG').addEventListener('click', exportPNG);
  document.getElementById('btnExportPDF').addEventListener('click', exportPDF);

  // Populate filter dropdowns
  ${filterPopulate}

  // Initial render
  buildHead();
  applyFilters();
});

})();
</script>
</body>
</html>`
}

// ════════════════════════════════════════════════════════════════
// STEP 4 — Claude verifies the generated HTML for JS errors
// ════════════════════════════════════════════════════════════════
async function verifyHTML(html) {
  const tail = html.slice(-3000)
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 200,
    messages: [{
      role: 'user',
      content: `Scan the last section of this HTML file for JavaScript syntax errors.
Look for: unclosed functions, unclosed arrays/objects, truncated code, missing closing braces.

Last 3000 chars:
${tail}

Reply with ONLY:
- "OK" if no syntax errors
- One-line description of the error if found`
    }]
  })

  const verdict = msg.content[0]?.text?.trim() || 'OK'
  return verdict.toLowerCase().startsWith('ok')
}

// ════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ════════════════════════════════════════════════════════════════
export async function POST(req) {
  try {
    const body = await req.json()
    const {
      description   = '',
      parsedRows    = [],
      fileName      = null,
      dashboardType = 'Finance & Comptabilité',
      colorTheme    = 'dark',
      language      = 'Français',
    } = body

    if (!description?.trim() && !parsedRows?.length) {
      return NextResponse.json({ error: 'Description ou données requises.' }, { status: 400 })
    }

    // Use parsed rows — if none, schema analyse will generate demo data
    const rows = Array.isArray(parsedRows) && parsedRows.length > 0 ? parsedRows : []

    console.log('[dashboardai] Step 1: Analysing schema…', { rows: rows.length, dashboardType })

    // STEP 1: Analyse schema
    const schema = await analyseSchema(rows, description, dashboardType, language)

    console.log('[dashboardai] Step 2: Generating insight snippets…')

    // STEP 2: Generate insight text
    const insights = await generateInsightSnippets(schema, rows, description, language)

    // Use demo rows from schema if we have no real data
    const finalRows = rows.length > 0 ? rows : (schema.demoRows || [])

    console.log('[dashboardai] Step 3: Assembling HTML with proven scaffold…')

    // STEP 3: Assemble HTML
    const html = buildDashboardHTML(
      finalRows, schema, insights,
      colorTheme, description, language, dashboardType
    )

    console.log('[dashboardai] Step 4: Verifying HTML…', { size: (html.length/1024).toFixed(1) + 'KB' })

    // STEP 4: Verify
    const isOk = await verifyHTML(html)
    if (!isOk) {
      console.warn('[dashboardai] Verification flagged an issue — returning anyway with scaffold guarantee')
    }

    console.log('[dashboardai] Done ✓')

    return NextResponse.json({ html, schema })

  } catch (err) {
    console.error('[dashboardai]', err)
    return NextResponse.json({ error: err.message || 'Erreur interne' }, { status: 500 })
  }
}