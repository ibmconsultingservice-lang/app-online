import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

// ── ERAC actions metadata ─────────────────────────────────────────────────────
export const ERAC_ACTIONS = {
  exclure:   { label: 'Exclure',   color: '#f87171', desc: 'Facteurs à supprimer totalement — coûts sans valeur perçue' },
  reduire:   { label: 'Réduire',   color: '#fb923c', desc: 'Facteurs à ramener sous le standard sectoriel' },
  renforcer: { label: 'Renforcer', color: '#60a5fa', desc: 'Facteurs à élever bien au-dessus du standard sectoriel' },
  creer:     { label: 'Créer',     color: '#34d399', desc: 'Facteurs entièrement nouveaux jamais offerts par le secteur' },
}

export async function POST(request) {
  try {
    const body = await request.json()
    const {
      projectName,
      projectTag,
      companyName,
      context,
      industry,
      targetCustomer,
      canvasFactors,      // [{ id, name, myScore, competitorScores: { [compName]: score }, eracAction }]
      competitors,        // [{ name, color }]
      eracDecisions,      // { exclure: [], reduire: [], renforcer: [], creer: [] }
      newFactors,         // [{ id, name, description }] — factors to create
      strategicIntent,
    } = body

    if (!canvasFactors || canvasFactors.length === 0) {
      return Response.json({ error: 'Aucun facteur de concurrence défini' }, { status: 400 })
    }

    const contextLines = [
      projectName     && `Entreprise / Projet : ${projectName}`,
      projectTag      && `Secteur : ${projectTag}`,
      companyName     && `Notre société : ${companyName}`,
      industry        && `Industrie : ${industry}`,
      targetCustomer  && `Client cible : ${targetCustomer}`,
      context         && `Contexte : ${context}`,
      strategicIntent && `Intention stratégique : ${strategicIntent}`,
    ].filter(Boolean).join('\n')

    const factorsDetail = canvasFactors.map(f => {
      const competLines = competitors?.map(c =>
        `  ${c.name} : ${f.competitorScores?.[c.name] ?? 3}/10`
      ).join('\n') || ''
      return `- ${f.name} | Notre score : ${f.myScore ?? 5}/10 | Action ERAC : ${f.eracAction || 'non définie'}
${competLines}`
    }).join('\n')

    const eracDetail = Object.entries(eracDecisions || {}).map(([action, factors]) => {
      if (!factors?.length) return null
      return `${ERAC_ACTIONS[action]?.label || action} : ${factors.join(', ')}`
    }).filter(Boolean).join('\n')

    const newFactorsDetail = (newFactors || []).map(f =>
      `- ${f.name}${f.description ? ` : ${f.description}` : ''}`
    ).join('\n')

    const prompt = `Tu es un expert mondial de la Stratégie Océan Bleu, auteur co-fondateur de la méthode W. Chan Kim & Renée Mauborgne.

${contextLines ? `## CONTEXTE\n${contextLines}\n` : ''}

## CANEVAS STRATÉGIQUE

### Facteurs de concurrence actuels :
${factorsDetail}

### Décisions ERAC :
${eracDetail || 'À analyser et recommander'}

${newFactorsDetail ? `### Facteurs à Créer proposés :\n${newFactorsDetail}` : ''}

---

Génère une analyse Océan Bleu complète, transformative et profondément actionnable.
Réponds UNIQUEMENT en JSON valide avec cette structure exacte :

{
  "ocean_diagnostic": {
    "current_state": "Évaluation de l'état actuel : dans quelle mesure l'entreprise est-elle dans un océan rouge ? 2-3 phrases percutantes.",
    "ocean_score": 2.8,
    "differentiation_score": 3.2,
    "label": "Océan Rouge Profond | Océan Rouge | Zone de Transition | Couleurs Océan Bleu | Océan Bleu Émergent | Océan Bleu"
  },

  "canvas_analysis": {
    "convergence_factors": ["Facteur où vous vous bataillez inutilement avec les concurrents"],
    "divergence_opportunities": ["Facteur où une rupture est possible"],
    "headline": "La nouvelle proposition de valeur en une phrase mémorable"
  },

  "erac_recommendations": {
    "exclure": [
      {
        "factor": "Nom du facteur",
        "rationale": "Pourquoi l'exclure — valeur créée vs coût économisé",
        "impact": "Fort | Modéré | Faible",
        "saving_estimate": "Description qualitative de l'économie réalisable"
      }
    ],
    "reduire": [
      {
        "factor": "Nom du facteur",
        "rationale": "Pourquoi et dans quelle mesure réduire",
        "target_level": "Description du niveau cible",
        "impact": "Fort | Modéré | Faible"
      }
    ],
    "renforcer": [
      {
        "factor": "Nom du facteur",
        "rationale": "Pourquoi élever ce facteur change la donne",
        "target_level": "Description du niveau cible ambitieux",
        "impact": "Fort | Modéré | Faible"
      }
    ],
    "creer": [
      {
        "factor": "Nom du facteur nouveau",
        "rationale": "Pourquoi ce facteur ouvre un espace non contesté",
        "value_proposition": "Valeur concrète apportée au client",
        "difficulty": "Faible | Modéré | Élevé",
        "impact": "Fort | Modéré | Faible"
      }
    ]
  },

  "new_value_curve": {
    "description": "Description de la nouvelle courbe de valeur résultant des décisions ERAC — comment elle diverge radicalement de la concurrence",
    "key_differences": ["Différence majeure #1", "Différence majeure #2", "Différence majeure #3"],
    "tagline": "Slogan stratégique mémorable pour le nouvel espace de marché"
  },

  "non_customers": {
    "tier1": {
      "label": "Non-clients de 1er niveau (bientôt)",
      "description": "Qui sont-ils, pourquoi partent-ils ou n'achètent-ils plus",
      "unlock_lever": "Comment les reconquérir avec la nouvelle stratégie"
    },
    "tier2": {
      "label": "Non-clients de 2ème niveau (opposants)",
      "description": "Qui utilisent délibérément des alternatives ou rien du tout",
      "unlock_lever": "Ce qui les attirerait vers votre nouvel espace"
    },
    "tier3": {
      "label": "Non-clients de 3ème niveau (inexplorés)",
      "description": "Marché jamais considéré comme cible",
      "unlock_lever": "L'opportunité cachée dans ce segment"
    }
  },

  "four_hurdles": {
    "cognitive": { "hurdle": "Résistance au changement identifiée", "solution": "Comment la surmonter" },
    "resource":  { "hurdle": "Contrainte de ressources principale", "solution": "Réallocation ou financement" },
    "motivation":{ "hurdle": "Manque de motivation interne", "solution": "Comment mobiliser les équipes" },
    "political": { "hurdle": "Opposition politique ou sectorielle", "solution": "Stratégie de contournement" }
  },

  "action_plan": [
    {
      "phase": "Phase 1 — Libérer (0-3 mois)",
      "actions": ["Action concrète #1", "Action #2", "Action #3"],
      "milestone": "Résultat mesurable de la phase"
    },
    {
      "phase": "Phase 2 — Construire (3-12 mois)",
      "actions": ["Action concrète #1", "Action #2", "Action #3"],
      "milestone": "Résultat mesurable de la phase"
    },
    {
      "phase": "Phase 3 — Dominer (12-36 mois)",
      "actions": ["Action concrète #1", "Action #2"],
      "milestone": "Résultat mesurable de la phase"
    }
  ],

  "blue_ocean_metrics": [
    { "metric": "KPI Océan Bleu #1 (non-clients convertis)", "target": "Cible ambitieuse mesurable" },
    { "metric": "KPI #2 (différenciation perçue)", "target": "Cible" },
    { "metric": "KPI #3 (coûts libérés)", "target": "Cible" }
  ],

  "conclusion": "Synthèse stratégique finale : l'océan bleu à conquérir, le mouvement stratégique à exécuter, et pourquoi maintenant est le bon moment. 3-4 phrases percutantes."
}

RÈGLES IMPÉRATIVES :
- ocean_score et differentiation_score entre 1.0 et 5.0
- ocean_score élevé = proche de l'océan bleu (5 = océan bleu pur)
- Cite les facteurs spécifiques fournis, ne génère pas de facteurs génériques
- Les décisions ERAC doivent créer une RUPTURE, pas une amélioration incrémentale
- Les non-clients doivent être identifiés selon le contexte sectoriel fourni
- Le plan d'action doit être opérationnel, pas théorique
- La tagline doit être mémorable et stratégiquement précise
- Si peu de facteurs "Créer", insister sur l'urgence d'innover sur des facteurs nouveaux`

    const response = await client.messages.create({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 3500,
      messages: [{ role: 'user', content: prompt }],
    })

    const rawText = response.content.filter(b => b.type === 'text').map(b => b.text).join('')

    let result
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON')
      result = JSON.parse(jsonMatch[0])
    } catch {
      result = {
        ocean_diagnostic: { current_state: rawText.slice(0, 400), ocean_score: 2.5, differentiation_score: 2.5, label: 'Zone de Transition' },
        canvas_analysis: { convergence_factors: [], divergence_opportunities: [], headline: 'Analyse en cours de traitement.' },
        erac_recommendations: { exclure: [], reduire: [], renforcer: [], creer: [] },
        new_value_curve: { description: '', key_differences: [], tagline: '' },
        non_customers: {},
        four_hurdles: {},
        action_plan: [],
        blue_ocean_metrics: [],
        conclusion: 'Relancez une analyse avec plus de contexte.',
      }
    }

    return Response.json({ success: true, result })

  } catch (err) {
    console.error('Blue Ocean API error:', err)
    return Response.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}