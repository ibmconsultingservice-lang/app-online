import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const CATEGORY_META = {
  pricing:    { label: 'Tarifs'     },
  product:    { label: 'Produit'    },
  marketing:  { label: 'Marketing'  },
  social:     { label: 'Social'     },
  hiring:     { label: 'RH'         },
  reputation: { label: 'Réputation' },
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { reportName, context, myCompany, period, competitors, watchCategories, projectName, projectTag } = body

    const validComps = (competitors || []).filter(c => c.name?.trim())
    if (validComps.length === 0) {
      return Response.json({ error: 'Au moins un concurrent requis' }, { status: 400 })
    }

    const periodLabel = { weekly: 'hebdomadaire', monthly: 'mensuelle', quarterly: 'trimestrielle' }[period] || 'mensuelle'

    const contextLines = [
      myCompany   && `Notre entreprise : ${myCompany}`,
      projectName && `Projet : ${projectName}`,
      projectTag  && `Secteur : ${projectTag}`,
      context     && `Contexte stratégique : ${context}`,
    ].filter(Boolean).join('\n')

    const compsText = validComps.map((c, i) => `
**${i+1}. ${c.name}**
${c.url    ? `- Site : ${c.url}`           : ''}
${c.notes  ? `- Notes existantes : ${c.notes}` : ''}
${c.positioning ? `- Positionnement : ${c.positioning}` : ''}
`).join('')

    const watchCats = (watchCategories || Object.keys(CATEGORY_META)).map(k => CATEGORY_META[k]?.label || k).join(', ')

    const prompt = `Tu es un expert en intelligence concurrentielle.
Tu analyses la situation existante et génères des recommandations stratégiques actionnables.

## CONTEXTE
${contextLines}
Période de veille : ${periodLabel}
Axes surveillés : ${watchCats}

## CONCURRENTS À ANALYSER
${compsText}

---

Génère un rapport de veille concurrentielle complet. Réponds UNIQUEMENT en JSON valide :

{
  "threat_score": 3.5,
  "executive_summary": "Résumé exécutif de 3-4 phrases sur le paysage concurrentiel actuel, l'évolution depuis la dernière période, et les actions urgentes.",

  "competitors": [
    {
      "name": "Nom exact du concurrent",
      "threat_score": 4.0,
      "status": "Leader établi | Challenger agressif | Niche player | En déclin | Émergent",
      "headline": "Signal ou mouvement le plus important à retenir",
      "strengths":  ["Force critique 1", "Force 2", "Force 3"],
      "weaknesses": ["Faiblesse exploitable 1", "Faiblesse 2"],
      "next_move":  "Prochain mouvement stratégique probable en 1-2 phrases",
      "categories": {
        "pricing":    { "signal": "Analyse tarifs spécifique", "impact": "fort|modéré|faible", "trend": "hausse|baisse|stable|incertain" },
        "product":    { "signal": "Évolutions produit",        "impact": "fort",    "trend": "hausse"   },
        "marketing":  { "signal": "Stratégie marketing",       "impact": "modéré",  "trend": "stable"   },
        "social":     { "signal": "Activité sociale",          "impact": "faible",  "trend": "stable"   },
        "hiring":     { "signal": "Signaux RH/recrutement",    "impact": "modéré",  "trend": "hausse"   },
        "reputation": { "signal": "Perception marché",         "impact": "fort",    "trend": "stable"   }
      }
    }
  ],

  "market_signals": [
    {
      "type": "opportunite|menace|tendance|rupture",
      "title": "Titre court du signal marché",
      "description": "Description et implications concrètes pour nous",
      "urgency": "Immédiat | Court terme (3 mois) | Moyen terme (6-12 mois)"
    }
  ],

  "competitive_matrix": {
    "leader":     "Concurrent le plus menaçant",
    "challenger": "Concurrent en montée",
    "vulnerable": "Concurrent le plus attaquable",
    "wild_card":  "Concurrent imprévisible"
  },

  "gaps_analysis": {
    "nos_avantages": ["Avantage concurrentiel #1", "Avantage #2"],
    "nos_lacunes":   ["Lacune à combler #1", "Lacune #2"],
    "white_spaces":  ["Opportunité de marché non couverte #1", "Opportunité #2"]
  },

  "action_plan": [
    {
      "priority": 1,
      "action":    "Action stratégique concrète et mesurable",
      "rationale": "Justification basée sur l'analyse concurrentielle",
      "timeline":  "Immédiat | 1 mois | 3 mois | 6 mois",
      "owner":     "Marketing | Produit | Commercial | Direction"
    }
  ],

  "kpis_to_track": [
    "KPI ou signal à surveiller #1 pour la prochaine période",
    "KPI #2",
    "KPI #3"
  ],

  "watch_next": "Ce qu'il faudra surveiller lors de la prochaine veille ${periodLabel} (2-3 phrases spécifiques)."
}

RÈGLES :
- threat_score global = moyenne pondérée des menaces individuelles
- Analyser CHAQUE concurrent fourni, sans exception
- N'inclure que les catégories demandées dans watchCategories : ${watchCats}
- Les forces/faiblesses doivent être ACTIONNABLES et SPÉCIFIQUES
- Le plan d'action doit être ordonné par urgence × impact (max 5 actions)
- gaps_analysis = analyse différentielle entre nous et la concurrence
- Si peu de données sur un concurrent, baser l'analyse sur le secteur et les indices disponibles
- impact : exactement "fort", "modéré" ou "faible"
- trend : exactement "hausse", "baisse", "stable" ou "incertain"`

    const response = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    })

    const rawText = response.content.filter(b => b.type === 'text').map(b => b.text).join('')

    let result
    try {
      const m = rawText.match(/\{[\s\S]*\}/)
      if (!m) throw new Error('No JSON')
      result = JSON.parse(m[0])

      result.threat_score = Math.min(5, Math.max(1, parseFloat(result.threat_score) || 3))
      result.competitors  = (result.competitors || []).map(c => ({
        ...c,
        threat_score: Math.min(5, Math.max(1, parseFloat(c.threat_score) || 3)),
      }))
    } catch {
      result = {
        threat_score: 3,
        executive_summary: rawText.slice(0, 400),
        competitors: validComps.map(c => ({
          name: c.name, threat_score: 3, status: 'À analyser',
          headline: 'Analyse non disponible', strengths: [], weaknesses: [],
          next_move: '', categories: {},
        })),
        market_signals: [], competitive_matrix: {}, gaps_analysis: { nos_avantages: [], nos_lacunes: [], white_spaces: [] },
        action_plan: [], kpis_to_track: [],
        watch_next: 'Veuillez relancer l\'analyse pour obtenir des recommandations.',
      }
    }

    return Response.json({ success: true, result })

  } catch (err) {
    console.error('CompetitorSpy analyse error:', err)
    return Response.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}