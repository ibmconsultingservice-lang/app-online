import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

// ── Criteria metadata ─────────────────────────────────────────────────────────
export const MARKET_ATTRACTIVENESS_CRITERIA = {
  marketSize:       { label: 'Taille du marché',           weight: 0.20 },
  growthRate:       { label: 'Taux de croissance',         weight: 0.20 },
  profitability:    { label: 'Rentabilité sectorielle',    weight: 0.15 },
  competitionLevel: { label: 'Intensité concurrentielle',  weight: 0.15 },
  techRequirements: { label: 'Exigences technologiques',   weight: 0.10 },
  environmental:    { label: 'Facteurs environnementaux',  weight: 0.10 },
  cyclicality:      { label: 'Cyclicité du marché',        weight: 0.10 },
}

export const COMPETITIVE_STRENGTH_CRITERIA = {
  marketShare:       { label: 'Part de marché',             weight: 0.20 },
  brandStrength:     { label: 'Force de la marque',         weight: 0.15 },
  productQuality:    { label: 'Qualité produit/service',    weight: 0.15 },
  profitMargins:     { label: 'Marges bénéficiaires',       weight: 0.15 },
  techCapability:    { label: 'Capacité technologique',     weight: 0.15 },
  manufacturing:     { label: 'Capacité opérationnelle',    weight: 0.10 },
  innovation:        { label: 'Innovation',                 weight: 0.10 },
}

// ── Zone classification ───────────────────────────────────────────────────────
const getZone = (attractiveness, strength) => {
  const a = attractiveness
  const s = strength
  if (a >= 3.67 && s >= 3.67) return { zone: 'invest',    label: 'Investir / Croître',   color: '#34d399', recommendation: 'Investir massivement pour croître' }
  if (a >= 3.67 && s >= 2.33) return { zone: 'invest',    label: 'Investir / Croître',   color: '#34d399', recommendation: 'Investir sélectivement pour croître' }
  if (a >= 2.33 && s >= 3.67) return { zone: 'invest',    label: 'Investir / Croître',   color: '#34d399', recommendation: 'Investir pour maintenir la position' }
  if (a >= 3.67 && s <  2.33) return { zone: 'selective', label: 'Sélectivité',          color: '#facc15', recommendation: 'Investissement sélectif et ciblé' }
  if (a >= 2.33 && s >= 2.33) return { zone: 'selective', label: 'Sélectivité',          color: '#facc15', recommendation: 'Gérer pour les bénéfices' }
  if (a <  2.33 && s >= 3.67) return { zone: 'selective', label: 'Sélectivité',          color: '#facc15', recommendation: 'Protéger la position, rentabiliser' }
  if (a >= 2.33 && s <  2.33) return { zone: 'harvest',   label: 'Récolter / Désinvestir', color: '#f87171', recommendation: 'Récolter ou désinvestir progressivement' }
  if (a <  2.33 && s >= 2.33) return { zone: 'harvest',   label: 'Récolter / Désinvestir', color: '#f87171', recommendation: 'Récolter prudemment' }
  return                              { zone: 'harvest',   label: 'Récolter / Désinvestir', color: '#f87171', recommendation: 'Désinvestir rapidement' }
}

const computeWeightedScore = (scores, criteria) => {
  let total = 0
  let totalWeight = 0
  for (const [key, meta] of Object.entries(criteria)) {
    const score = scores?.[key] ?? 3
    total += score * meta.weight
    totalWeight += meta.weight
  }
  return totalWeight > 0 ? total / totalWeight : 3
}

export async function POST(request) {
  try {
    const body = await request.json()
    const {
      projectName,
      projectTag,
      companyName,
      context,
      sbus, // [{ id, name, description, marketScores: {}, strengthScores: {}, notes }]
    } = body

    if (!sbus || sbus.length === 0) {
      return Response.json({ error: 'Aucun DAS renseigné' }, { status: 400 })
    }

    // ── Compute scores for each SBU ──
    const enrichedSbus = sbus.map(sbu => {
      const attractScore  = computeWeightedScore(sbu.marketScores, MARKET_ATTRACTIVENESS_CRITERIA)
      const strengthScore = computeWeightedScore(sbu.strengthScores, COMPETITIVE_STRENGTH_CRITERIA)
      const zone          = getZone(attractScore, strengthScore)
      return { ...sbu, attractScore, strengthScore, zone }
    })

    const contextLines = [
      projectName  && `Entreprise / Projet : ${projectName}`,
      projectTag   && `Secteur : ${projectTag}`,
      companyName  && `Nom de la société : ${companyName}`,
      context      && `Contexte : ${context}`,
    ].filter(Boolean).join('\n')

    const sbusDetail = enrichedSbus.map((sbu, i) => `
### DAS ${i + 1} : ${sbu.name}
${sbu.description ? `Description : ${sbu.description}` : ''}
Score Attractivité Marché : ${sbu.attractScore.toFixed(2)}/5 | Score Force Compétitive : ${sbu.strengthScore.toFixed(2)}/5
Zone McKinsey : ${sbu.zone.label} (${sbu.zone.recommendation})
${sbu.notes ? `Notes : ${sbu.notes}` : ''}

Critères attractivité :
${Object.entries(MARKET_ATTRACTIVENESS_CRITERIA).map(([k, m]) => `  - ${m.label} : ${sbu.marketScores?.[k] ?? 3}/5`).join('\n')}

Critères force compétitive :
${Object.entries(COMPETITIVE_STRENGTH_CRITERIA).map(([k, m]) => `  - ${m.label} : ${sbu.strengthScores?.[k] ?? 3}/5`).join('\n')}
`.trim()).join('\n\n')

    const prompt = `Tu es un consultant McKinsey senior spécialisé en stratégie de portefeuille et matrice GE/McKinsey.

${contextLines ? `## CONTEXTE\n${contextLines}\n` : ''}

## DOMAINES D'ACTIVITÉ STRATÉGIQUES (DAS) ANALYSÉS

${sbusDetail}

---

Génère une analyse stratégique McKinsey/GE complète et actionnable.
Réponds UNIQUEMENT en JSON valide avec cette structure exacte :

{
  "portfolio_summary": "Synthèse de 3-5 phrases sur l'équilibre du portefeuille, les DAS prioritaires, les arbitrages recommandés et l'orientation stratégique globale.",

  "portfolio_health": {
    "score": 3.5,
    "label": "Équilibré | Déséquilibré | Concentré | Diversifié | Fragile | Solide",
    "invest_count": 2,
    "selective_count": 1,
    "harvest_count": 1
  },

  "sbus": [
    {
      "id": "id_du_das",
      "name": "Nom du DAS",
      "zone": "invest | selective | harvest",
      "strategic_priority": 1,
      "analysis": "Analyse de 2-3 phrases : justification de la position sur la matrice, forces et faiblesses clés, enjeux spécifiques à ce DAS.",
      "strengths": ["Force #1 différenciante", "Force #2"],
      "weaknesses": ["Faiblesse #1 critique", "Faiblesse #2"],
      "strategic_options": [
        "Option stratégique #1 concrète",
        "Option stratégique #2",
        "Option stratégique #3"
      ],
      "investment_level": "Fort | Modéré | Faible | Désinvestissement",
      "timeline": "Court terme (0-1 an) | Moyen terme (1-3 ans) | Long terme (3-5 ans)",
      "kpis": ["KPI mesurable #1", "KPI #2", "KPI #3"],
      "risk": "Faible | Modéré | Élevé | Critique",
      "risk_factors": ["Facteur de risque #1", "Facteur #2"]
    }
  ],

  "resource_allocation": [
    {
      "sbu_name": "Nom du DAS",
      "budget_priority": "1-5 (1=le plus prioritaire)",
      "rationale": "Justification courte de l'allocation"
    }
  ],

  "portfolio_moves": [
    {
      "type": "acquisition | désinvestissement | renforcement | pivot | partenariat",
      "title": "Mouvement stratégique recommandé",
      "description": "Description en 1-2 phrases",
      "impact": "Fort | Modéré | Faible",
      "urgency": "Immédiat | 6 mois | 1-2 ans"
    }
  ],

  "synergies": [
    "Synergie exploitable entre DAS — concrète et actionnable"
  ],

  "risks": [
    {
      "risk": "Risque portefeuille #1",
      "severity": "Faible | Modéré | Élevé | Critique",
      "mitigation": "Mesure de mitigation concrète"
    }
  ],

  "roadmap": [
    {
      "horizon": "0-6 mois | 6-18 mois | 18-36 mois",
      "milestones": ["Jalon stratégique #1", "Jalon #2", "Jalon #3"]
    }
  ],

  "conclusion": "Recommandation stratégique finale percutante sur l'évolution du portefeuille."
}

RÈGLES IMPÉRATIVES :
- portfolio_health.score entre 1.0 et 5.0
- strategic_priority = rang de priorité parmi tous les DAS (1 = le plus prioritaire)
- Les analyses doivent être spécifiques aux scores fournis, pas génériques
- Les DAS en zone "invest" : stratégies offensives, investissement croissance
- Les DAS en zone "selective" : rentabilisation, arbitrage clair, conditions d'investissement
- Les DAS en zone "harvest" : stratégie de sortie, réallocation des ressources
- Les synergies doivent identifier des DAS précis qui se complètent
- La roadmap doit être cohérente avec les zones et priorités identifiées
- Si un seul DAS, approfondir massivement et proposer des scénarios alternatifs`

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
        portfolio_summary: rawText.slice(0, 600),
        portfolio_health: { score: 3, label: 'Équilibré', invest_count: 0, selective_count: 0, harvest_count: 0 },
        sbus: enrichedSbus.map((sbu, i) => ({
          id: sbu.id, name: sbu.name, zone: sbu.zone.zone, strategic_priority: i + 1,
          analysis: `Le DAS "${sbu.name}" présente un score d'attractivité de ${sbu.attractScore.toFixed(1)} et une force compétitive de ${sbu.strengthScore.toFixed(1)}.`,
          strengths: [], weaknesses: [], strategic_options: [],
          investment_level: sbu.zone.zone === 'invest' ? 'Fort' : sbu.zone.zone === 'selective' ? 'Modéré' : 'Faible',
          timeline: 'Moyen terme (1-3 ans)', kpis: [], risk: 'Modéré', risk_factors: [],
        })),
        resource_allocation: [], portfolio_moves: [], synergies: [], risks: [],
        roadmap: [], conclusion: 'Une revue stratégique approfondie est recommandée.',
      }
    }

    return Response.json({ success: true, result, enrichedSbus })

  } catch (err) {
    console.error('GE Matrix API error:', err)
    return Response.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}