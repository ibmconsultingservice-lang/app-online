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
  marketShare:    { label: 'Part de marché',           weight: 0.20 },
  brandStrength:  { label: 'Force de la marque',       weight: 0.15 },
  productQuality: { label: 'Qualité produit/service',  weight: 0.15 },
  profitMargins:  { label: 'Marges bénéficiaires',     weight: 0.15 },
  techCapability: { label: 'Capacité technologique',   weight: 0.15 },
  manufacturing:  { label: 'Capacité opérationnelle',  weight: 0.10 },
  innovation:     { label: 'Innovation',               weight: 0.10 },
}

// ── Zone classification ───────────────────────────────────────────────────────
const getZone = (a, s) => {
  if (a >= 3.67 && s >= 3.67) return { zone: 'invest',    label: 'Investir / Croître',      color: '#34d399', recommendation: 'Investir massivement pour croître' }
  if (a >= 3.67 && s >= 2.33) return { zone: 'invest',    label: 'Investir / Croître',      color: '#34d399', recommendation: 'Investir sélectivement pour croître' }
  if (a >= 2.33 && s >= 3.67) return { zone: 'invest',    label: 'Investir / Croître',      color: '#34d399', recommendation: 'Investir pour maintenir la position' }
  if (a >= 3.67 && s <  2.33) return { zone: 'selective', label: 'Sélectivité',             color: '#facc15', recommendation: 'Investissement sélectif et ciblé' }
  if (a >= 2.33 && s >= 2.33) return { zone: 'selective', label: 'Sélectivité',             color: '#facc15', recommendation: 'Gérer pour les bénéfices' }
  if (a <  2.33 && s >= 3.67) return { zone: 'selective', label: 'Sélectivité',             color: '#facc15', recommendation: 'Protéger la position, rentabiliser' }
  if (a >= 2.33 && s <  2.33) return { zone: 'harvest',   label: 'Récolter / Désinvestir',  color: '#f87171', recommendation: 'Récolter ou désinvestir progressivement' }
  if (a <  2.33 && s >= 2.33) return { zone: 'harvest',   label: 'Récolter / Désinvestir',  color: '#f87171', recommendation: 'Récolter prudemment' }
  return                              { zone: 'harvest',   label: 'Récolter / Désinvestir',  color: '#f87171', recommendation: 'Désinvestir rapidement' }
}

const computeWeightedScore = (scores, criteria) => {
  let total = 0, tw = 0
  for (const [k, m] of Object.entries(criteria)) { total += (scores?.[k] ?? 3) * m.weight; tw += m.weight }
  return tw > 0 ? total / tw : 3
}

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

// ════════════════════════════════════════════════════════════════════════════════
// POST — routes on action
// ════════════════════════════════════════════════════════════════════════════════
export async function POST(request) {
  try {
    const body = await request.json()
    const { action } = body

    if (action === 'generate') return handleGenerate(body)
    return handleAnalyse(body)

  } catch (err) {
    console.error('GE Matrix API error:', err)
    return Response.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// ROUTE 1 — Generate DAS + scores from free-text description
// ════════════════════════════════════════════════════════════════════════════════
async function handleGenerate({ description, analysisName, companyName, projectName, projectTag }) {
  if (!description?.trim()) {
    return Response.json({ error: 'Description requise' }, { status: 400 })
  }

  const prompt = `Tu es un consultant McKinsey senior spécialisé en stratégie de portefeuille et matrice McKinsey/GE.

L'utilisateur décrit son portefeuille d'activités en langage naturel. Tu dois identifier les Domaines d'Activité Stratégiques (DAS) et attribuer des scores réalistes pour construire une matrice McKinsey/GE.

## ENTRÉE UTILISATEUR
${projectName  ? `Organisation : ${projectName}` : ''}
${companyName  ? `Société : ${companyName}` : ''}
${projectTag   ? `Secteur : ${projectTag}` : ''}
${analysisName ? `Analyse : ${analysisName}` : ''}
Description : ${description}

## CRITÈRES DE NOTATION (1 = très faible, 5 = très fort)

Attractivité marché :
- marketSize (Taille du marché, poids 20%)
- growthRate (Taux de croissance, poids 20%)
- profitability (Rentabilité sectorielle, poids 15%)
- competitionLevel (Intensité concurrentielle — score INVERSÉ : 5=peu de concurrence, poids 15%)
- techRequirements (Exigences technologiques, poids 10%)
- environmental (Facteurs environnementaux/ESG favorables, poids 10%)
- cyclicality (Cyclicité — score INVERSÉ : 5=très stable, poids 10%)

Force compétitive :
- marketShare (Part de marché relative, poids 20%)
- brandStrength (Force de la marque, poids 15%)
- productQuality (Qualité produit/service, poids 15%)
- profitMargins (Marges bénéficiaires, poids 15%)
- techCapability (Capacité technologique, poids 15%)
- manufacturing (Capacité opérationnelle, poids 10%)
- innovation (Innovation et R&D, poids 10%)

## CONSIGNES
- Identifie 3 à 6 DAS distincts et cohérents avec le contexte décrit
- Les scores doivent être réalistes et différenciés (évite les valeurs homogènes)
- Adapte les scores au secteur détecté et au contexte fourni
- Chaque DAS doit avoir une identité claire et un nom court

Réponds UNIQUEMENT en JSON valide :

{
  "companyName": "Nom déduit ou fourni",
  "context": "Résumé du contexte stratégique en 1-2 phrases",
  "sbus": [
    {
      "id": "uid unique",
      "name": "Nom court du DAS",
      "description": "Description du DAS en 1 phrase",
      "notes": "Observation clé sur ce DAS",
      "marketScores": {
        "marketSize": 3,
        "growthRate": 4,
        "profitability": 3,
        "competitionLevel": 2,
        "techRequirements": 3,
        "environmental": 3,
        "cyclicality": 3
      },
      "strengthScores": {
        "marketShare": 3,
        "brandStrength": 3,
        "productQuality": 4,
        "profitMargins": 3,
        "techCapability": 3,
        "manufacturing": 3,
        "innovation": 3
      }
    }
  ],
  "synthese": "Paragraphe de 2-3 phrases expliquant la logique du portefeuille identifié et les principaux arbitrages stratégiques anticipés."
}

RÈGLES :
1. Tous les scores sont des nombres entre 1 et 5 (peuvent avoir une décimale : 1.5, 2.5…)
2. Les IDs doivent être uniques (ex: "das_1", "das_2")
3. Génère entre 3 et 6 DAS
4. Les scores doivent être réellement différenciés entre DAS`

  const response = await client.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 2500,
    messages:   [{ role: 'user', content: prompt }],
  })

  const rawText = response.content.filter(b => b.type === 'text').map(b => b.text).join('')

  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Pas de JSON')
    const result = JSON.parse(jsonMatch[0])
    // Inject guaranteed unique IDs
    result.sbus = (result.sbus || []).map(s => ({ ...s, id: uid() }))
    return Response.json({ success: true, result })
  } catch {
    return Response.json({ error: 'Erreur de parsing IA', raw: rawText.slice(0, 400) }, { status: 500 })
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// ROUTE 2 — Full strategic analysis of existing scored DAS
// ════════════════════════════════════════════════════════════════════════════════
async function handleAnalyse({ projectName, projectTag, companyName, context, sbus }) {
  if (!sbus || sbus.length === 0) {
    return Response.json({ error: 'Aucun DAS renseigné' }, { status: 400 })
  }

  const enrichedSbus = sbus.map(sbu => {
    const attractScore  = computeWeightedScore(sbu.marketScores,   MARKET_ATTRACTIVENESS_CRITERIA)
    const strengthScore = computeWeightedScore(sbu.strengthScores, COMPETITIVE_STRENGTH_CRITERIA)
    const zone          = getZone(attractScore, strengthScore)
    return { ...sbu, attractScore, strengthScore, zone }
  })

  const contextLines = [
    projectName && `Entreprise / Projet : ${projectName}`,
    projectTag  && `Secteur : ${projectTag}`,
    companyName && `Nom de la société : ${companyName}`,
    context     && `Contexte : ${context}`,
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

## DOMAINES D'ACTIVITÉ STRATÉGIQUES ANALYSÉS

${sbusDetail}

---

Génère une analyse stratégique McKinsey/GE complète et actionnable.
Réponds UNIQUEMENT en JSON valide :

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
      "analysis": "Analyse de 2-3 phrases spécifique à ce DAS.",
      "strengths": ["Force #1", "Force #2"],
      "weaknesses": ["Faiblesse #1", "Faiblesse #2"],
      "strategic_options": ["Option #1", "Option #2", "Option #3"],
      "investment_level": "Fort | Modéré | Faible | Désinvestissement",
      "timeline": "Court terme (0-1 an) | Moyen terme (1-3 ans) | Long terme (3-5 ans)",
      "kpis": ["KPI mesurable #1", "KPI #2"],
      "risk": "Faible | Modéré | Élevé | Critique",
      "risk_factors": ["Facteur de risque #1"]
    }
  ],
  "resource_allocation": [
    { "sbu_name": "Nom", "budget_priority": 1, "rationale": "Justification" }
  ],
  "portfolio_moves": [
    { "type": "acquisition | désinvestissement | renforcement | pivot | partenariat", "title": "Titre", "description": "Desc", "impact": "Fort | Modéré | Faible", "urgency": "Immédiat | 6 mois | 1-2 ans" }
  ],
  "synergies": ["Synergie concrète entre DAS précis"],
  "risks": [
    { "risk": "Risque", "severity": "Faible | Modéré | Élevé | Critique", "mitigation": "Mitigation" }
  ],
  "roadmap": [
    { "horizon": "0-6 mois | 6-18 mois | 18-36 mois", "milestones": ["Jalon #1", "Jalon #2"] }
  ],
  "conclusion": "Recommandation finale percutante."
}

RÈGLES : portfolio_health.score entre 1.0 et 5.0 | strategic_priority = rang (1=plus prioritaire) | analyses spécifiques aux scores fournis | DAS invest=offensif, selective=arbitrage, harvest=sortie`

  const response = await client.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 3500,
    messages:   [{ role: 'user', content: prompt }],
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
        analysis: `Score attractivité ${sbu.attractScore.toFixed(1)}, force compétitive ${sbu.strengthScore.toFixed(1)}.`,
        strengths: [], weaknesses: [], strategic_options: [],
        investment_level: sbu.zone.zone === 'invest' ? 'Fort' : sbu.zone.zone === 'selective' ? 'Modéré' : 'Faible',
        timeline: 'Moyen terme (1-3 ans)', kpis: [], risk: 'Modéré', risk_factors: [],
      })),
      resource_allocation: [], portfolio_moves: [], synergies: [], risks: [],
      roadmap: [], conclusion: 'Une revue stratégique approfondie est recommandée.',
    }
  }

  return Response.json({ success: true, result, enrichedSbus })
}