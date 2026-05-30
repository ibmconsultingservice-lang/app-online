import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const COMPETITOR_PALETTE = ['#f472b6','#fb923c','#facc15','#a78bfa','#2dd4bf','#f87171','#818cf8','#86efac']
const VALID_ERAC = ['exclure','reduire','renforcer','creer',null]

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

export async function POST(request) {
  try {
    const body = await request.json()
    const { analysisName, context, industry, companyName, projectName, projectTag } = body

    if (!context?.trim()) {
      return Response.json({ error: 'Contexte requis pour la génération automatique' }, { status: 400 })
    }

    const contextLines = [
      projectName  && `Organisation : ${projectName}`,
      projectTag   && `Secteur (projet) : ${projectTag}`,
      companyName  && `Société : ${companyName}`,
      industry     && `Secteur déclaré : ${industry}`,
    ].filter(Boolean).join('\n')

    const prompt = `Tu es un expert mondial de la Stratégie Océan Bleu (W. Chan Kim & Renée Mauborgne).

${contextLines ? `## CONTEXTE ORGANISATION\n${contextLines}\n` : ''}

## ANALYSE À GÉNÉRER : ${analysisName}
## DESCRIPTION COMPLÈTE DU PROJET / MARCHÉ :
${context}

---

À partir de cette description, génère automatiquement un Canevas Stratégique Océan Bleu complet.

Réponds UNIQUEMENT en JSON valide avec cette structure exacte :

{
  "companyName": "Nom de la société si identifiable sinon reprendre celui fourni",
  "industry": "Secteur d'activité précis",
  "targetCustomer": "Description du client cible identifié",
  "strategicIntent": "Intention stratégique déduite du contexte",

  "competitors": [
    { "name": "Nom du concurrent principal #1 dans ce marché" },
    { "name": "Concurrent #2" },
    { "name": "Concurrent #3 (si pertinent)" }
  ],

  "canvasFactors": [
    {
      "name": "Facteur de concurrence #1 (spécifique au secteur)",
      "myScore": 6,
      "competitorScores": {
        "Concurrent #1": 7,
        "Concurrent #2": 8
      },
      "eracAction": "exclure|reduire|renforcer|creer|null"
    }
  ],

  "newFactors": [
    {
      "name": "Facteur entièrement nouveau à créer",
      "description": "Valeur apportée et pourquoi jamais offert dans ce secteur"
    }
  ],

  "result": {
    "ocean_diagnostic": {
      "current_state": "3-4 phrases sur l'état actuel de la concurrence dans ce secteur — dans quelle mesure est-ce un océan rouge ?",
      "ocean_score": 2.5,
      "differentiation_score": 2.8,
      "label": "Océan Rouge | Zone de Transition | Couleurs Océan Bleu | Océan Bleu Émergent | Océan Bleu"
    },

    "canvas_analysis": {
      "convergence_factors": ["Facteur où tout le monde se bat inutilement"],
      "divergence_opportunities": ["Facteur où une rupture créerait de la valeur unique"],
      "headline": "Nouvelle proposition de valeur en une phrase mémorable"
    },

    "erac_recommendations": {
      "exclure": [
        { "factor": "Facteur à exclure", "rationale": "Pourquoi — coût sans valeur perçue", "impact": "Fort|Modéré|Faible", "saving_estimate": "Description de l'économie" }
      ],
      "reduire": [
        { "factor": "Facteur à réduire", "rationale": "Pourquoi et dans quelle mesure", "target_level": "Niveau cible", "impact": "Fort|Modéré|Faible" }
      ],
      "renforcer": [
        { "factor": "Facteur à renforcer", "rationale": "Pourquoi élever ce facteur change la donne", "target_level": "Niveau cible ambitieux", "impact": "Fort|Modéré|Faible" }
      ],
      "creer": [
        { "factor": "Facteur nouveau à créer", "rationale": "Pourquoi ouvre un espace non contesté", "value_proposition": "Valeur concrète au client", "difficulty": "Faible|Modéré|Élevé", "impact": "Fort|Modéré|Faible" }
      ]
    },

    "new_value_curve": {
      "description": "Description de la nouvelle courbe de valeur après ERAC",
      "key_differences": ["Différence majeure #1", "Différence majeure #2", "Différence majeure #3"],
      "tagline": "Slogan stratégique mémorable"
    },

    "non_customers": {
      "tier1": { "label": "Non-clients 1er niveau", "description": "Qui sont-ils", "unlock_lever": "Comment les reconquérir" },
      "tier2": { "label": "Non-clients 2ème niveau", "description": "Qui sont-ils", "unlock_lever": "Ce qui les attirerait" },
      "tier3": { "label": "Non-clients 3ème niveau", "description": "Marché inexploré", "unlock_lever": "Opportunité cachée" }
    },

    "four_hurdles": {
      "cognitive":  { "hurdle": "Résistance identifiée", "solution": "Comment la surmonter" },
      "resource":   { "hurdle": "Contrainte ressources", "solution": "Réallocation suggérée" },
      "motivation": { "hurdle": "Manque de motivation", "solution": "Comment mobiliser" },
      "political":  { "hurdle": "Opposition politique/sectorielle", "solution": "Stratégie contournement" }
    },

    "action_plan": [
      { "phase": "Phase 1 — Libérer (0-3 mois)", "actions": ["Action #1","Action #2","Action #3"], "milestone": "Résultat mesurable" },
      { "phase": "Phase 2 — Construire (3-12 mois)", "actions": ["Action #1","Action #2","Action #3"], "milestone": "Résultat mesurable" },
      { "phase": "Phase 3 — Dominer (12-36 mois)", "actions": ["Action #1","Action #2"], "milestone": "Résultat mesurable" }
    ],

    "blue_ocean_metrics": [
      { "metric": "KPI #1", "target": "Cible mesurable" },
      { "metric": "KPI #2", "target": "Cible" },
      { "metric": "KPI #3", "target": "Cible" }
    ],

    "conclusion": "3-4 phrases percutantes sur l'océan bleu à conquérir et pourquoi maintenant."
  }
}

RÈGLES IMPÉRATIVES :
1. canvasFactors : entre 7 et 12 facteurs, TOUS spécifiques au secteur décrit (pas de facteurs génériques)
2. myScore et competitorScores : entre 0 et 10 — différenciés réalistement selon le contexte
3. eracAction : UNIQUEMENT "exclure", "reduire", "renforcer", "creer" ou null
4. ocean_score et differentiation_score : entre 1.0 et 5.0
5. competitors : 2-3 concurrents réels ou typiques du secteur décrit
6. newFactors : 2-4 facteurs entièrement nouveaux pour ce secteur
7. Les scores doivent créer une divergence visible sur le canevas
8. Tout doit être ultra-spécifique au contexte fourni — zéro généralité`

    const response = await client.messages.create({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    })

    const rawText = response.content.filter(b => b.type === 'text').map(b => b.text).join('')

    let parsed
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('Pas de JSON')
      parsed = JSON.parse(jsonMatch[0])
    } catch {
      return Response.json({ error: 'Impossible de parser la réponse IA — relancez', success: false }, { status: 500 })
    }

    // ── Sanitize competitors ──
    const competitorNames = (parsed.competitors || []).slice(0, 5).map(c => typeof c === 'string' ? c : c.name || 'Concurrent')
    const competitors = competitorNames.map((name, i) => ({
      id: uid(), name, color: COMPETITOR_PALETTE[i % COMPETITOR_PALETTE.length],
    }))

    // ── Sanitize canvasFactors ──
    const canvasFactors = (parsed.canvasFactors || []).slice(0, 14).map(f => {
      const compScores = {}
      for (const cName of competitorNames) {
        const raw = f.competitorScores?.[cName]
        compScores[cName] = typeof raw === 'number' ? Math.min(10, Math.max(0, raw)) : 3
      }
      return {
        id:               uid(),
        name:             String(f.name || 'Facteur').slice(0, 60),
        myScore:          typeof f.myScore === 'number' ? Math.min(10, Math.max(0, f.myScore)) : 5,
        competitorScores: compScores,
        eracAction:       VALID_ERAC.includes(f.eracAction) ? f.eracAction : null,
      }
    })

    // ── Sanitize newFactors ──
    const newFactors = (parsed.newFactors || []).slice(0, 6).map(f => ({
      id: uid(), name: String(f.name || '').slice(0, 60), description: String(f.description || '').slice(0, 300),
    }))

    return Response.json({
      success:      true,
      companyName:  parsed.companyName  || companyName || '',
      industry:     parsed.industry     || industry    || '',
      targetCustomer: parsed.targetCustomer || '',
      strategicIntent: parsed.strategicIntent || '',
      competitors,
      canvasFactors,
      newFactors,
      result: parsed.result || null,
    })

  } catch (err) {
    console.error('SOB auto-generate error:', err)
    return Response.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}