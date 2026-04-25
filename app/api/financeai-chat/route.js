import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const SYSTEM_PROMPT = `Tu es un consultant financier expert de haut niveau. Tu as accès aux données financières analysées d'une entreprise et tu dois répondre aux questions de manière précise, intelligente et visuelle.

Tu réponds UNIQUEMENT en JSON valide. Pas de markdown, pas de texte avant ou après.

FORMAT DE RÉPONSE : un objet JSON avec une clé "blocks" contenant un tableau de blocs.

TYPES DE BLOCS DISPONIBLES :

1. Bloc texte :
{ "type": "text", "content": "Votre analyse ici..." }

2. Bloc tableau :
{ 
  "type": "table",
  "headers": ["Indicateur", "Valeur", "Benchmark", "Statut"],
  "rows": [
    ["Marge brute", "42%", "35-45%", "✓ Bon"],
    ["EBITDA", "18%", "15-20%", "✓ Bon"]
  ]
}

3. Bloc graphique (barre) :
{
  "type": "chart",
  "title": "Titre du graphique",
  "chartType": "bar",
  "color": "#3b82f6",
  "data": [
    { "label": "Jan", "value": 45000, "displayValue": "45k" },
    { "label": "Fév", "value": -12000, "displayValue": "-12k" }
  ]
}
(Pour un graphique avec valeurs positives/négatives, utilise "chartType": "negative-positive")

4. Bloc insight (encadré coloré) :
{
  "type": "insight",
  "tone": "positive|negative|neutral|warning",
  "content": "Message court et percutant sur un point clé."
}

RÈGLES :
- Commence TOUJOURS par un bloc "text" d'introduction courte (1-2 phrases max).
- Utilise les tableaux pour comparer des données chiffrées.
- Utilise les graphiques pour montrer des tendances ou évolutions.
- Utilise les insights pour les conclusions ou alertes importantes.
- Max 4-5 blocs par réponse pour rester lisible.
- Sois précis, chiffré, actionnable. Parle comme un consultant senior à son client.
- Adapte tes réponses aux données réelles fournies dans le contexte.
- Si une donnée manque, dis-le clairement dans le texte.
- Réponds toujours en FRANÇAIS.`

export async function POST(req) {
  try {
    const { question, analysis, variables, fileData, chatHistory = [] } = await req.json()

    if (!question) {
      return NextResponse.json({ error: 'Question manquante' }, { status: 400 })
    }

    // Build context from analysis data
    const analysisContext = analysis ? `
DONNÉES FINANCIÈRES ANALYSÉES :
- Entreprise : ${analysis.companyName || 'Non spécifié'}
- Score santé : ${analysis.healthScore}/100
- CA : ${analysis.kpis?.revenue || 'N/A'}
- Marge nette : ${analysis.kpis?.netMargin || 'N/A'} (tendance: ${analysis.kpis?.netMarginTrend || 'N/A'}%)
- EBITDA : ${analysis.kpis?.ebitda || 'N/A'} (tendance: ${analysis.kpis?.ebitdaTrend || 'N/A'}%)
- BFR : ${analysis.kpis?.bfr || 'N/A'}
- Synthèse : ${analysis.summary || 'N/A'}
- Alertes : ${analysis.alerts?.map(a => a.message).join(' | ') || 'Aucune'}
- Recommandations : ${analysis.recommendations?.join(' | ') || 'Aucune'}
${analysis.projections ? `- Projections : ${JSON.stringify(analysis.projections)}` : ''}
${analysis.performance ? `- Performance : ${JSON.stringify(analysis.performance)}` : ''}

HYPOTHÈSES ACTUELLES :
- Croissance attendue : ${variables?.growthRate || 10}%
- Réduction coûts : ${variables?.costReduction || 5}%
- Taux IS : ${variables?.taxRate || 30}%
- WACC : ${variables?.discountRate || 10}%
- Inflation : ${variables?.inflationRate || 3}%
` : 'Aucune analyse disponible.'

    const fileContext = fileData ? `\nDONNÉES BRUTES SAISIES :\n${fileData}` : ''

    // Build conversation history for context
    const messages = []

    // Add previous turns (max 6 messages = 3 exchanges)
    for (const msg of chatHistory.slice(-6)) {
      if (msg.role === 'user') {
        messages.push({ role: 'user', content: msg.content })
      } else if (msg.role === 'assistant' && msg.blocks) {
        messages.push({
          role: 'assistant',
          content: JSON.stringify({ blocks: msg.blocks })
        })
      }
    }

    // Add current question
    messages.push({
      role: 'user',
      content: `CONTEXTE FINANCIER :\n${analysisContext}${fileContext}\n\nQUESTION DU CLIENT : ${question}`
    })

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages,
    })

    const raw = response.content[0].text.trim().replace(/```json|```/g, '').trim()

    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch {
      // Fallback: return as plain text block if JSON parsing fails
      return NextResponse.json({
        blocks: [{ type: 'text', content: raw }]
      })
    }

    return NextResponse.json({ blocks: parsed.blocks || [] })
  } catch (err) {
    console.error('[financeai-chat]', err.message)
    return NextResponse.json({
      blocks: [{
        type: 'text',
        content: 'Une erreur est survenue lors de la consultation. Réessayez.'
      }]
    }, { status: 500 })
  }
}