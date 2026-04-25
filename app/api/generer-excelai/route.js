import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const SYSTEM_PROMPT = `Tu es un consultant financier expert. Tu reçois des données financières BRUTES et EXACTES calculées directement depuis le fichier de l'utilisateur.

RÈGLE ABSOLUE : Tu dois utiliser UNIQUEMENT les chiffres fournis dans "AGRÉGATS CALCULÉS" et "DONNÉES BRUTES". Ne jamais inventer, estimer ou approximer. Si un chiffre n'est pas dans les données fournies, dis-le clairement.

Tu réponds UNIQUEMENT en JSON valide, sans markdown.

FORMAT : { "blocks": [ ...blocs... ] }

TYPES DE BLOCS :

1. { "type": "text", "content": "texte..." }

2. { "type": "table", "headers": ["Col1","Col2",...], "rows": [["val","val",...], ...] }

3. { "type": "chart", "title": "Titre", "chartType": "bar", "color": "#3b82f6",
    "data": [{"label":"X","value":123456,"displayValue":"123k"},...] }
   (pour valeurs mixtes +/- : "chartType":"negative-positive")

4. { "type": "insight", "tone": "positive|negative|neutral|warning", "content": "message court" }

RÈGLES DE PRÉSENTATION :
- Commence toujours par un bloc text court (1-2 phrases max).
- Pour les montants : utilise le format "103 305 937 FCFA" (espaces comme séparateurs de milliers).
- Pour les pourcentages : 1 décimale max.
- Max 5 blocs par réponse.
- Réponds en FRANÇAIS.
- Sois précis, direct, actionnable comme un consultant senior.`

export async function POST(req) {
  try {
    const {
      question,
      analysis,
      variables,
      csvAggregates,   // ← real computed aggregates from frontend parser
      csvHeaders,      // ← column names
      csvSampleRows,   // ← first 50 rows
      csvRawText,      // ← raw CSV text (truncated)
      chatHistory = [],
    } = await req.json()

    if (!question) {
      return NextResponse.json({ error: 'Question manquante' }, { status: 400 })
    }

    // ── Build the data context ────────────────────────────────────
    let dataContext = ''

    // Real aggregates from frontend (always exact)
    if (csvAggregates) {
      dataContext += '\n=== AGRÉGATS CALCULÉS (CHIFFRES EXACTS) ===\n'
      dataContext += `Nombre total de lignes : ${csvAggregates.totalRows}\n`

      if (csvAggregates.totalAmount !== undefined) {
        dataContext += `Montant total global : ${Math.round(csvAggregates.totalAmount).toLocaleString('fr-FR')} FCFA\n`
        dataContext += `Montant moyen par transaction : ${Math.round(csvAggregates.avgAmount).toLocaleString('fr-FR')} FCFA\n`
      }

      if (csvAggregates.byStatus) {
        dataContext += '\nRépartition par Statut (CHIFFRES EXACTS) :\n'
        const total = Object.values(csvAggregates.byStatus).reduce((a, b) => a + b, 0)
        for (const [status, amount] of Object.entries(csvAggregates.byStatus)) {
          const pct = total > 0 ? ((amount / total) * 100).toFixed(1) : '0'
          const count = csvAggregates.countByStatus?.[status] || '?'
          dataContext += `  ${status} : ${Math.round(amount).toLocaleString('fr-FR')} FCFA (${pct}% du total) — ${count} transactions\n`
        }
      }

      if (csvAggregates.byCategory) {
        dataContext += '\nRépartition par Catégorie (CHIFFRES EXACTS) :\n'
        const sorted = Object.entries(csvAggregates.byCategory).sort((a, b) => b[1] - a[1])
        for (const [cat, amount] of sorted) {
          dataContext += `  ${cat} : ${Math.round(amount).toLocaleString('fr-FR')} FCFA\n`
        }
      }

      if (csvAggregates.byMonth) {
        dataContext += '\nRépartition par Mois (CHIFFRES EXACTS) :\n'
        const sorted = Object.entries(csvAggregates.byMonth).sort((a, b) => a[0].localeCompare(b[0]))
        for (const [month, amount] of sorted) {
          dataContext += `  ${month} : ${Math.round(amount).toLocaleString('fr-FR')} FCFA\n`
        }
      }

      if (csvAggregates.totalQty !== undefined) {
        dataContext += `\nQuantité totale : ${Math.round(csvAggregates.totalQty).toLocaleString('fr-FR')}\n`
      }
    }

    // Column names
    if (csvHeaders?.length) {
      dataContext += `\nColonnes disponibles : ${csvHeaders.join(', ')}\n`
    }

    // Sample rows (first 50 for Claude to compute custom aggregations)
    if (csvSampleRows?.length) {
      dataContext += `\n=== DONNÉES BRUTES (${csvSampleRows.length} premières lignes) ===\n`
      // Format as compact table
      if (csvHeaders?.length) {
        dataContext += csvHeaders.join(' | ') + '\n'
        dataContext += csvSampleRows.map(row =>
          csvHeaders.map(h => row[h] || '').join(' | ')
        ).join('\n')
        dataContext += '\n'
      }
    }

    // Analysis JSON as fallback context
    if (analysis) {
      dataContext += `\n=== ANALYSE IA (synthèse approximative) ===\n`
      dataContext += `Score santé : ${analysis.healthScore}/100\n`
      dataContext += `Résumé : ${analysis.summary || 'N/A'}\n`
    }

    if (variables) {
      dataContext += `\nHypothèses : Croissance ${variables.growthRate}%, Coûts -${variables.costReduction}%, IS ${variables.taxRate}%, WACC ${variables.discountRate}%, Inflation ${variables.inflationRate}%\n`
    }

    // ── Build conversation messages ───────────────────────────────
    const messages = []

    for (const msg of chatHistory.slice(-6)) {
      if (msg.role === 'user') {
        messages.push({ role: 'user', content: msg.content })
      } else if (msg.role === 'assistant' && msg.blocks) {
        messages.push({ role: 'assistant', content: JSON.stringify({ blocks: msg.blocks }) })
      }
    }

    messages.push({
      role: 'user',
      content: `${dataContext}\n\nQUESTION : ${question}`,
    })

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages,
    })

    const raw = response.content[0].text.trim().replace(/```json|```/g, '').trim()

    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch {
      return NextResponse.json({ blocks: [{ type: 'text', content: raw }] })
    }

    return NextResponse.json({ blocks: parsed.blocks || [] })
  } catch (err) {
    console.error('[financeai-chat]', err.message)
    return NextResponse.json({
      blocks: [{ type: 'text', content: 'Erreur serveur. Réessayez.' }]
    }, { status: 500 })
  }
}