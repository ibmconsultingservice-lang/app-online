import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

// ── Strategy metadata ─────────────────────────────────────────────────────────
const STRATEGIES = {
  penetration: {
    key:         'penetration',
    label:       'Pénétration de marché',
    market:      'Existant',
    product:     'Existant',
    risk:        'Faible',
    riskScore:   1,
    description: 'Augmenter les parts de marché avec les produits existants sur les marchés actuels.',
  },
  development: {
    key:         'development',
    label:       'Développement de marché',
    market:      'Nouveau',
    product:     'Existant',
    risk:        'Modéré',
    riskScore:   2,
    description: 'Introduire les produits existants sur de nouveaux marchés géographiques ou segments.',
  },
  extension: {
    key:         'extension',
    label:       'Extension produit',
    market:      'Existant',
    product:     'Nouveau',
    risk:        'Modéré',
    riskScore:   2,
    description: 'Développer de nouveaux produits pour les marchés existants.',
  },
  diversification: {
    key:         'diversification',
    label:       'Diversification',
    market:      'Nouveau',
    product:     'Nouveau',
    risk:        'Élevé',
    riskScore:   4,
    description: 'Lancer de nouveaux produits sur de nouveaux marchés — quadrant le plus risqué.',
  },
}

export async function POST(request) {
  try {
    const body = await request.json()
    const {
      projectName,
      projectTag,
      companyDescription,
      currentProducts,
      currentMarkets,
      objectives,
      resources,
      timeHorizon,
      selectedStrategies, // string[] of strategy keys
      strategyDetails,    // { [key]: { rationale, constraints, opportunities } }
    } = body

    if (!selectedStrategies || selectedStrategies.length === 0) {
      return Response.json({ error: 'Aucune stratégie sélectionnée' }, { status: 400 })
    }

    const contextLines = [
      projectName         && `Entreprise / Projet : ${projectName}`,
      projectTag          && `Secteur : ${projectTag}`,
      companyDescription  && `Description : ${companyDescription}`,
      currentProducts     && `Produits / services actuels : ${currentProducts}`,
      currentMarkets      && `Marchés actuels : ${currentMarkets}`,
      objectives          && `Objectifs de croissance : ${objectives}`,
      resources           && `Ressources disponibles : ${resources}`,
      timeHorizon         && `Horizon temporel : ${timeHorizon}`,
    ].filter(Boolean).join('\n')

    const strategiesDetail = selectedStrategies.map(k => {
      const meta    = STRATEGIES[k]
      const details = strategyDetails?.[k] || {}
      return `
### ${meta.label} (Marché ${meta.market} × Produit ${meta.product}) — Risque ${meta.risk}
${meta.description}
${details.rationale     ? `Justification utilisateur : ${details.rationale}` : ''}
${details.constraints   ? `Contraintes identifiées : ${details.constraints}` : ''}
${details.opportunities ? `Opportunités identifiées : ${details.opportunities}` : ''}
`.trim()
    }).join('\n\n')

    const prompt = `Tu es un consultant en stratégie d'entreprise expert de la matrice Ansoff et du développement commercial.

${contextLines ? `## CONTEXTE\n${contextLines}\n` : ''}

## STRATÉGIES SÉLECTIONNÉES

${strategiesDetail}

---

Génère une analyse stratégique Ansoff complète, personnalisée et immédiatement actionnable.
Réponds UNIQUEMENT en JSON valide avec cette structure exacte :

{
  "executive_summary": "Synthèse de 3-5 phrases : cohérence des choix stratégiques avec le contexte, équilibre risque/opportunité global, recommandation de priorisation.",

  "global_score": {
    "growth_potential": 3.8,
    "risk_level": 2.5,
    "feasibility": 3.2,
    "recommendation": "Court texte sur la combinaison stratégique recommandée"
  },

  "strategies": [
    {
      "key": "penetration|development|extension|diversification",
      "priority": 1,
      "headline": "Angle stratégique percutant en une phrase",
      "analysis": "Analyse de 2-3 phrases : pourquoi cette stratégie est pertinente (ou risquée) dans ce contexte précis. Basée sur le contexte fourni.",
      "growth_potential": 3.5,
      "risk_score": 2.0,
      "timeframe": "0-6 mois | 6-18 mois | 18-36 mois | 3-5 ans",
      "kpis": [
        "KPI mesurable #1",
        "KPI mesurable #2",
        "KPI mesurable #3"
      ],
      "action_steps": [
        {
          "phase": "Phase 1 — Nom court",
          "duration": "ex: Semaines 1-4",
          "actions": ["Action concrète #1", "Action concrète #2", "Action concrète #3"]
        },
        {
          "phase": "Phase 2 — Nom court",
          "duration": "ex: Mois 2-6",
          "actions": ["Action concrète #1", "Action concrète #2"]
        }
      ],
      "resources_needed": ["Ressource humaine / budget / tech #1", "Ressource #2"],
      "risks": ["Risque #1 avec mitigation suggérée", "Risque #2"],
      "quick_wins": ["Quick win réalisable en <30 jours #1", "Quick win #2"]
    }
  ],

  "synergies": [
    "Synergie entre deux stratégies si plusieurs sélectionnées : comment elles se renforcent"
  ],

  "prioritization": {
    "immediate": "Stratégie à activer en premier et pourquoi (1-2 phrases)",
    "sequence": "Ordre recommandé d'activation des stratégies avec justification"
  },

  "watchouts": [
    "Piège ou erreur classique à éviter #1 dans ce contexte",
    "Piège #2"
  ],

  "conclusion": "Phrase de conclusion stratégique sur le positionnement de croissance recommandé."
}

RÈGLES IMPÉRATIVES :
- growth_potential, risk_score, feasibility entre 1.0 et 5.0
- Chaque analyse doit citer des éléments concrets du contexte fourni
- Les KPIs doivent être mesurables et spécifiques au secteur
- Les action_steps doivent être opérationnels (verbe d'action + objet précis)
- Les quick_wins doivent être réalisables sans ressources supplémentaires majeures
- Si une seule stratégie est sélectionnée, approfondir massivement son analyse
- Si plusieurs stratégies, identifier les synergies et l'ordre d'activation optimal
- La diversification seule sans ressources suffisantes doit déclencher un avertissement dans les watchouts
- Adapter le timeframe au timeHorizon fourni par l'utilisateur`

    const response = await client.messages.create({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
    })

    const rawText = response.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('')

    let result
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('Pas de JSON dans la réponse')
      result = JSON.parse(jsonMatch[0])
    } catch {
      result = {
        executive_summary: rawText.slice(0, 600),
        global_score: { growth_potential: 3, risk_level: 2.5, feasibility: 3, recommendation: 'Analyse en cours.' },
        strategies: selectedStrategies.map((k, i) => ({
          key: k,
          priority: i + 1,
          headline: STRATEGIES[k]?.label,
          analysis: STRATEGIES[k]?.description,
          growth_potential: 3,
          risk_score: STRATEGIES[k]?.riskScore || 2,
          timeframe: '6-18 mois',
          kpis: ['Croissance du chiffre d\'affaires', 'Part de marché', 'Taux de rétention'],
          action_steps: [{ phase: 'Phase 1 — Lancement', duration: 'Mois 1-3', actions: ['Définir le plan', 'Allouer les ressources'] }],
          resources_needed: ['Équipe dédiée', 'Budget marketing'],
          risks: ['Sous-estimation des ressources nécessaires'],
          quick_wins: ['Audit rapide des opportunités existantes'],
        })),
        synergies: [],
        prioritization: { immediate: 'Commencer par la stratégie la moins risquée.', sequence: 'Progression logique du risque.' },
        watchouts: ['Ne pas disperser les ressources sur trop de stratégies simultanément.'],
        conclusion: 'Une exécution disciplinée est la clé du succès.',
      }
    }

    return Response.json({ success: true, result })

  } catch (err) {
    console.error('Ansoff API error:', err)
    return Response.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}