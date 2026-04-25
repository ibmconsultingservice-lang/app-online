/**
 * lib/parseFinanceFile.js
 * Parses a CSV or XLSX file (Buffer) and returns exact aggregates.
 * Used by both /api/generer-financeai and /api/financeai-chat
 */

// ── Detect numeric columns and clean values ───────────────────────────────────
function parseNumber(str) {
  if (str === null || str === undefined) return null
  const cleaned = String(str).replace(/\s/g, '').replace(/,/g, '').replace(/[^0-9.-]/g, '')
  const n = parseFloat(cleaned)
  return isNaN(n) ? null : n
}

// ── Parse CSV text into rows ──────────────────────────────────────────────────
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return { headers: [], rows: [] }

  // Detect delimiter
  const firstLine = lines[0]
  const delimiter = firstLine.includes(';') ? ';' : ','

  const headers = firstLine.split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''))

  const rows = lines.slice(1).map(line => {
    const values = []
    let inQuotes = false
    let current = ''
    for (const char of line) {
      if (char === '"') { inQuotes = !inQuotes; continue }
      if (char === delimiter && !inQuotes) { values.push(current.trim()); current = ''; continue }
      current += char
    }
    values.push(current.trim())
    const row = {}
    headers.forEach((h, i) => { row[h] = values[i] || '' })
    return row
  }).filter(row => Object.values(row).some(v => v !== ''))

  return { headers, rows }
}

// ── Find column by keyword match ──────────────────────────────────────────────
function findCol(headers, keywords) {
  const kws = keywords.map(k => k.toLowerCase())
  return headers.find(h => kws.some(k => h.toLowerCase().includes(k))) || null
}

// ── Main aggregator ───────────────────────────────────────────────────────────
export function aggregateFileData(text) {
  const { headers, rows } = parseCSV(text)
  if (!rows.length) return null

  // ── Detect key columns ───────────────────────────────────────────────────
  const statutCol  = findCol(headers, ['statut', 'status', 'état', 'etat'])
  const montantCol = findCol(headers, ['montant', 'total', 'amount', 'ca', 'chiffre'])
  const dateCol    = findCol(headers, ['date', 'période', 'mois'])
  const catCol     = findCol(headers, ['catégorie', 'categorie', 'category', 'produit', 'type'])
  const villeCol   = findCol(headers, ['ville', 'city', 'région', 'region'])
  const commCol    = findCol(headers, ['commercial', 'vendeur', 'agent', 'rep'])
  const qteCol     = findCol(headers, ['quantité', 'quantite', 'qty', 'quantity'])
  const prixCol    = findCol(headers, ['prix', 'price', 'unitaire'])

  // ── By statut ────────────────────────────────────────────────────────────
  const byStatut = {}
  if (statutCol && montantCol) {
    for (const row of rows) {
      const s = (row[statutCol] || 'Inconnu').trim()
      const m = parseNumber(row[montantCol])
      if (m === null) continue
      if (!byStatut[s]) byStatut[s] = { total: 0, count: 0 }
      byStatut[s].total += m
      byStatut[s].count++
    }
  }

  // ── By category ──────────────────────────────────────────────────────────
  const byCat = {}
  if (catCol && montantCol) {
    for (const row of rows) {
      const c = (row[catCol] || 'Autre').trim()
      const m = parseNumber(row[montantCol])
      if (m === null) continue
      if (!byCat[c]) byCat[c] = { total: 0, count: 0 }
      byCat[c].total += m
      byCat[c].count++
    }
  }

  // ── By month ─────────────────────────────────────────────────────────────
  const byMonth = {}
  if (dateCol && montantCol) {
    for (const row of rows) {
      const d = row[dateCol] || ''
      const monthKey = d.length >= 7 ? d.substring(0, 7) : d.substring(0, 4) // YYYY-MM or YYYY
      const m = parseNumber(row[montantCol])
      if (!monthKey || m === null) continue
      if (!byMonth[monthKey]) byMonth[monthKey] = { total: 0, count: 0 }
      byMonth[monthKey].total += m
      byMonth[monthKey].count++
    }
  }

  // ── By commercial ─────────────────────────────────────────────────────────
  const byComm = {}
  if (commCol && montantCol) {
    for (const row of rows) {
      const c = (row[commCol] || 'Inconnu').trim()
      const m = parseNumber(row[montantCol])
      if (m === null) continue
      if (!byComm[c]) byComm[c] = { total: 0, count: 0 }
      byComm[c].total += m
      byComm[c].count++
    }
  }

  // ── By ville ─────────────────────────────────────────────────────────────
  const byVille = {}
  if (villeCol && montantCol) {
    for (const row of rows) {
      const v = (row[villeCol] || 'Inconnue').trim()
      const m = parseNumber(row[montantCol])
      if (m === null) continue
      if (!byVille[v]) byVille[v] = { total: 0, count: 0 }
      byVille[v].total += m
      byVille[v].count++
    }
  }

  // ── Global totals ────────────────────────────────────────────────────────
  const allMontants = rows.map(r => montantCol ? parseNumber(r[montantCol]) : null).filter(n => n !== null)
  const globalTotal = allMontants.reduce((a, b) => a + b, 0)
  const avg = allMontants.length ? globalTotal / allMontants.length : 0
  const max = allMontants.length ? Math.max(...allMontants) : 0
  const min = allMontants.length ? Math.min(...allMontants) : 0

  // ── Format helper ────────────────────────────────────────────────────────
  const fmt = (n) => Math.round(n).toLocaleString('fr-FR')

  // ── Build summary string for Claude context ───────────────────────────────
  let summary = `=== DONNÉES BRUTES EXACTES (calculées ligne par ligne sur ${rows.length} enregistrements) ===\n\n`

  summary += `COLONNES DÉTECTÉES : ${headers.join(', ')}\n\n`

  summary += `TOTAL GLOBAL : ${fmt(globalTotal)} FCFA (${rows.length} transactions)\n`
  summary += `Panier moyen : ${fmt(avg)} FCFA | Min : ${fmt(min)} | Max : ${fmt(max)}\n\n`

  if (Object.keys(byStatut).length) {
    summary += `TOTAUX PAR STATUT (chiffres exacts) :\n`
    for (const [s, d] of Object.entries(byStatut)) {
      const pct = globalTotal > 0 ? ((d.total / globalTotal) * 100).toFixed(1) : 0
      summary += `  • ${s} : ${fmt(d.total)} FCFA (${d.count} transactions, ${pct}% du total)\n`
    }
    summary += '\n'
  }

  if (Object.keys(byCat).length) {
    summary += `TOTAUX PAR CATÉGORIE :\n`
    const sorted = Object.entries(byCat).sort((a, b) => b[1].total - a[1].total)
    for (const [c, d] of sorted) {
      summary += `  • ${c} : ${fmt(d.total)} FCFA (${d.count} ventes)\n`
    }
    summary += '\n'
  }

  if (Object.keys(byMonth).length) {
    summary += `TOTAUX PAR MOIS (chronologique) :\n`
    const sorted = Object.entries(byMonth).sort((a, b) => a[0].localeCompare(b[0]))
    for (const [m, d] of sorted) {
      summary += `  • ${m} : ${fmt(d.total)} FCFA (${d.count} ventes)\n`
    }
    summary += '\n'
  }

  if (Object.keys(byComm).length) {
    summary += `PERFORMANCE PAR COMMERCIAL :\n`
    const sorted = Object.entries(byComm).sort((a, b) => b[1].total - a[1].total)
    for (const [c, d] of sorted) {
      summary += `  • ${c} : ${fmt(d.total)} FCFA (${d.count} ventes)\n`
    }
    summary += '\n'
  }

  if (Object.keys(byVille).length) {
    summary += `TOTAUX PAR VILLE :\n`
    const sorted = Object.entries(byVille).sort((a, b) => b[1].total - a[1].total)
    for (const [v, d] of sorted) {
      summary += `  • ${v} : ${fmt(d.total)} FCFA (${d.count} ventes)\n`
    }
    summary += '\n'
  }

  return {
    summary,           // string injected into Claude context
    raw: {             // structured data for programmatic use
      totalRows: rows.length,
      globalTotal,
      avg, max, min,
      byStatut,
      byCat,
      byMonth,
      byComm,
      byVille,
      headers,
    }
  }
}