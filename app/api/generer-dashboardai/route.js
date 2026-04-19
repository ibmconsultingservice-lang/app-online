import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── Step 1: Generate the data layer + KPI logic ──
async function generateDataLayer(context) {
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 3000,
    messages: [{
      role: 'user',
      content: `You are a JavaScript data expert. Generate ONLY the JavaScript data and functions for a dashboard.

Context:
- Dashboard type: ${context.dashboardType}
- Description: ${context.description}
- Data preview: ${context.dataPreview || 'None — use realistic demo data'}
- File name: ${context.fileName || 'demo'}
- Language: ${context.language}

Generate a complete JavaScript block with:
1. A variable called \`dashboardData\` — an array of 15-20 realistic demo objects matching the context
2. Function \`computeKPIs(data)\` — returns object with 4 KPIs: {kpi1:{label,value,change,positive}, kpi2, kpi3, kpi4}
3. Function \`computeChartData(data)\` — returns {chart1:{labels,datasets}, chart2:{labels,datasets}, chart3:{labels,datasets}}
4. Function \`computeInsights(data)\` — returns {anomalies:[], predictions:[], recommendations:[]} each with 3 items (each item has {text, type:'warning'|'success'|'info'})
5. Function \`filterData(data, search, filter)\` — returns filtered array
6. Function \`formatValue(val, type)\` — formats numbers as currency/percent/integer based on type string

Return ONLY the JavaScript code block, no HTML, no markdown backticks, no explanation.
Start with: // === DATA LAYER ===
End with: // === END DATA LAYER ===`
    }]
  })
  return msg.content[0]?.text?.trim() || ''
}

// ── Step 2: Generate the HTML structure ──
async function generateHTMLStructure(context) {
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 3000,
    messages: [{
      role: 'user',
      content: `You are a UI expert. Generate ONLY the HTML body content for a dashboard (no <html>, no <head>, no <script> tags).

Context:
- Dashboard type: ${context.dashboardType}
- Color theme: ${context.colorTheme}
- Language: ${context.language}
- Description: ${context.description}

Generate semantic HTML with these sections, using Tailwind CSS classes:
1. A <header> with gradient bg (based on theme), title "${context.dashboardType}", subtitle, and 3 action buttons: id="btnRefresh", id="btnExportPNG", id="btnExportPDF"
2. A file upload zone: <div id="uploadZone"> with drag-drop area and <input type="file" id="fileInput" accept=".csv,.xlsx,.json">
3. KPI grid: <div id="kpiGrid" class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6"> with 4 cards each having id="kpi1" through id="kpi4", each card has: <p class="kpi-label">, <p class="kpi-value">, <p class="kpi-change">
4. Charts grid: <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6"> with 3 canvas elements: id="chart1", id="chart2", id="chart3" each wrapped in a white card div
5. Insights section: <div id="insightsSection"> with 3 sub-divs: id="anomaliesBox", id="predictionsBox", id="recommendationsBox"
6. Data table: <div id="tableSection"> with <input id="searchInput">, <select id="filterSelect">, <table id="dataTable"> with <thead id="tableHead"> and <tbody id="tableBody">, and pagination div id="pagination"

Color themes:
- dark: bg-slate-900 text-white, header bg-gradient-to-r from-slate-800 to-slate-900
- light: bg-gray-50 text-gray-900, header bg-gradient-to-r from-blue-600 to-indigo-600
- purple: bg-violet-950 text-white, header bg-gradient-to-r from-violet-800 to-indigo-800
- green: bg-emerald-950 text-white, header bg-gradient-to-r from-emerald-800 to-teal-800

Apply theme: ${context.colorTheme}

Return ONLY the HTML, starting with <header and ending with </div><!-- end wrapper -->
No <html>, no <head>, no <script>, no markdown.`
    }]
  })
  return msg.content[0]?.text?.trim() || ''
}

// ── Step 3: Generate the controller JS ──
async function generateController(context) {
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 3000,
    messages: [{
      role: 'user',
      content: `You are a JavaScript expert. Generate ONLY the controller JavaScript for a dashboard (no HTML, no data layer).

Context:
- Dashboard type: ${context.dashboardType}
- Language: ${context.language}

The page already has these global functions available (defined elsewhere):
- dashboardData (array), computeKPIs(data), computeChartData(data), computeInsights(data), filterData(data, search, filter), formatValue(val, type)
- Chart.js is loaded as window.Chart
- PapaParse is loaded as window.Papa
- html2canvas is loaded
- jsPDF is loaded as window.jspdf.jsPDF

Generate a complete controller with:

1. \`let currentData = [...dashboardData];\`
2. \`let currentPage = 1; const PER_PAGE = 10;\`
3. \`function renderKPIs()\` — reads computeKPIs(currentData), updates #kpi1 through #kpi4 (.kpi-label, .kpi-value, .kpi-change)
4. \`function renderCharts()\` — reads computeChartData(currentData), creates/destroys Chart.js charts on #chart1, #chart2, #chart3. Use chart types: bar, doughnut, line. Store chart instances in window._charts = {} to destroy before re-render
5. \`function renderInsights()\` — reads computeInsights(currentData), populates #anomaliesBox, #predictionsBox, #recommendationsBox with styled <div> items
6. \`function renderTable()\` — builds #tableHead and #tableBody from currentData keys and values, paginates with #pagination buttons
7. \`function applyFilters()\` — reads #searchInput and #filterSelect, calls filterData(), updates currentData, calls renderKPIs/renderCharts/renderInsights/renderTable
8. \`function processUploadedFile(file)\` — handles CSV via Papa.parse, JSON via JSON.parse, updates currentData = parsed data then calls all render functions. Shows alert on error.
9. \`function exportPNG()\` — uses html2canvas on document.body, triggers download as 'dashboard.png'
10. \`function exportPDF()\` — uses html2canvas + jsPDF to export as 'dashboard.pdf', A4 landscape
11. DOMContentLoaded listener that: sets up file upload (drag-drop on #uploadZone + click on #fileInput → processUploadedFile), binds #btnRefresh to applyFilters, #btnExportPNG to exportPNG, #btnExportPDF to exportPDF, #searchInput oninput to applyFilters, #filterSelect onchange to applyFilters, calls renderKPIs(), renderCharts(), renderInsights(), renderTable()

Return ONLY JavaScript, no HTML, no markdown backticks.
Start with: // === CONTROLLER ===
End with: // === END CONTROLLER ===`
    }]
  })
  return msg.content[0]?.text?.trim() || ''
}

// ── Step 4: Verify & fix each layer ──
async function verifyAndFix(code, layerName, context) {
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 3000,
    messages: [{
      role: 'user',
      content: `You are a code reviewer. Check this ${layerName} JavaScript for syntax errors, incomplete functions, missing closing brackets, and truncated code.

Code to verify:
\`\`\`javascript
${code}
\`\`\`

Rules:
- Every function must be complete with proper closing braces
- No syntax errors
- No undefined references to functions/variables not in scope
- Arrays and objects must be properly closed
- The code must be self-contained

If the code is correct, return it exactly as-is.
If there are issues, fix them and return the corrected version.

Return ONLY the JavaScript code, no explanation, no markdown backticks.`
    }]
  })
  return msg.content[0]?.text?.trim() || code
}

// ── Assemble the final HTML ──
function assembleHTML(htmlBody, dataLayer, controller, context) {
  const themeStyles = {
    dark: `body{background:#0f172a;color:#f1f5f9} .card{background:#1e293b;border:1px solid #334155} .kpi-label{color:#94a3b8;font-size:0.75rem;font-weight:600;text-transform:uppercase;letter-spacing:0.05em} .kpi-value{font-size:1.75rem;font-weight:800;color:#f1f5f9} .kpi-change.positive{color:#34d399} .kpi-change.negative{color:#f87171} .insight-item{background:#1e293b;border:1px solid #334155;border-radius:8px;padding:10px 14px;margin-bottom:8px;font-size:0.85rem} .insight-warning{border-left:3px solid #f59e0b} .insight-success{border-left:3px solid #10b981} .insight-info{border-left:3px solid #3b82f6} table{width:100%;border-collapse:collapse} th{background:#1e293b;color:#94a3b8;padding:10px 14px;text-align:left;font-size:0.75rem;text-transform:uppercase} td{padding:10px 14px;border-bottom:1px solid #1e293b;font-size:0.875rem} tr:hover td{background:#1e293b}`,
    light: `body{background:#f8fafc;color:#0f172a} .card{background:#ffffff;border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(0,0,0,0.05)} .kpi-label{color:#64748b;font-size:0.75rem;font-weight:600;text-transform:uppercase;letter-spacing:0.05em} .kpi-value{font-size:1.75rem;font-weight:800;color:#0f172a} .kpi-change.positive{color:#059669} .kpi-change.negative{color:#dc2626} .insight-item{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px;margin-bottom:8px;font-size:0.85rem} .insight-warning{border-left:3px solid #f59e0b} .insight-success{border-left:3px solid #10b981} .insight-info{border-left:3px solid #3b82f6} table{width:100%;border-collapse:collapse} th{background:#f1f5f9;color:#64748b;padding:10px 14px;text-align:left;font-size:0.75rem;text-transform:uppercase} td{padding:10px 14px;border-bottom:1px solid #f1f5f9;font-size:0.875rem} tr:hover td{background:#f8fafc}`,
    purple: `body{background:#1e1b4b;color:#ede9fe} .card{background:#312e81;border:1px solid #4338ca} .kpi-label{color:#a5b4fc;font-size:0.75rem;font-weight:600;text-transform:uppercase;letter-spacing:0.05em} .kpi-value{font-size:1.75rem;font-weight:800;color:#ede9fe} .kpi-change.positive{color:#34d399} .kpi-change.negative{color:#f87171} .insight-item{background:#312e81;border:1px solid #4338ca;border-radius:8px;padding:10px 14px;margin-bottom:8px;font-size:0.85rem} .insight-warning{border-left:3px solid #f59e0b} .insight-success{border-left:3px solid #10b981} .insight-info{border-left:3px solid #3b82f6} table{width:100%;border-collapse:collapse} th{background:#312e81;color:#a5b4fc;padding:10px 14px;text-align:left;font-size:0.75rem;text-transform:uppercase} td{padding:10px 14px;border-bottom:1px solid #312e81;font-size:0.875rem} tr:hover td{background:#3730a3}`,
    green: `body{background:#022c22;color:#d1fae5} .card{background:#064e3b;border:1px solid #065f46} .kpi-label{color:#6ee7b7;font-size:0.75rem;font-weight:600;text-transform:uppercase;letter-spacing:0.05em} .kpi-value{font-size:1.75rem;font-weight:800;color:#d1fae5} .kpi-change.positive{color:#34d399} .kpi-change.negative{color:#f87171} .insight-item{background:#064e3b;border:1px solid #065f46;border-radius:8px;padding:10px 14px;margin-bottom:8px;font-size:0.85rem} .insight-warning{border-left:3px solid #f59e0b} .insight-success{border-left:3px solid #10b981} .insight-info{border-left:3px solid #3b82f6} table{width:100%;border-collapse:collapse} th{background:#064e3b;color:#6ee7b7;padding:10px 14px;text-align:left;font-size:0.75rem;text-transform:uppercase} td{padding:10px 14px;border-bottom:1px solid #064e3b;font-size:0.875rem} tr:hover td{background:#065f46}`,
  }

  return `<!DOCTYPE html>
<html lang="${context.language === 'English' ? 'en' : 'fr'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${context.dashboardType} — Dashboard AI</title>
  <script src="https://cdn.tailwindcss.com"><\/script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"><\/script>
  <script src="https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js"><\/script>
  <script src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"><\/script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"><\/script>
  <style>
    * { font-family: 'Segoe UI', system-ui, sans-serif; box-sizing: border-box; }
    ${themeStyles[context.colorTheme] || themeStyles.dark}
    .card { border-radius: 12px; padding: 20px; margin-bottom: 0; }
    #uploadZone { border: 2px dashed #475569; border-radius: 12px; padding: 40px; text-align: center; cursor: pointer; transition: all 0.2s; }
    #uploadZone:hover, #uploadZone.dragover { border-color: #6366f1; background: rgba(99,102,241,0.05); }
    #uploadZone h3 { margin: 8px 0 4px; font-size: 1rem; font-weight: 600; }
    #uploadZone p { margin: 0; font-size: 0.8rem; opacity: 0.6; }
    .upload-icon { width: 48px; height: 48px; margin: 0 auto 12px; opacity: 0.4; }
    canvas { max-height: 280px; }
    .btn { padding: 8px 16px; border-radius: 8px; border: none; cursor: pointer; font-size: 0.8rem; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; transition: all 0.15s; }
    .btn:hover { opacity: 0.85; transform: translateY(-1px); }
    .btn-white { background: rgba(255,255,255,0.15); color: inherit; }
    .pagination-btn { padding: 4px 10px; border-radius: 6px; border: 1px solid #334155; background: transparent; cursor: pointer; font-size: 0.8rem; color: inherit; }
    .pagination-btn.active { background: #6366f1; border-color: #6366f1; color: white; }
    input, select { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; padding: 8px 12px; color: inherit; font-size: 0.875rem; outline: none; }
    input::placeholder { opacity: 0.4; }
    .section-title { font-size: 1rem; font-weight: 700; margin-bottom: 12px; }
    .kpi-card { padding: 20px; border-radius: 12px; }
  </style>
</head>
<body>
<div class="max-w-7xl mx-auto p-4">

${htmlBody}

</div>

<script>
// ============================================================
// SECTION 1 — DATA LAYER
// ============================================================
${dataLayer}

// ============================================================
// SECTION 2 — CONTROLLER
// ============================================================
${controller}
<\/script>
</body>
</html>`
}

export async function POST(req) {
  try {
    const body = await req.json()
    const { description, dataPreview, fileName, dashboardType, colorTheme, language } = body

    if (!description?.trim() && !dataPreview?.trim()) {
      return NextResponse.json({ error: 'Description ou données requises' }, { status: 400 })
    }

    const context = {
      description: description || `Dashboard ${dashboardType}`,
      dataPreview: dataPreview || '',
      fileName: fileName || null,
      dashboardType: dashboardType || 'Finance & Comptabilité',
      colorTheme: colorTheme || 'dark',
      language: language || 'Français',
    }

    console.log('[dashboardai] Step 1: Generating data layer...')
    let dataLayer = await generateDataLayer(context)

    console.log('[dashboardai] Step 2: Generating HTML structure...')
    let htmlBody = await generateHTMLStructure(context)

    console.log('[dashboardai] Step 3: Generating controller...')
    let controller = await generateController(context)

    console.log('[dashboardai] Step 4: Verifying data layer...')
    dataLayer = await verifyAndFix(dataLayer, 'data layer', context)

    console.log('[dashboardai] Step 5: Verifying controller...')
    controller = await verifyAndFix(controller, 'controller', context)

    console.log('[dashboardai] Step 6: Assembling final HTML...')
    const html = assembleHTML(htmlBody, dataLayer, controller, context)

    console.log(`[dashboardai] Done — ${(html.length / 1024).toFixed(1)}KB`)

    return NextResponse.json({ html })

  } catch (err) {
    console.error('[dashboardai]', err)
    return NextResponse.json({ error: err.message || 'Erreur interne' }, { status: 500 })
  }
}