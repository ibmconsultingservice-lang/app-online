import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── STEP 1: Analyse data structure from first 10 rows ──
async function analyseData(context) {
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    messages: [{
      role: 'user',
      content: `You are a data analyst. Analyse these first rows of data and return a JSON schema.

Data preview (first 10 rows):
${context.dataPreview || 'No file uploaded — use realistic demo data for: ' + context.dashboardType}

Dashboard type requested: ${context.dashboardType}
User description: ${context.description}

Return ONLY a JSON object (no markdown, no explanation):
{
  "columns": [{"name": "col_name", "type": "number|string|date|percent", "role": "kpi|dimension|metric|date"}],
  "rowCount": estimated_total_rows,
  "detectedSector": "finance|sales|hr|marketing|stock|custom",
  "suggestedKPIs": [{"label": "KPI Name", "column": "col_name", "aggregation": "sum|avg|count|max"}],
  "suggestedCharts": [
    {"type": "bar|line|doughnut|radar", "title": "Chart Title", "xColumn": "col", "yColumn": "col"},
    {"type": "bar|line|doughnut|radar", "title": "Chart Title", "xColumn": "col", "yColumn": "col"},
    {"type": "bar|line|doughnut|radar", "title": "Chart Title", "xColumn": "col", "yColumn": "col"}
  ],
  "filterColumn": "best_column_for_filter",
  "demoRows": [/* 10 realistic demo rows matching the detected schema */]
}`
    }]
  })

  const raw = msg.content[0]?.text?.trim() || '{}'
  try {
    const clean = raw.replace(/```json|```/g, '').trim()
    return JSON.parse(clean)
  } catch {
    return { columns: [], demoRows: [], suggestedKPIs: [], suggestedCharts: [], filterColumn: 'status' }
  }
}

// ── STEP 2: Generate the full dashboard HTML in one shot ──
async function generateDashboardHTML(context, schema) {
  const schemaStr = JSON.stringify(schema, null, 2)
  const demoRowsStr = JSON.stringify(schema.demoRows || [], null, 2)
  const columns = (schema.columns || []).map(c => c.name).join(', ')

  const themeCSS = {
    dark:   `--bg:#0f172a;--bg2:#1e293b;--bg3:#334155;--text:#f1f5f9;--text2:#94a3b8;--accent:#6366f1;--border:#334155;--card:#1e293b`,
    light:  `--bg:#f8fafc;--bg2:#ffffff;--bg3:#f1f5f9;--text:#0f172a;--text2:#64748b;--accent:#6366f1;--border:#e2e8f0;--card:#ffffff`,
    purple: `--bg:#1e1b4b;--bg2:#312e81;--bg3:#4338ca;--text:#ede9fe;--text2:#a5b4fc;--accent:#818cf8;--border:#4338ca;--card:#312e81`,
    green:  `--bg:#022c22;--bg2:#064e3b;--bg3:#065f46;--text:#d1fae5;--text2:#6ee7b7;--accent:#34d399;--border:#065f46;--card:#064e3b`,
  }

  const msg = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 6000,
    messages: [{
      role: 'user',
      content: `You are an expert dashboard developer. Generate a COMPLETE, WORKING, SELF-CONTAINED HTML dashboard file.

=== CONTEXT ===
Dashboard type: ${context.dashboardType}
User description: ${context.description}
Language: ${context.language}
Color theme: ${context.colorTheme}

=== DATA SCHEMA DETECTED ===
${schemaStr}

=== DEMO DATA (10 rows — use exactly these as initial dashboardData) ===
${demoRowsStr}

=== COLUMNS AVAILABLE ===
${columns}

=== CRITICAL REQUIREMENTS ===

1. FILE UPLOAD — MUST WORK PERFECTLY:
   - User drops or selects a CSV/JSON file
   - CSV: parse with Papa.parse(file, {header:true, dynamicTyping:true, complete: function(results){ dashboardData = results.data; refreshAll(); }})
   - JSON: FileReader → JSON.parse → dashboardData = parsed array → refreshAll()
   - After upload: ALL charts, KPIs, table, insights MUST refresh with new data
   - Show filename and row count after successful upload
   - Show error message if parse fails

2. EXPORT — MUST WORK:
   - Export PNG: html2canvas(document.getElementById('dashboardContent')) → download
   - Export PDF: html2canvas → jsPDF A4 landscape → download

3. CHARTS — use Chart.js 4.x:
   - Always destroy existing chart before creating new one: if(window._c1) window._c1.destroy();
   - Store as: window._c1, window._c2, window._c3
   - Use data from dashboardData to compute chart values dynamically

4. KPI CARDS — compute from dashboardData dynamically:
   - 4 KPIs based on: ${JSON.stringify(schema.suggestedKPIs || [])}
   - Show value + trend indicator

5. DATA TABLE:
   - Show all columns from dashboardData
   - Search input filters rows in real-time
   - Pagination: 10 rows per page
   - Filter dropdown using column: ${schema.filterColumn || 'status'}

6. INSIGHTS SECTION:
   - 3 anomalies detected from data
   - 3 predictions
   - 3 recommendations
   - Regenerate automatically when data changes

=== HTML STRUCTURE (use EXACTLY these IDs) ===
- id="dashboardContent" — wraps everything inside body (used for PNG/PDF export)
- id="uploadZone" — drag-drop area
- id="fileInput" type="file" accept=".csv,.json"
- id="uploadStatus" — shows filename + row count after upload
- id="kpi1" id="kpi2" id="kpi3" id="kpi4" — KPI cards
- id="chart1" id="chart2" id="chart3" — canvas elements
- id="tableHead" id="tableBody" — table sections
- id="searchInput" id="filterSelect" id="pagination"
- id="anomaliesBox" id="predictionsBox" id="recommendationsBox"
- id="btnExportPNG" id="btnExportPDF" id="btnRefresh"

=== CSS VARIABLES TO USE ===
:root { ${themeCSS[context.colorTheme] || themeCSS.dark}; }
body { background: var(--bg); color: var(--text); font-family: 'Segoe UI', system-ui, sans-serif; margin:0; padding:0; }
.card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 20px; }

=== SCRIPTS TO INCLUDE IN <head> ===
<script src="https://cdn.tailwindcss.com"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>

=== OUTPUT FORMAT ===
Return a COMPLETE <!DOCTYPE html>...</html> file.
ALL JavaScript must be inside a single <script> tag at the bottom of body.
NO markdown, NO backticks, NO explanation — only the raw HTML file starting with <!DOCTYPE html>`
    }]
  })

  return msg.content[0]?.text?.trim() || ''
}

// ── STEP 3: Verify and fix upload + export functions ──
async function verifyAndFix(html, schema) {
  const demoRowsStr = JSON.stringify((schema.demoRows || []).slice(0, 3), null, 2)

  const msg = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 6000,
    messages: [{
      role: 'user',
      content: `You are a code reviewer and fixer. Review this dashboard HTML and fix ALL issues.

=== THE HTML TO REVIEW ===
${html}

=== TEST DATA (simulate upload with these 3 rows) ===
${demoRowsStr}

=== CHECKLIST — FIX EVERY ITEM THAT IS BROKEN ===

UPLOAD FUNCTION — verify:
□ File input #fileInput triggers processUploadedFile(file)
□ uploadZone drag-drop calls processUploadedFile(file)
□ CSV: Papa.parse with header:true and dynamicTyping:true, complete callback sets dashboardData and calls refreshAll()
□ JSON: FileReader.onload reads result, JSON.parse, sets dashboardData, calls refreshAll()
□ refreshAll() calls: renderKPIs(), renderCharts(), renderInsights(), renderTable()
□ #uploadStatus shows the filename and row count after upload

CHARTS — verify:
□ window._c1, window._c2, window._c3 are destroyed before recreating
□ Chart data is computed FROM dashboardData (not hardcoded)
□ canvas elements #chart1, #chart2, #chart3 exist in HTML

KPIS — verify:
□ computeKPIs() reads dashboardData and computes values
□ Updates #kpi1 through #kpi4 inner HTML with label + value + change

TABLE — verify:
□ renderTable() builds thead and tbody from dashboardData
□ #searchInput filters rows in real-time
□ #filterSelect filters by a column
□ #pagination renders page buttons correctly

EXPORT — verify:
□ exportPNG uses html2canvas(document.getElementById('dashboardContent'))
□ exportPDF uses html2canvas + jsPDF A4 landscape
□ Both trigger file download

GENERAL — verify:
□ No syntax errors (unclosed brackets, missing semicolons)
□ All functions are complete (no truncated code)
□ DOMContentLoaded sets up ALL event listeners
□ refreshAll() function exists and calls all render functions

Fix ALL issues found. Return the COMPLETE corrected <!DOCTYPE html>...</html> file.
NO markdown, NO backticks, NO explanation — only raw HTML.`
    }]
  })

  const fixed = msg.content[0]?.text?.trim() || html

  // If response doesn't look like HTML, return original
  if (!fixed.includes('<!DOCTYPE') && !fixed.includes('<html')) return html
  return fixed
}

// ── STEP 4: Final syntax check — loop up to 2 times if still broken ──
async function finalSyntaxCheck(html, attempt = 1) {
  if (attempt > 2) return html

  const msg = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: `Scan this HTML file for JavaScript syntax errors ONLY. Look for:
- Unclosed functions (missing closing braces)
- Unclosed arrays or objects
- Missing semicolons that would cause parse errors
- Truncated code at end of script tag

HTML to check (last 2000 chars of script section):
${html.slice(-2000)}

Reply with ONLY one of:
- "OK" if no syntax errors found
- A brief description of the error location if found (e.g. "function renderTable missing closing brace at line ~450")`
    }]
  })

  const verdict = msg.content[0]?.text?.trim() || 'OK'

  if (verdict === 'OK' || verdict.toLowerCase().startsWith('ok')) {
    return html
  }

  // There's still an issue — do one more fix pass
  console.log(`[dashboardai] Syntax issue found (attempt ${attempt}): ${verdict}`)

  const fixMsg = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 6000,
    messages: [{
      role: 'user',
      content: `This HTML dashboard has a JavaScript syntax error: "${verdict}"

Fix ONLY the JavaScript syntax error. Do not change anything else.
Return the COMPLETE corrected <!DOCTYPE html>...</html> file.
NO markdown, NO backticks, NO explanation.

${html}`
    }]
  })

  const reFix = fixMsg.content[0]?.text?.trim() || html
  if (!reFix.includes('<!DOCTYPE') && !reFix.includes('<html')) return html

  return finalSyntaxCheck(reFix, attempt + 1)
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

    // ── STEP 1: Analyse data ──
    console.log('[dashboardai] Step 1: Analysing data schema...')
    const schema = await analyseData(context)
    console.log('[dashboardai] Schema detected:', schema.detectedSector, '— columns:', schema.columns?.length)

    // ── STEP 2: Generate full dashboard ──
    console.log('[dashboardai] Step 2: Generating full dashboard HTML...')
    let html = await generateDashboardHTML(context, schema)

    if (!html || html.length < 500) {
      return NextResponse.json({ error: 'Génération échouée — réessayez' }, { status: 500 })
    }

    // ── STEP 3: Verify + fix upload & export ──
    console.log('[dashboardai] Step 3: Verifying upload and export functions...')
    html = await verifyAndFix(html, schema)

    // ── STEP 4: Final syntax check loop ──
    console.log('[dashboardai] Step 4: Final syntax check...')
    html = await finalSyntaxCheck(html)

    console.log(`[dashboardai] Done — ${(html.length / 1024).toFixed(1)}KB`)

    return NextResponse.json({ html, schema })

  } catch (err) {
    console.error('[dashboardai]', err)
    return NextResponse.json({ error: err.message || 'Erreur interne' }, { status: 500 })
  }
}