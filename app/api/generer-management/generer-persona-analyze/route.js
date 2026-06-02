import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

function parseJSON(text) {
  try { return JSON.parse(text.trim()) } catch {}
  const stripped = text.replace(/^```(?:json)?\s*/im, '').replace(/```\s*$/im, '').trim()
  try { return JSON.parse(stripped) } catch {}
  const match = text.match(/\{[\s\S]*\}/)
  if (match) try { return JSON.parse(match[0]) } catch {}
  return null
}

const STAGE_LABELS = {
  awareness:     'Prise de conscience',
  consideration: 'Considération',
  decision:      'Décision',
  purchase:      'Achat',
  retention:     'Fidélisation',
  advocacy:      'Recommandation',
}

export async function POST(request) {
  try {
    const body        = await request.json()
    const persona     = body.persona     || {}
    const empathyMap  = body.empathyMap  || {}
    const journeyMap  = body.journeyMap  || []
    const projectName = String(body.projectName || '').trim()
    const projectTag  = String(body.projectTag  || '').trim()
    const projectDesc = String(body.projectDesc || '').trim()

    if (!persona.name && !persona.job) {
      return Response.json({ error: 'Persona incomplet — renseignez au minimum le nom et le poste' }, { status: 400 })
    }

    // ── Build context summary ──
    const personaSummary = `
Nom : ${persona.name || '—'}, ${persona.age || '—'} ans, ${persona.gender || '—'}
Poste : ${persona.job || '—'} | Lieu : ${persona.location || '—'} | Revenu : ${persona.income || '—'}
Aisance tech : ${persona.techSavviness || 3}/5
Bio : ${persona.bio || '—'}
Citation : "${persona.quote || '—'}"
Objectifs : ${(persona.goals || []).join(', ') || '—'}
Frustrations : ${(persona.frustrations || []).join(', ') || '—'}
Motivations : ${(persona.motivations || []).join(', ') || '—'}
Comportement d'achat : ${persona.buyingBehavior || '—'}
Canaux préférés : ${(persona.preferredChannels || []).join(', ') || '—'}`.trim()

    const empathySummary = `
Pense : ${(empathyMap.thinks || []).join(' | ') || '—'}
Ressent : ${(empathyMap.feels || []).join(' | ') || '—'}
Voit : ${(empathyMap.sees || []).join(' | ') || '—'}
Entend : ${(empathyMap.hears || []).join(' | ') || '—'}
Dit : ${(empathyMap.says || []).join(' | ') || '—'}
Fait : ${(empathyMap.does || []).join(' | ') || '—'}
Douleurs : ${(empathyMap.pains || []).join(' | ') || '—'}
Gains recherchés : ${(empathyMap.gains || []).join(' | ') || '—'}`.trim()

    const journeySummary = journeyMap.map(stage => {
      const label = STAGE_LABELS[stage.stageId] || stage.stageId
      return `[${label}] Émotion:${stage.emotions}/5 | Touchpoints:${(stage.touchpoints||[]).join(',')||'—'} | Actions:${(stage.customerActions||[]).join(',')||'—'} | Frictions:${(stage.painPoints||[]).join(',')||'—'} | Opps:${(stage.opportunities||[]).join(',')||'—'}`
    }).join('\n')

    const meta = [
      projectName ? `Projet : ${projectName}` : null,
      projectTag  ? `Tag : ${projectTag}`      : null,
      projectDesc ? `Contexte : ${projectDesc}` : null,
    ].filter(Boolean).join('\n')

    const systemPrompt = `Tu es un expert en stratégie client, UX research, marketing comportemental et customer experience.
Tu analyses des profils clients avec précision et fournis des recommandations actionnables.
Tu réponds UNIQUEMENT en JSON valide, sans balises markdown, sans texte avant ou après.`

    const userPrompt = `Analyse ce profil client complet et génère un rapport stratégique détaillé.

${meta ? `## CONTEXTE\n${meta}\n\n` : ''}## BUYER PERSONA
${personaSummary}

## EMPATHY MAP
${empathySummary}

## CUSTOMER JOURNEY MAP
${journeySummary}

---

Retourne UNIQUEMENT ce JSON :

{
  "executive_summary": "Synthèse exécutive en 3-5 phrases : portrait du client, enjeux principaux, niveau de maturité du profil, urgence stratégique.",

  "scores": {
    "persona_completeness": 3.8,
    "empathy_depth": 3.5,
    "journey_quality": 4.0,
    "global": 3.8
  },

  "persona_insights": {
    "strengths": [
      "Point fort du persona 1 — ce qui est bien capturé",
      "Point fort 2"
    ],
    "gaps": [
      "Lacune identifiée 1 — ce qui manque",
      "Lacune 2"
    ],
    "psychographic_profile": "Analyse psychographique approfondie en 2-3 phrases : traits de personnalité dominants, déclencheurs d'achat, archétype client.",
    "buying_triggers": [
      "Déclencheur d'achat principal 1",
      "Déclencheur d'achat 2",
      "Déclencheur d'achat 3"
    ]
  },

  "empathy_insights": {
    "analysis": "Analyse de la carte d'empathie en 2-3 phrases : cohérence émotionnelle, contradictions détectées, tensions internes.",
    "key_tensions": [
      "Tension clé identifiée entre ce qu'il pense et ce qu'il fait 1",
      "Tension clé 2"
    ],
    "emotional_drivers": [
      "Moteur émotionnel principal 1 à activer dans le marketing",
      "Moteur émotionnel 2"
    ]
  },

  "journey_insights": {
    "overall": "Évaluation globale du parcours en 2-3 phrases : fluidité, points critiques, cohérence émotionnelle.",
    "critical_stages": [
      { "stage": "Nom de l'étape critique", "issue": "Description précise du problème" },
      { "stage": "Étape critique 2", "issue": "Problème 2" }
    ],
    "best_opportunities": [
      "Meilleure opportunité de conversion identifiée dans le parcours",
      "Opportunité 2",
      "Opportunité 3"
    ],
    "drop_off_risk": "Étape la plus à risque d'abandon et pourquoi."
  },

  "recommendations": [
    {
      "category": "Acquisition",
      "priority": 1,
      "title": "Titre court de la recommandation",
      "analysis": "Analyse en 2 phrases : pourquoi cette action, basée sur quels signaux du profil",
      "action": "Action concrète et mesurable à mener immédiatement"
    },
    {
      "category": "Conversion",
      "priority": 2,
      "title": "Recommandation conversion",
      "analysis": "Analyse basée sur les frictions identifiées dans le journey",
      "action": "Action concrète"
    },
    {
      "category": "Fidélisation",
      "priority": 3,
      "title": "Recommandation rétention",
      "analysis": "Basée sur les motivations et gains recherchés",
      "action": "Action concrète"
    },
    {
      "category": "Messaging",
      "priority": 4,
      "title": "Recommandation message/positionnement",
      "analysis": "Basée sur les douleurs et gains de l'empathy map",
      "action": "Axe de communication prioritaire"
    }
  ],

  "action_plan": [
    {
      "priority": 1,
      "category": "Acquisition | Conversion | Rétention | Messaging | Produit",
      "action": "Action concrète et mesurable",
      "rationale": "Justification basée sur les données du profil",
      "timeline": "Cette semaine | Ce mois | Ce trimestre",
      "impact": "Impact attendu en une phrase"
    }
  ],

  "messaging_angles": [
    {
      "angle": "Angle de message 1",
      "hook": "Accroche concrète à tester",
      "based_on": "Basé sur [frustration/motivation/pain] spécifique du profil"
    },
    {
      "angle": "Angle de message 2",
      "hook": "Accroche 2",
      "based_on": "Basé sur..."
    }
  ],

  "synthesis": "Synthèse stratégique finale en 3-4 phrases : verdict sur la connaissance client, levier principal identifié, prochaine étape la plus impactante."
}

RÈGLES :
- Scores entre 1.0 et 5.0
- recommendations : exactement 4 à 6 items, catégories variées
- action_plan : 4 à 6 actions classées par impact réel
- messaging_angles : 2 à 3 angles de communication basés précisément sur le profil
- critical_stages.stage : utiliser les labels français (Prise de conscience, Considération, Décision, Achat, Fidélisation, Recommandation)
- Tout doit être spécifique au profil fourni, pas générique`

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

    const parsed = parseJSON(rawText)

    if (!parsed) {
      console.error('analyser-buyer-persona: parse fail. Raw:', rawText.slice(0, 500))
      return Response.json({ error: 'Réponse IA invalide — impossible de parser le JSON' }, { status: 500 })
    }

    // Normalize scores
    if (parsed.scores && typeof parsed.scores === 'object') {
      for (const key of Object.keys(parsed.scores)) {
        parsed.scores[key] = Math.min(5, Math.max(1, parseFloat(parsed.scores[key]) || 3))
      }
    } else {
      parsed.scores = { persona_completeness: 3, empathy_depth: 3, journey_quality: 3, global: 3 }
    }

    // Ensure arrays
    if (!Array.isArray(parsed.recommendations))  parsed.recommendations  = []
    if (!Array.isArray(parsed.action_plan))       parsed.action_plan      = []
    if (!Array.isArray(parsed.messaging_angles))  parsed.messaging_angles = []
    if (!parsed.executive_summary)                parsed.executive_summary = ''
    if (!parsed.synthesis)                        parsed.synthesis         = ''

    // Normalize recommendations
    parsed.recommendations = parsed.recommendations.map((r, i) => ({
      category: String(r.category || '').trim(),
      priority: parseInt(r.priority) || i + 1,
      title:    String(r.title    || '').trim(),
      analysis: String(r.analysis || '').trim(),
      action:   String(r.action   || '').trim(),
    }))

    // Normalize action_plan
    parsed.action_plan = parsed.action_plan.map((a, i) => ({
      priority:  parseInt(a.priority)      || i + 1,
      category:  String(a.category  || '').trim(),
      action:    String(a.action    || '').trim(),
      rationale: String(a.rationale || '').trim(),
      timeline:  String(a.timeline  || '').trim(),
      impact:    String(a.impact    || '').trim(),
    }))

    return Response.json({ success: true, result: parsed })

  } catch (err) {
    console.error('analyser-buyer-persona error:', err)
    return Response.json({ error: err.message || 'Erreur serveur interne' }, { status: 500 })
  }
}