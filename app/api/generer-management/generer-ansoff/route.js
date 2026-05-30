import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

// ── Robust JSON extractor ─────────────────────────────────────────────────────
function extractJSON(text) {
  if (!text) return null
  const stripped = text.replace(/^```(?:json)?\s*/im, '').replace(/\s*```\s*$/im, '').trim()
  try { return JSON.parse(stripped) } catch {}
  const s = stripped.indexOf('{'), e = stripped.lastIndexOf('}')
  if (s !== -1 && e > s) { try { return JSON.parse(stripped.slice(s, e + 1)) } catch {} }
  const m = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/i)
  if (m) { try { return JSON.parse(m[1]) } catch {} }
  return null
}

// ── Strategies metadata ───────────────────────────────────────────────────────
const STRATEGIES_META = {
  penetration: {
    label:       'Pénétration de marché',
    market:      'Existant',
    product:     'Existant',
    risk:        'Faible',
    riskScore:   1,
    description: 'Augmenter les parts de marché avec les produits existants sur les marchés actuels.',
  },
  development: {
    label:       'Développement de marché',
    market:      'Nouveau',
    product:     'Existant',
    risk:        'Modéré',
    riskScore:   2,
    description: 'Introduire les produits existants sur de nouveaux marchés géographiques ou segments.',
  },
  extension: {
    label:       'Extension produit',
    market:      'Existant',
    product:     'Nouveau',
    risk:        'Modéré',
    riskScore:   2,
    description: 'Développer de nouveaux produits pour les marchés existants.',
  },
  diversification: {
    label:       'Diversification',
    market:      'Nouveau',
    product:     'Nouveau',
    risk:        'Élevé',
    riskScore:   4,
    description: 'Lancer de nouveaux produits sur de nouveaux marchés — quadrant le plus risqué.',
  },
}

const TIME_HORIZON_LABELS = { '6m': '6 mois', '1y': '1 an', '2y': '2 ans', '5y': '5 ans' }

// ── POST ──────────────────────────────────────────────────────────────────────
export async function POST(request) {
  try {
    const body = await request.json()
    const { mode = 'analyze' } = body
    return mode === 'generate' ? handleGenerate(body) : handleAnalyze(body)
  } catch (err) {
    console.error('[Ansoff] error:', err)
    return Response.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// MODE 1 — GENERATE
// Auto-populate all fields from free-text context
// Returns: { data: { companyDescription, currentProducts, currentMarkets,
//            objectives, resources, timeHorizon, selectedStrategies,
//            strategyDetails, contextSummary } }
// ══════════════════════════════════════════════════════════════════════════════
async function handleGenerate(body) {
  const { contextDescription, projectName, projectTag } = body

  if (!contextDescription?.trim()) {
    return Response.json({ error: 'Décrivez votre projet pour la génération automatique.' }, { status: 400 })
  }

  const ctx = [
    projectName && `Projet : ${projectName}`,
    projectTag  && `Secteur : ${projectTag}`,
    `Contexte : ${contextDescription}`,
  ].filter(Boolean).join('\n')

  const prompt = `Tu es un expert en stratégie d'entreprise spécialisé dans la matrice Ansoff (Igor Ansoff).

## CONTEXTE
${ctx}

À partir de ce contexte, analyse l'entreprise et détermine les meilleures stratégies Ansoff.
Réponds UNIQUEMENT avec du JSON valide, sans backticks markdown, sans texte avant ou après.

{
  "companyDescription": "Description synthétique de l'entreprise extraite du contexte (2-3 phrases).",
  "currentProducts": "Produits ou services actuels identifiés dans le contexte.",
  "currentMarkets": "Marchés actuels identifiés : géographies, segments, clients cibles.",
  "objectives": "Objectifs de croissance identifiés ou déduits du contexte.",
  "resources": "Ressources disponibles identifiées : budget, équipe, technologie, partenariats.",
  "timeHorizon": "6m | 1y | 2y | 5y",
  "contextSummary": "Résumé analytique en 2-3 phrases expliquant pourquoi ces stratégies ont été sélectionnées pour ce contexte précis.",
  "selectedStrategies": ["penetration", "development"],
  "strategyDetails": {
    "penetration": {
      "rationale": "Justification précise pourquoi cette stratégie est recommandée pour CE projet.",
      "opportunities": "Opportunités concrètes identifiées dans le contexte.",
      "constraints": "Contraintes ou freins spécifiques dans ce contexte.",
      "tactics": ["Tactique pertinente #1", "Tactique #2"]
    }
  }
}

Règles strictes :
- selectedStrategies : 1 à 3 stratégies maximum, les plus pertinentes pour ce contexte
  - "penetration"    : marché existant x produit existant (risque faible)
  - "development"    : marché nouveau x produit existant (risque modéré)
  - "extension"      : marché existant x produit nouveau (risque modéré)
  - "diversification": marché nouveau x produit nouveau (risque élevé - seulement si clairement justifié)
- timeHorizon : déduis-le des ambitions mentionnées (court terme = 6m ou 1y, long terme = 2y ou 5y)
- strategyDetails : inclure UNIQUEMENT les stratégies présentes dans selectedStrategies
- Les tactiques doivent être choisies parmi : Prix compétitifs, Fidélisation clients, Acquisition agressive, Upsell / cross-sell, Promotions ciblées, Programme de référencement, Expansion géographique, Nouveaux segments, Canaux de distribution, Partenariats locaux, Adaptation marketing, Export / internationalisation, R&D produit, Nouvelles features, Gammes complémentaires, Innovation incrémentale, Co-création clients, Acquisitions technologiques, Diversification liée, Diversification conglomérale, Acquisitions, Joint ventures, Innovation disruptive, Pivot stratégique
- Chaque champ doit être spécifique au contexte fourni — zéro générique
- contextSummary doit mentionner explicitement les stratégies choisies et leurs justifications`

  const response = await client.messages.create({
    model:      'claude-sonnet-4-20250514',
    max_tokens: 2500,
    messages:   [{ role: 'user', content: prompt }],
  })

  const rawText = response.content.filter(b => b.type === 'text').map(b => b.text).join('')
  console.log('[Ansoff generate] raw length:', rawText.length)

  const parsed = extractJSON(rawText)

  if (!parsed || !Array.isArray(parsed.selectedStrategies)) {
    console.error('[Ansoff generate] parse failed:', rawText.slice(0, 400))
    return Response.json({
      error: 'La génération IA a retourné un format inattendu — réessayez avec un contexte plus détaillé.',
    }, { status: 422 })
  }

  // Validate strategy keys
  const validKeys = Object.keys(STRATEGIES_META)
  parsed.selectedStrategies = parsed.selectedStrategies.filter(k => validKeys.includes(k))

  if (parsed.selectedStrategies.length === 0) {
    return Response.json({
      error: 'Aucune stratégie Ansoff valide identifiée — précisez vos ambitions de croissance.',
    }, { status: 422 })
  }

  // Ensure strategyDetails covers only selected strategies, with correct shape
  if (!parsed.strategyDetails) parsed.strategyDetails = {}
  for (const key of parsed.selectedStrategies) {
    if (!parsed.strategyDetails[key]) {
      parsed.strategyDetails[key] = { rationale: '', opportunities: '', constraints: '', tactics: [] }
    } else {
      if (!Array.isArray(parsed.strategyDetails[key].tactics)) parsed.strategyDetails[key].tactics = []
    }
  }

  // Normalize timeHorizon
  const validHorizons = ['6m', '1y', '2y', '5y']
  if (!validHorizons.includes(parsed.timeHorizon)) parsed.timeHorizon = '1y'

  return Response.json({ success: true, mode: 'generate', data: parsed })
}

// ══════════════════════════════════════════════════════════════════════════════
// MODE 2 — ANALYZE
// Deep strategic analysis of selected Ansoff strategies
// Returns: { result: { executive_summary, global_score, strategies[],
//            synergies[], prioritization, watchouts[], conclusion } }
// ══════════════════════════════════════════════════════════════════════════════
async function handleAnalyze(body) {
  const {
    projectName, projectTag,
    companyDescription, currentProducts, currentMarkets,
    objectives, resources, timeHorizon,
    selectedStrategies, strategyDetails,
  } = body

  if (!selectedStrategies || selectedStrategies.length === 0) {
    return Response.json({ error: 'Sélectionnez au moins une stratégie Ansoff.' }, { status: 400 })
  }

  const ctxLines = [
    projectName        && `Projet : ${projectName}`,
    projectTag         && `Secteur : ${projectTag}`,
    companyDescription && `Entreprise : ${companyDescription}`,
    currentProducts    && `Produits actuels : ${currentProducts}`,
    currentMarkets     && `Marchés actuels : ${currentMarkets}`,
    objectives         && `Objectifs : ${objectives}`,
    resources          && `Ressources : ${resources}`,
    timeHorizon        && `Horizon : ${TIME_HORIZON_LABELS[timeHorizon] || timeHorizon}`,
  ].filter(Boolean).join('\n')

  const strategiesDetail = selectedStrategies.map(k => {
    const meta    = STRATEGIES_META[k]
    const details = strategyDetails?.[k] || {}
    return `
### ${meta?.label || k} (Marché ${meta?.market} x Produit ${meta?.product}) — Risque ${meta?.risk}
${meta?.description}
${details.rationale     ? `Justification : ${details.rationale}` : ''}
${details.opportunities ? `Opportunités identifiées : ${details.opportunities}` : ''}
${details.constraints   ? `Contraintes : ${details.constraints}` : ''}
${details.tactics?.length ? `Tactiques sélectionnées : ${details.tactics.join(', ')}` : ''}
`.trim()
  }).join('\n\n')

  const prompt = `Tu es un consultant en stratégie d'entreprise expert de la matrice Ansoff.

${ctxLines ? `## CONTEXTE\n${ctxLines}\n` : ''}

## STRATEGIES SELECTIONNEES
${strategiesDetail}

Génère une analyse stratégique Ansoff complète, personnalisée et immédiatement actionnable.
Réponds UNIQUEMENT avec du JSON valide, sans backticks, sans texte avant ou après.

{
  "executive_summary": "Synthèse de 3-5 phrases sur la cohérence des choix, l'équilibre risque/opportunité et la recommandation de priorisation.",

  "global_score": {
    "growth_potential": 3.8,
    "risk_level": 2.5,
    "feasibility": 3.2,
    "recommendation": "Court texte sur la combinaison stratégique recommandée."
  },

  "strategies": [
    {
      "key": "penetration",
      "priority": 1,
      "headline": "Angle stratégique percutant en une phrase.",
      "analysis": "Analyse de 2-3 phrases spécifiques au contexte.",
      "growth_potential": 3.5,
      "risk_score": 2.0,
      "timeframe": "0-6 mois | 6-18 mois | 18-36 mois | 3-5 ans",
      "kpis": ["KPI mesurable #1", "KPI #2", "KPI #3"],
      "action_steps": [
        {
          "phase": "Phase 1 — Nom court",
          "duration": "Semaines 1-4",
          "actions": ["Action concrète #1", "Action #2", "Action #3"]
        },
        {
          "phase": "Phase 2 — Nom court",
          "duration": "Mois 2-6",
          "actions": ["Action concrète #1", "Action #2"]
        }
      ],
      "resources_needed": ["Ressource #1", "Ressource #2"],
      "risks": ["Risque #1 avec mitigation", "Risque #2"],
      "quick_wins": ["Quick win <30 jours #1", "Quick win #2"]
    }
  ],

  "synergies": [
    "Synergie concrète entre deux stratégies si plusieurs sélectionnées."
  ],

  "prioritization": {
    "immediate": "Stratégie à activer en premier et pourquoi (1-2 phrases).",
    "sequence": "Ordre recommandé d'activation avec justification."
  },

  "watchouts": [
    "Piège ou erreur classique à éviter #1 dans ce contexte.",
    "Piège #2"
  ],

  "conclusion": "Phrase de conclusion stratégique percutante."
}

Règles :
- growth_potential, risk_score, feasibility entre 1.0 et 5.0
- Analyses spécifiques au contexte fourni — zéro générique
- KPIs mesurables et adaptés au secteur
- action_steps opérationnels (verbe + objet précis)
- quick_wins sans ressources supplémentaires majeures
- priority : 1 = plus prioritaire
- timeframe adapté à l'horizon ${TIME_HORIZON_LABELS[timeHorizon] || '1 an'}
- Si une seule stratégie : au moins 2 phases d'action, analyse approfondie
- Si plusieurs : identifier synergies et séquence d'activation optimale`

  const response = await client.messages.create({
    model:      'claude-sonnet-4-20250514',
    max_tokens: 3500,
    messages:   [{ role: 'user', content: prompt }],
  })

  const rawText = response.content.filter(b => b.type === 'text').map(b => b.text).join('')
  console.log('[Ansoff analyze] raw length:', rawText.length)

  const parsed = extractJSON(rawText)

  if (!parsed) {
    console.error('[Ansoff analyze] parse failed:', rawText.slice(0, 400))
    // Graceful fallback
    const fallback = {
      executive_summary: rawText.slice(0, 500) || 'Analyse en cours de traitement.',
      global_score: { growth_potential: 3, risk_level: 2.5, feasibility: 3, recommendation: 'Analyse en cours.' },
      strategies: selectedStrategies.map((k, i) => ({
        key:              k,
        priority:         i + 1,
        headline:         STRATEGIES_META[k]?.label || k,
        analysis:         STRATEGIES_META[k]?.description || '',
        growth_potential: 3,
        risk_score:       STRATEGIES_META[k]?.riskScore || 2,
        timeframe:        '6-18 mois',
        kpis:             ["Croissance du chiffre d'affaires", 'Part de marché', 'Taux de rétention'],
        action_steps:     [{ phase: 'Phase 1 — Lancement', duration: 'Mois 1-3', actions: ["Définir le plan d'action", 'Allouer les ressources'] }],
        resources_needed: ['Équipe dédiée', 'Budget alloué'],
        risks:            ['Sous-estimation des ressources nécessaires'],
        quick_wins:       ['Identifier les opportunités immédiates à faible coût'],
      })),
      synergies:      [],
      prioritization: { immediate: 'Commencer par la stratégie à moindre risque.', sequence: 'Progression logique du risque minimal vers le risque élevé.' },
      watchouts:      ['Ne pas disperser les ressources sur plusieurs stratégies simultanément.'],
      conclusion:     'Une exécution disciplinée et séquencée est la clé du succès.',
    }
    return Response.json({ success: true, mode: 'analyze', result: fallback })
  }

  // Normalize
  if (!Array.isArray(parsed.strategies))  parsed.strategies  = []
  if (!Array.isArray(parsed.synergies))   parsed.synergies   = []
  if (!Array.isArray(parsed.watchouts))   parsed.watchouts   = []
  if (!parsed.global_score)              parsed.global_score = {}
  if (!parsed.prioritization)            parsed.prioritization = {}

  parsed.strategies = parsed.strategies.map(s => ({
    ...s,
    kpis:             Array.isArray(s.kpis)             ? s.kpis             : [],
    action_steps:     Array.isArray(s.action_steps)     ? s.action_steps.map(p => ({ ...p, actions: Array.isArray(p.actions) ? p.actions : [] })) : [],
    resources_needed: Array.isArray(s.resources_needed) ? s.resources_needed : [],
    risks:            Array.isArray(s.risks)             ? s.risks            : [],
    quick_wins:       Array.isArray(s.quick_wins)        ? s.quick_wins       : [],
  }))

  return Response.json({ success: true, mode: 'analyze', result: parsed })
}