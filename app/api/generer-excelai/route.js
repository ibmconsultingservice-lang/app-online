import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── Safe JSON extractor ──
function extractJSON(text) {
  let clean = text.trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim()

  try { return JSON.parse(clean) } catch {}

  const start = clean.indexOf('{')
  if (start === -1) throw new Error('No JSON object found in response')

  let depth = 0, inStr = false, escape = false
  for (let i = start; i < clean.length; i++) {
    const ch = clean[i]
    if (escape) { escape = false; continue }
    if (ch === '\\' && inStr) { escape = true; continue }
    if (ch === '"') inStr = !inStr
    if (!inStr) {
      if (ch === '{') depth++
      if (ch === '}') {
        depth--
        if (depth === 0) {
          try { return JSON.parse(clean.slice(start, i + 1)) } catch {}
        }
      }
    }
  }

  return JSON.parse(fixTruncatedJSON(clean.slice(start)))
}

function fixTruncatedJSON(str) {
  let fixed = str
  let inStr = false, escape = false
  const stack = []

  for (let i = 0; i < fixed.length; i++) {
    const ch = fixed[i]
    if (escape) { escape = false; continue }
    if (ch === '\\' && inStr) { escape = true; continue }
    if (ch === '"') { inStr = !inStr; continue }
    if (!inStr) {
      if (ch === '{') stack.push('}')
      else if (ch === '[') stack.push(']')
      else if (ch === '}' || ch === ']') stack.pop()
    }
  }

  if (inStr) fixed += '"'
  fixed = fixed.replace(/,\s*$/, '')
  while (stack.length) fixed += stack.pop()
  return fixed
}

// ── Detect column types from sample rows ──
function detectColumnTypes(headers, sampleRows) {
  return headers.map((h, colIndex) => {
    const values = sampleRows
      .map(r => r[colIndex])
      .filter(v => v !== null && v !== undefined && v !== '')

    if (values.length === 0) return { header: h, index: colIndex, letter: String.fromCharCode(65 + colIndex), type: 'text' }

    const numericCount = values.filter(v => !isNaN(Number(String(v).replace(/[\s,]/g, '')))).length
    const ratio = numericCount / values.length

    // ── NEW: Detect date columns ──
    const dateCount = values.filter(v => {
      const s = String(v).trim()
      return (
        /^\d{4}-\d{2}-\d{2}/.test(s) ||       // 2024-01-15
        /^\d{2}\/\d{2}\/\d{4}/.test(s) ||      // 15/01/2024
        /^\d{2}-\d{2}-\d{4}/.test(s) ||        // 15-01-2024
        /^\d{1,2}\s+\w+\s+\d{4}/.test(s) ||   // 15 Jan 2024
        (!isNaN(Date.parse(s)) && isNaN(Number(s)))
      )
    }).length
    const dateRatio = dateCount / values.length

    if (dateRatio > 0.6) {
      return {
        header: h,
        index: colIndex,
        letter: String.fromCharCode(65 + colIndex),
        type: 'date'
      }
    }

    return {
      header: h,
      index: colIndex,
      letter: String.fromCharCode(65 + colIndex),
      type: ratio > 0.7 ? 'numeric' : 'text'
    }
  })
}

// ── Fix 1: Replace COUNT on text columns with COUNTIF("<>") ──
function fixCountFormulas(formulas, columnTypes) {
  return formulas.map(f => {
    if (!f.formula) return f

    const match = f.formula.match(/=COUNT\(([A-Z])(\d+):([A-Z])(\d+)\)/i)
    if (!match) return f

    const colLetter = match[1].toUpperCase()
    const colInfo = columnTypes.find(c => c.letter === colLetter)

    if (colInfo && colInfo.type === 'text') {
      return {
        ...f,
        formula: f.formula.replace(
          /=COUNT\(([A-Z]\d+:[A-Z]\d+)\)/i,
          '=COUNTIF($1,"<>")'
        )
      }
    }

    return f
  })
}

// ── Fix 2: Replace any COUNTA with COUNTIF("<>") ──
function fixCountaUnsupported(formulas) {
  return formulas.map(f => {
    if (!f.formula) return f

    if (f.formula.toUpperCase().includes('COUNTA(')) {
      return {
        ...f,
        formula: f.formula.replace(
          /COUNTA\(([A-Z]\d+:[A-Z]\d+)\)/gi,
          'COUNTIF($1,"<>")'
        )
      }
    }

    return f
  })
}

// ── Fix 3: Remove unsupported functions entirely ──
const SUPPORTED_FUNCTIONS = ['SUM', 'AVERAGE', 'COUNT', 'MAX', 'MIN', 'COUNTIF', 'SUMIF']

function removeUnsupportedFormulas(formulas) {
  return formulas.filter(f => {
    if (!f.formula) return false
    const upper = f.formula.toUpperCase()
    const usedFunctions = upper.match(/[A-Z]+(?=\()/g) || []
    return usedFunctions.every(fn => SUPPORTED_FUNCTIONS.includes(fn))
  })
}

// ── NEW: Generate date-based formulas when date columns detected ──
function generateDateFormulas(columnTypes, numericCols, rowCount) {
  const dateCols = columnTypes.filter(c => c.type === 'date')
  if (dateCols.length === 0) return []

  const dateFormulas = []
  const dateCol = dateCols[0] // use first date column
  const endRow = rowCount + 1

  // For each numeric column, add date-based analysis
  numericCols.slice(0, 2).forEach((numCol, i) => {
    const id_prefix = `date_${dateCol.letter}${numCol.letter}`

    // Count transactions per period using COUNTIF on date range
    dateFormulas.push({
      id: `${id_prefix}_count`,
      label: `Nb transactions (${numCol.header})`,
      formula: `=COUNTIF(${dateCol.letter}2:${dateCol.letter}${endRow},"<>")`,
      category: 'date_analysis',
      priority: 'high',
      colRef: dateCol.letter
    })

    // Sum per numeric col (total over all dates)
    dateFormulas.push({
      id: `${id_prefix}_total`,
      label: `Total ${numCol.header} (toutes dates)`,
      formula: `=SUM(${numCol.letter}2:${numCol.letter}${endRow})`,
      category: 'date_analysis',
      priority: 'high',
      colRef: numCol.letter
    })

    // Average per transaction
    dateFormulas.push({
      id: `${id_prefix}_avg`,
      label: `Moyenne ${numCol.header} par transaction`,
      formula: `=AVERAGE(${numCol.letter}2:${numCol.letter}${endRow})`,
      category: 'date_analysis',
      priority: 'medium',
      colRef: numCol.letter
    })

    // Max transaction
    dateFormulas.push({
      id: `${id_prefix}_max`,
      label: `Max ${numCol.header}`,
      formula: `=MAX(${numCol.letter}2:${numCol.letter}${endRow})`,
      category: 'date_analysis',
      priority: 'medium',
      colRef: numCol.letter
    })

    // Min transaction
    dateFormulas.push({
      id: `${id_prefix}_min`,
      label: `Min ${numCol.header}`,
      formula: `=MIN(${numCol.letter}2:${numCol.letter}${endRow})`,
      category: 'date_analysis',
      priority: 'low',
      colRef: numCol.letter
    })
  })

  return dateFormulas
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { step } = body

    // ── PHASE 1: Claude generates formula plan ──
    if (step === 'plan') {
      const { fileName, headers, rowCount, sampleRows } = body

      const maxCols = Math.min(headers.length, 20)
      const trimmedHeaders = headers.slice(0, maxCols)
      const trimmedSample = sampleRows.map(r => r.slice(0, maxCols))
      const maxFormulas = Math.min(headers.length * 3, 30)

      const columnTypes = detectColumnTypes(trimmedHeaders, trimmedSample)
      const colTypeSummary = columnTypes
        .map(c => `${c.letter}=${c.header} (${c.type})`)
        .join(', ')

      // ── NEW: detect date and numeric cols for prompt context ──
      const dateCols = columnTypes.filter(c => c.type === 'date')
      const numericCols = columnTypes.filter(c => c.type === 'numeric')
      const hasDateCol = dateCols.length > 0
      const dateColSummary = hasDateCol
        ? `\nCOLONNES DATE DÉTECTÉES : ${dateCols.map(c => `${c.letter}=${c.header}`).join(', ')} → génère des formules d'analyse temporelle`
        : ''

      const message = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000,
        system: `Tu es un expert Excel. Génère UNIQUEMENT du JSON valide et COMPLET.
RÈGLE CRITIQUE : Le JSON doit être 100% complet et syntaxiquement valide.
Limite-toi à ${maxFormulas} formules maximum pour garantir la complétude.
Ne commence JAMAIS une formule que tu ne peux pas terminer.
Réponds UNIQUEMENT avec le JSON, sans markdown, sans backticks, sans texte avant ou après.

FONCTIONS AUTORISÉES (moteur JS limité) :
✅ SUM, AVERAGE, COUNT, MAX, MIN → uniquement sur colonnes NUMÉRIQUES
✅ COUNTIF, SUMIF → sur toutes colonnes
❌ COUNTA, SUMPRODUCT, UNIQUE, VLOOKUP, INDEX, MATCH → INTERDITES`,
        messages: [{
          role: 'user',
          content: `Fichier : "${fileName}"
Lignes : ${rowCount} (données de la ligne 2 à la ligne ${rowCount + 1})
Colonnes avec types détectés : ${colTypeSummary}${dateColSummary}

5 premières lignes :
${trimmedSample.map((r, i) => `L${i + 2}: ${trimmedHeaders.map((h, j) => `${String.fromCharCode(65 + j)}="${r[j]}"`).join(', ')}`).join('\n')}

Génère le JSON suivant (COMPLET, max ${maxFormulas} formules) :
{
  "dataType": "type détecté",
  "analysisGoal": "objectif en 1 phrase",
  "formulas": [
    {
      "id": "f1",
      "label": "Libellé court",
      "formula": "=SUM(B2:B${rowCount + 1})",
      "category": "total",
      "priority": "high",
      "colRef": "B"
    }
  ]
}

RÈGLES IMPORTANTES :
- SUM, AVERAGE, COUNT, MAX, MIN → UNIQUEMENT sur colonnes (numeric) listées ci-dessus
- COUNTIF(col,"<>") → pour compter les lignes non vides sur colonnes (text)
- COUNTIF(col,"valeur") → pour compter par catégorie
- SUMIF(catCol,critère,numCol) → pour totaux par catégorie
- N'UTILISE JAMAIS COUNTA, SUMPRODUCT ou autres fonctions avancées
- TERMINE toujours le JSON avec }] fermant formulas et } fermant l'objet racine
${hasDateCol ? `- COLONNES DATE présentes → génère des formules SUM/AVERAGE/MAX/MIN sur les colonnes numériques pour analyser les transactions dans le temps` : ''}`,
        }]
      })

      const text = message.content[0].text
      let parsed = extractJSON(text)

      if (!parsed.formulas || !Array.isArray(parsed.formulas)) {
        parsed.formulas = []
      }

      // ── Post-processing pipeline ──

      // Step 1: Remove incomplete formula objects
      parsed.formulas = parsed.formulas.filter(f =>
        f && f.id && f.label && f.formula &&
        typeof f.formula === 'string' &&
        f.formula.startsWith('=')
      )

      // Step 2: Fix COUNT on text columns → COUNTIF("<>")
      const colTypes = detectColumnTypes(trimmedHeaders, trimmedSample)
      parsed.formulas = fixCountFormulas(parsed.formulas, colTypes)

      // Step 3: Replace any remaining COUNTA → COUNTIF("<>")
      parsed.formulas = fixCountaUnsupported(parsed.formulas)

      // Step 4: Remove any formula using unsupported functions
      parsed.formulas = removeUnsupportedFormulas(parsed.formulas)

      // Step 5: Deduplicate by formula string
      const seen = new Set()
      parsed.formulas = parsed.formulas.filter(f => {
        if (seen.has(f.formula)) return false
        seen.add(f.formula)
        return true
      })

      // ── NEW Step 6: Inject date-based formulas if date columns exist ──
      if (hasDateCol && numericCols.length > 0) {
        const dateFormulas = generateDateFormulas(columnTypes, numericCols, rowCount)

        // Add only non-duplicate date formulas
        dateFormulas.forEach(df => {
          if (!seen.has(df.formula)) {
            seen.add(df.formula)
            parsed.formulas.push(df)
          }
        })

        console.log(`[ExcelAI] ${dateCols.length} colonne(s) date détectée(s) → ${dateFormulas.length} formules temporelles ajoutées`)
      }

      console.log(`[ExcelAI plan] ${parsed.formulas.length} formules validées pour ${fileName}`)

      return NextResponse.json(parsed)
    }

    // ── PHASE 3: Claude interprets results ──
    if (step === 'interpret') {
      const { fileName, rowCount, dataType, analysisGoal, formulaResults, analysisRequest } = body

      const topResults = formulaResults
        .filter(f => f.result !== '#ERR' && f.result !== null && f.result !== undefined)
        .slice(0, 25)

      const message = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        system: `Tu es expert en business intelligence.
RÈGLE ABSOLUE : N'invente AUCUN chiffre. Utilise UNIQUEMENT les résultats fournis.
Génère du JSON 100% valide et COMPLET.
Si tu manques de place, termine correctement le JSON plutôt que de l'interrompre.`,
        messages: [{
          role: 'user',
          content: `Fichier : "${fileName}" · ${rowCount} lignes · ${dataType}
Objectif : ${analysisGoal}
Demande : "${analysisRequest || 'Analyse complète'}"

RÉSULTATS CALCULÉS PAR JAVASCRIPT (utilise UNIQUEMENT ces chiffres) :
${topResults.map(f => `- ${f.label} = ${typeof f.result === 'number' ? f.result.toLocaleString('fr-FR') : f.result}`).join('\n')}

Génère ce JSON COMPLET (2-3 sections max) :
{
  "title": "Titre du rapport",
  "generatedAt": "${new Date().toLocaleDateString('fr-FR')}",
  "summary": {
    "totalRows": ${rowCount},
    "keyFindings": ["constat 1 avec chiffre exact", "constat 2", "constat 3"],
    "overallScore": "évaluation en 1 phrase"
  },
  "sections": [
    {
      "title": "Titre",
      "type": "stats",
      "icon": "📊",
      "data": [
        {"label": "Libellé", "value": "valeur exacte", "trend": "up", "note": "note courte"}
      ],
      "insight": "commentaire basé sur les vrais chiffres"
    }
  ],
  "recommendations": [
    {"priority": "high", "action": "action basée sur les chiffres", "impact": "impact chiffré"}
  ]
}`,
        }]
      })

      const text = message.content[0].text
      let parsed = extractJSON(text)

      if (!parsed.sections) parsed.sections = []
      if (!parsed.recommendations) parsed.recommendations = []
      if (!parsed.summary) parsed.summary = { totalRows: rowCount, keyFindings: [], overallScore: '' }

      return NextResponse.json(parsed)
    }

    return NextResponse.json({ error: 'Step invalide' }, { status: 400 })

  } catch (error) {
    console.error('ExcelAI error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}