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
    const { projectName, sector, activityType, region, objectives, description } = body

    const contextLines = [
      projectName   && `Projet / Entreprise : ${projectName}`,
      sector        && `Secteur : ${sector}`,
      activityType  && `Type d'activité : ${activityType}`,
      region        && `Région / Marché : ${region}`,
      objectives    && `Objectifs : ${objectives}`,
      description   && `Contexte détaillé : ${description}`,
    ].filter(Boolean).join('\n')

    if (!contextLines) {
      return Response.json({ error: 'Contexte requis' }, { status: 400 })
    }

    const prompt = `Tu es un expert en intelligence concurrentielle et en stratégie de marché.

## CONTEXTE DU PROJET
${contextLines}

---

À partir de ces informations, identifie les concurrents les plus pertinents et génère un rapport de veille concurrentielle complet.

Réponds UNIQUEMENT en JSON valide :

{
  "reportName": "Nom court du rapport de veille (ex: 'Veille concurrentielle SaaS RH Afrique 2025')",
  "context": "Résumé du contexte stratégique en 2-3 phrases",
  "myCompany": "${projectName || 'Notre entreprise'}",
  "competitors": [
    {
      "name": "Nom du concurrent",
      "url": "site web probable (ex: https://exemple.com)",
      "positioning": "Positionnement marché en 1 phrase",
      "notes": "Signaux clés connus : financement, croissance, produits récents",
      "threat_score": 3.8,
      "status": "Leader établi | Challenger agressif | Niche player | En déclin",
      "headline": "Signal récent le plus important à surveiller",
      "strengths": ["Force 1 spécifique", "Force 2", "Force 3"],
      "weaknesses": ["Faiblesse exploitable 1", "Faiblesse 2"],
      "next_move": "Prochain mouvement stratégique probable (1-2 phrases)",
      "categories": {
        "pricing":    { "signal": "Analyse de leur politique tarifaire", "impact": "fort|modéré|faible", "trend": "hausse|baisse|stable|incertain" },
        "product":    { "signal": "Évolutions produit récentes ou probables", "impact": "fort", "trend": "hausse" },
        "marketing":  { "signal": "Stratégie marketing observée", "impact": "modéré", "trend": "stable" },
        "social":     { "signal": "Présence et activité sociale", "impact": "faible", "trend": "stable" },
        "hiring":     { "signal": "Signaux de recrutement = indices de croissance", "impact": "modéré", "trend": "hausse" },
        "reputation": { "signal": "Perception marché et avis clients", "impact": "fort", "trend": "stable" }
      }
    }
  ],
  "threat_score": 3.2,
  "executive_summary": "Résumé exécutif de 3-4 phrases sur le paysage concurrentiel, le niveau de menace global, et les principales dynamiques à surveiller.",
  "market_signals": [
    {
      "type": "opportunite|menace|tendance|rupture",
      "title": "Titre court du signal",
      "description": "Description du signal et implications pour notre entreprise",
      "urgency": "Immédiat | Court terme (3 mois) | Moyen terme (6-12 mois)"
    }
  ],
  "competitive_matrix": {
    "leader":     "Nom du concurrent le plus menaçant",
    "challenger": "Concurrent en forte montée",
    "vulnerable": "Concurrent le plus attaquable",
    "wild_card":  "Concurrent imprévisible"
  },
  "action_plan": [
    {
      "priority": 1,
      "action": "Action stratégique prioritaire concrète",
      "rationale": "Pourquoi cette action en réponse à la concurrence",
      "timeline": "Immédiat | 1 mois | 3 mois | 6 mois",
      "owner": "Marketing | Produit | Commercial | Direction"
    }
  ],
  "watch_next": "Description de ce qu'il faudra surveiller lors du prochain cycle de veille (2-3 phrases).",
  "watchCategories": ["pricing", "product", "marketing", "social", "hiring", "reputation"]
}

RÈGLES IMPÉRATIVES :
- Identifier 3 à 6 concurrents RÉALISTES et PERTINENTS pour ce secteur/région
- threat_score : décimal entre 1.0 et 5.0 (5 = menace critique)
- Les concurrents doivent être ordonnés par niveau de menace décroissant
- Si la région est précisée, prioriser les concurrents locaux et régionaux
- Les forces/faiblesses doivent être SPÉCIFIQUES et ACTIONNABLES, pas génériques
- Les signaux par catégorie doivent être plausibles pour le secteur
- impact : exactement "fort", "modéré" ou "faible"
- trend : exactement "hausse", "baisse", "stable" ou "incertain"
- Le plan d'action doit être une réponse directe à la pression concurrentielle identifiée
- Si peu d'informations sont disponibles sur un concurrent, l'indiquer dans notes mais générer quand même des estimations plausibles`

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

      // Sanitize competitors
      result.competitors = (result.competitors || []).map(c => ({
        ...c,
        id:          `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        threat_score: Math.min(5, Math.max(1, parseFloat(c.threat_score) || 3)),
        categories:  c.categories || {},
      }))

      result.threat_score = Math.min(5, Math.max(1, parseFloat(result.threat_score) || 3))
      result.generatedByAI = true

    } catch (e) {
      return Response.json({ error: 'Erreur de génération — veuillez réessayer.' }, { status: 500 })
    }

    return Response.json({ success: true, result })

  } catch (err) {
    console.error('CompetitorSpy Auto error:', err)
    return Response.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}