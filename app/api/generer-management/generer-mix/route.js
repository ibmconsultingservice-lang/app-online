import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

function parseJSON(text) {
  try { return JSON.parse(text.trim()) } catch {}
  const stripped = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()
  try { return JSON.parse(stripped) } catch {}
  const match = text.match(/\{[\s\S]*\}/)
  if (match) try { return JSON.parse(match[0]) } catch {}
  return null
}

const P_META = {
  product:   { label: 'Produit',          desc: 'Offre, caractéristiques, qualité, marque, gamme' },
  price:     { label: 'Prix',             desc: 'Stratégie tarifaire, positionnement, valeur perçue' },
  place:     { label: 'Distribution',     desc: 'Canaux de vente, couverture, logistique' },
  promotion: { label: 'Promotion',        desc: 'Communication, pub, marketing digital, presse' },
  people:    { label: 'Personnel',        desc: 'Équipe, compétences, culture, service client' },
  process:   { label: 'Processus',        desc: 'Procédures, automatisation, parcours client' },
  physical:  { label: 'Preuve physique',  desc: 'Environnement, témoignages, certifications' },
}

export async function POST(request) {
  try {
    const body         = await request.json()
    const analysisName = body.analysisName || ''
    const projectDesc  = body.projectDesc  || ''
    const myCompany    = body.myCompany    || ''
    const sector       = body.sector       || ''
    const region       = body.region       || ''
    const activityType = body.activityType || ''
    const targetMarket = body.targetMarket || ''
    const objectives   = body.objectives   || ''
    const items        = body.items        || []
    const projectName  = body.projectName  || ''
    const projectTag   = body.projectTag   || ''

    if (!items.length) {
      return Response.json({ error: 'Aucun élément à analyser' }, { status: 400 })
    }

    const contextLines = [
      projectName  ? `Projet : ${projectName}`                    : null,
      projectTag   ? `Tag : ${projectTag}`                        : null,
      myCompany    ? `Notre entreprise : ${myCompany}`            : null,
      sector       ? `Secteur : ${sector}`                        : null,
      activityType ? `Type d'activité : ${activityType}`          : null,
      region       ? `Région / Marché : ${region}`                : null,
      targetMarket ? `Marché cible : ${targetMarket}`             : null,
      objectives   ? `Objectifs : ${objectives}`                  : null,
      projectDesc  ? `Description : ${projectDesc}`               : null,
    ].filter(Boolean).join('\n')

    // Group items by P
    const byP = {}
    for (const key of Object.keys(P_META)) {
      const pItems = items.filter(i => i.p_key === key)
      if (pItems.length > 0) {
        byP[key] = pItems.map(i =>
          `  - [Score:${i.score}/5][${i.status}] ${i.title}${i.description ? ` : ${i.description}` : ''}${i.notes ? ` (Note: ${i.notes})` : ''}`
        ).join('\n')
      }
    }

    const itemsSummary = Object.entries(byP)
      .map(([key, content]) => `### ${P_META[key].label}\n${content}`)
      .join('\n\n')

    const systemPrompt = `Tu es un expert en marketing stratégique et en analyse du mix marketing 7P.
Tu analyses avec précision et fournis des recommandations concrètes, actionnables et adaptées au secteur.
Tu réponds UNIQUEMENT en JSON valide, sans balises markdown, sans texte avant ou après.`

    const userPrompt = `Analyse ce Mix Marketing 7P et génère un rapport stratégique complet.

## ANALYSE : ${analysisName}
${contextLines ? `\n## CONTEXTE\n${contextLines}\n` : ''}

## ÉLÉMENTS 7P ACTUELS (${items.length} éléments)
${itemsSummary}

---

Retourne UNIQUEMENT ce JSON :
{
  "executive_summary": "Résumé exécutif en 3-5 phrases : forces majeures, faiblesses critiques, cohérence globale du mix.",

  "global_score": 3.2,

  "p_scores": {
    "product": 3.5,
    "price": 2.8,
    "place": 3.0,
    "promotion": 2.5,
    "people": 4.0,
    "process": 3.2,
    "physical": 2.0
  },

  "recommendations": [
    {
      "p_key": "product",
      "priority": 1,
      "title": "Titre court de la recommandation",
      "analysis": "Analyse en 2-3 phrases : état observé, gap identifié, impact potentiel",
      "action": "Action concrète et mesurable à mener"
    }
  ],

  "opportunities": [
    "Opportunité 1 identifiée dans le mix actuel",
    "Opportunité 2"
  ],

  "risks": [
    "Risque ou point faible critique 1",
    "Risque 2"
  ],

  "action_plan": [
    {
      "priority": 1,
      "p_key": "promotion",
      "action": "Action concrète et mesurable",
      "rationale": "Justification basée sur l'analyse",
      "timeline": "Ce mois | Ce trimestre | Cette année",
      "impact": "Impact attendu en une phrase"
    }
  ],

  "synthesis": "Synthèse stratégique en 3-4 phrases : positionnement global du mix, leviers de différenciation, orientation stratégique recommandée."
}

RÈGLES :
- global_score et p_scores entre 1.0 et 5.0 (basé sur les scores des éléments et leur cohérence)
- recommendations : 1 par P minimum, 2 pour les P les plus faibles, maximum 12 au total
- Chaque recommandation doit être spécifique aux éléments fournis, pas générique
- opportunities : 3 à 6 opportunités concrètes liées au mix existant
- risks : 3 à 6 risques ou faiblesses à adresser en priorité
- action_plan : 4 à 7 actions classées par priorité réelle d'impact
- Adapte l'analyse au secteur, à la taille de l'entreprise et aux objectifs fournis
- Évalue la cohérence entre les 7P (alignement stratégique global)`

    const response = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 4000,
      system:     systemPrompt,
      messages:   [{ role: 'user', content: userPrompt }],
    })

    const rawText = response.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('')

    const result = parseJSON(rawText)

    if (!result) {
      console.error('generer-7p-analyse: parse fail. Raw:', rawText.slice(0, 500))
      return Response.json({ error: 'Réponse IA invalide — impossible de parser le JSON' }, { status: 500 })
    }

    // Normalize scores
    result.global_score = Math.min(5, Math.max(1, parseFloat(result.global_score) || 3))

    if (result.p_scores && typeof result.p_scores === 'object') {
      for (const key of Object.keys(P_META)) {
        if (result.p_scores[key] !== undefined) {
          result.p_scores[key] = Math.min(5, Math.max(1, parseFloat(result.p_scores[key]) || 3))
        }
      }
    } else {
      result.p_scores = {}
    }

    // Normalize arrays
    if (!Array.isArray(result.recommendations))  result.recommendations = []
    if (!Array.isArray(result.opportunities))    result.opportunities   = []
    if (!Array.isArray(result.risks))            result.risks           = []
    if (!Array.isArray(result.action_plan))      result.action_plan     = []
    if (!result.executive_summary)               result.executive_summary = ''
    if (!result.synthesis)                       result.synthesis         = ''

    // Normalize recommendations
    result.recommendations = result.recommendations.map((r, i) => ({
      p_key:    r.p_key    || 'product',
      priority: r.priority || i + 1,
      title:    r.title    || '',
      analysis: r.analysis || '',
      action:   r.action   || '',
    }))

    // Normalize action_plan
    result.action_plan = result.action_plan.map((a, i) => ({
      priority:  a.priority  || i + 1,
      p_key:     a.p_key     || '',
      action:    a.action    || '',
      rationale: a.rationale || '',
      timeline:  a.timeline  || '',
      impact:    a.impact    || '',
    }))

    return Response.json({ success: true, result })

  } catch (err) {
    console.error('generer-7p-analyse error:', err)
    return Response.json({ error: err.message || 'Erreur serveur interne' }, { status: 500 })
  }
}