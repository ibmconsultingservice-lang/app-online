// app/api/generer-excelai/route.js
// ExcelAI v4 — Full-featured API: plan + formula validation + anomaly detection + chat

import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(req) {
  try {
    const body = await req.json()
    const { step } = body
    if (step === 'plan')     return await handlePlan(body)
    if (step === 'chat')     return await handleChat(body)
    if (step === 'explain')  return await handleExplain(body)
    return NextResponse.json({ error: 'Unknown step' }, { status: 400 })
  } catch (err) {
    console.error('[ExcelAI API]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ═══════════════════════════════════════════════════════════════════
// STEP: plan  — streaming JSON via SSE
// ═══════════════════════════════════════════════════════════════════
async function handlePlan(body) {
  const { fileName, headers, totalRows, firstRows, lastRow, locale = 'FR' } = body
  const lastExcelRow = totalRows + 1

  // Column mapping with type hints
  const colMap = headers
    .map((h, i) => `  ${String.fromCharCode(65 + i)}: "${h}"`)
    .join('\n')

  const sampleLines = (firstRows || [])
    .map((row, i) =>
      `  L${i + 2}: ${row.map((v, j) => `${headers[j]}=${JSON.stringify(v)}`).join(' | ')}`
    ).join('\n')

  const lastRowLine = lastRow?.length
    ? `  L${lastExcelRow}(fin): ${lastRow.map((v, j) => `${headers[j]}=${JSON.stringify(v)}`).join(' | ')}`
    : ''

  // Locale-specific function names
  const FN = locale === 'EN' ? {
    SUM: 'SUM', AVG: 'AVERAGE', COUNT: 'COUNT', COUNTA: 'COUNTA',
    COUNTIF: 'COUNTIF', SUMIF: 'SUMIF', AVERAGEIF: 'AVERAGEIF',
    MAX: 'MAX', MIN: 'MIN', IF: 'IF', IFERROR: 'IFERROR',
    YEAR: 'YEAR', MONTH: 'MONTH', TEXT: 'TEXT', UNIQUE: 'UNIQUE'
  } : {
    SUM: 'SOMME', AVG: 'MOYENNE', COUNT: 'NB', COUNTA: 'NBVAL',
    COUNTIF: 'NB.SI', SUMIF: 'SOMME.SI', AVERAGEIF: 'MOYENNE.SI',
    MAX: 'MAX', MIN: 'MIN', IF: 'SI', IFERROR: 'SIERREUR',
    YEAR: 'ANNEE', MONTH: 'MOIS', TEXT: 'TEXTE', UNIQUE: 'UNIQUE'
  }

  const prompt = `Tu es un expert Excel senior. Génère un plan d'analyse COMPLET et PROFESSIONNEL pour ce fichier.

CLASSEUR :
- "Données" : données brutes, ligne 1 = en-tête, lignes 2→${lastExcelRow}
- "Analyse"  : formules KPI référençant "Données"
- "Graphiques" : tableaux structurés pour charts

FICHIER : ${fileName} | ${totalRows} lignes | locale: ${locale}
COLONNES : ${colMap}
ÉCHANTILLON :
${sampleLines}
${lastRowLine}

LOCALE ${locale} — utilise ces fonctions : ${Object.entries(FN).map(([k,v]) => `${k}=${v}`).join(', ')}

════════════════════════════════════════════
PARTIE 1 — sections KPI (feuille "Analyse")
════════════════════════════════════════════
Règles :
- Toutes les formules référencent "Données" : =${FN.SUM}(Données!B2:B${lastExcelRow})
- Borne exacte : ${lastExcelRow}
- Détecte les types (numérique, catégorie, date, booléen)
- Pour chaque formule, attribue un score de confiance (0.0→1.0) selon la certitude sur le type de colonne
- Max 6 sections, 8 formules/section
- Catégories : "total" | "comptage" | "statut" | "catégorie" | "temporel" | "performance" | "ratio"

════════════════════════════════════════════
PARTIE 2 — tableaux graphiques (feuille "Graphiques")
════════════════════════════════════════════
- Types : "bar" | "line" | "pie" | "scatter" | "histogram"
- 3 à 5 tableaux, 2→15 lignes/tableau
- Formules autonomes référençant "Données"
- Pour les scatter : lignes = paires de valeurs avec INDEX()/EQUIV() si besoin

════════════════════════════════════════════
PARTIE 3 — anomalies détectées
════════════════════════════════════════════
Analyse l'échantillon et signale :
- Valeurs manquantes critiques (colonnes clés avec vides)
- Doublons potentiels
- Valeurs aberrantes (outliers visibles dans l'échantillon)
- Incohérences de format (dates mixtes, nombres en texte, etc.)
- Max 6 anomalies

RÉPONSE — JSON STRICT, sans markdown, sans texte autour :
{
  "dataType": "Description courte",
  "analysisGoal": "Phrase analytique principale",
  "locale": "${locale}",
  "sections": [
    {
      "title": "Titre",
      "category": "total",
      "formulas": [
        {
          "label": "Nom lisible",
          "formula": "=...",
          "note": "Explication",
          "confidence": 0.95
        }
      ]
    }
  ],
  "chartTables": [
    {
      "title": "Titre tableau",
      "chartType": "bar",
      "chartDescription": "Ce que montre ce graphique",
      "columns": ["Étiquette", "Valeur"],
      "rows": [
        { "label": "Catégorie A", "formulas": ["=${FN.COUNTIF}(Données!C2:C${lastExcelRow},\"Catégorie A\")"] }
      ]
    }
  ],
  "anomalies": [
    {
      "type": "missing" | "duplicate" | "outlier" | "format",
      "severity": "high" | "medium" | "low",
      "column": "Nom de la colonne",
      "message": "Description courte de l'anomalie",
      "formula": "=Formule Excel optionnelle pour détecter/compter ce problème"
    }
  ]
}`

  // Use streaming SSE response
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Stream Claude response
        const response = await client.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 8000,
          stream: true,
          messages: [{ role: 'user', content: prompt }],
        })

        let buffer = ''
        for await (const event of response) {
          if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
            buffer += event.delta.text
            // Send progress events
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'delta', text: event.delta.text })}\n\n`))
          }
          if (event.type === 'message_stop') {
            // Parse and validate the complete JSON
            try {
              const parsed = extractJSON(buffer)
              // Validate formulas
              const validated = validateAndEnrichPlan(parsed, lastExcelRow)
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'complete', plan: validated })}\n\n`))
            } catch (parseErr) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: parseErr.message })}\n\n`))
            }
          }
        }
      } catch (err) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`))
      } finally {
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  })
}

// ═══════════════════════════════════════════════════════════════════
// STEP: chat  — contextual Q&A on the data
// ═══════════════════════════════════════════════════════════════════
async function handleChat(body) {
  const { question, headers, firstRows, lastRow, totalRows, plan, history = [] } = body
  const lastExcelRow = totalRows + 1

  const colMap = headers.map((h, i) => `${String.fromCharCode(65 + i)}:${h}`).join(' | ')
  const sample = (firstRows || []).slice(0, 5)
    .map((r, i) => `  L${i + 2}: ${r.join(' | ')}`).join('\n')

  const systemPrompt = `Tu es un analyste de données expert. Tu réponds à des questions sur un fichier Excel/CSV.

CONTEXTE DU FICHIER :
- ${totalRows} lignes, colonnes : ${colMap}
- Données feuille "Données", lignes 2 à ${lastExcelRow}
- Échantillon des 5 premières lignes :
${sample}
${lastRow?.length ? `- Dernière ligne : ${lastRow.join(' | ')}` : ''}

PLAN D'ANALYSE GÉNÉRÉ :
${JSON.stringify(plan?.sections?.map(s => ({ title: s.title, formulas: s.formulas?.map(f => f.label) })) || [], null, 2)}

RÈGLES DE RÉPONSE :
1. Réponds en français, de manière concise et directe
2. Si la question nécessite une formule Excel, fournis-la dans un bloc \`\`\`excel
3. Utilise les données de l'échantillon pour illustrer tes réponses
4. Si tu ne peux pas répondre avec certitude, dis-le clairement
5. Sois précis sur les numéros de lignes et colonnes Excel
6. N'utilise pas de gras, pas d'italiques ni de emojis ou puces seulement du texte simple meme pour les titres`

  // Build conversation history
  const messages = [
    ...history.map(h => ({ role: h.role, content: h.content })),
    { role: 'user', content: question }
  ]

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await client.messages.create({
          model: 'claude-opus-4-5',
          max_tokens: 5500,
          system: systemPrompt,
          stream: true,
          messages,
        })

        for await (const event of response) {
          if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'delta', text: event.delta.text })}\n\n`))
          }
          if (event.type === 'message_stop') {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`))
          }
        }
      } catch (err) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`))
      } finally {
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' }
  })
}

// ═══════════════════════════════════════════════════════════════════
// STEP: explain  — decompose a formula argument by argument
// ═══════════════════════════════════════════════════════════════════
async function handleExplain(body) {
  const { formula, label, headers } = body
  const colMap = headers?.map((h, i) => `${String.fromCharCode(65 + i)}="${h}"`).join(', ') || ''

  const message = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: `Décompose cette formule Excel argument par argument, en français, de manière pédagogique et concise.

Formule : ${formula}
Label : ${label}
Colonnes du fichier : ${colMap}

Réponds UNIQUEMENT avec du JSON valide :
{
  "summary": "Ce que fait cette formule en une phrase",
  "parts": [
    { "part": "fragment de formule", "role": "ce que fait ce fragment" }
  ],
  "tip": "Conseil ou mise en garde optionnel"
}`
    }]
  })

  const raw = message.content[0]?.text || ''
  const parsed = extractJSON(raw)
  return NextResponse.json(parsed)
}

// ═══════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════

function extractJSON(raw) {
  if (!raw) throw new Error('Réponse vide de Claude')
  let text = raw.replace(/^```[a-z]*\s*/im, '').replace(/\s*```$/im, '').trim()
  const start = text.indexOf('{')
  if (start === -1) throw new Error('Aucun JSON trouvé dans la réponse')
  let depth = 0, end = -1, inString = false, escape = false
  for (let i = start; i < text.length; i++) {
    const ch = text[i]
    if (escape) { escape = false; continue }
    if (ch === '\\' && inString) { escape = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue
    if (ch === '{') depth++
    else if (ch === '}') { depth--; if (depth === 0) { end = i; break } }
  }
  if (end === -1) {
    console.warn('[ExcelAI] Truncated JSON, repairing…')
    text = repairJSON(text.slice(start))
  } else {
    text = text.slice(start, end + 1)
  }
  return JSON.parse(text)
}

function repairJSON(partial) {
  let s = partial.trimEnd()
    .replace(/,\s*$/, '')
    .replace(/,\s*"[^"]*$/, '')
    .replace(/"[^"]*$/, '')
  let braces = 0, brackets = 0, inStr = false, esc = false
  for (const ch of s) {
    if (esc) { esc = false; continue }
    if (ch === '\\' && inStr) { esc = true; continue }
    if (ch === '"') { inStr = !inStr; continue }
    if (inStr) continue
    if (ch === '{') braces++; else if (ch === '}') braces--
    if (ch === '[') brackets++; else if (ch === ']') brackets--
  }
  while (brackets > 0) { s += ']'; brackets-- }
  while (braces > 0)   { s += '}'; braces-- }
  return s
}

// Validate formulas and add metadata
function validateAndEnrichPlan(plan, lastExcelRow) {
  const formulaIssues = []

  const checkFormula = (formula, label) => {
    const issues = []
    // Check sheet reference
    if (!formula.includes('Données!') && formula.startsWith('=')) {
      issues.push('Référence à "Données" manquante')
    }
    // Check row bound accuracy
    const boundMatch = formula.match(/:([A-Z]+)(\d+)/)
    if (boundMatch) {
      const bound = parseInt(boundMatch[2])
      if (bound !== lastExcelRow && bound !== 1) {
        issues.push(`Borne ${bound} ≠ ${lastExcelRow} attendu`)
      }
    }
    // Check for unclosed parentheses
    const opens  = (formula.match(/\(/g) || []).length
    const closes = (formula.match(/\)/g) || []).length
    if (opens !== closes) issues.push(`Parenthèses déséquilibrées (${opens} ouv. / ${closes} ferm.)`)

    return issues
  }

  // Validate and tag each formula
  if (plan.sections) {
    for (const section of plan.sections) {
      if (!section.formulas) continue
      for (const f of section.formulas) {
        const issues = checkFormula(f.formula || '', f.label || '')
        f.valid = issues.length === 0
        f.issues = issues
        if (issues.length > 0) formulaIssues.push({ label: f.label, issues })
      }
    }
  }

  if (plan.chartTables) {
    for (const table of plan.chartTables) {
      for (const row of table.rows || []) {
        for (let i = 0; i < (row.formulas || []).length; i++) {
          const issues = checkFormula(row.formulas[i], row.label)
          row.formulaValid = row.formulaValid !== false && issues.length === 0
        }
      }
    }
  }

  plan.validationSummary = {
    totalFormulas: plan.sections?.reduce((a, s) => a + (s.formulas?.length || 0), 0) || 0,
    validFormulas: plan.sections?.reduce((a, s) => a + (s.formulas?.filter(f => f.valid).length || 0), 0) || 0,
    issues: formulaIssues,
  }

  return plan
}