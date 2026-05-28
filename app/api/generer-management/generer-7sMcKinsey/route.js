import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

// ── 7S Framework metadata ─────────────────────────────────────────────────────
export const SEVEN_S = {
  strategy: {
    key:    'strategy',
    label:  'Stratégie',
    fr:     'Strategy',
    icon:   '🧭',
    type:   'hard',
    color:  '#60a5fa',
    bg:     'rgba(96,165,250,.08)',
    border: 'rgba(96,165,250,.25)',
    desc:   'Plan d\'action pour atteindre les objectifs face à la concurrence',
    questions: [
      'Quelle est votre stratégie de croissance actuelle ?',
      'Comment vous différenciez-vous de la concurrence ?',
      'Vos objectifs stratégiques sont-ils clairement définis et partagés ?',
      'Votre stratégie est-elle adaptée aux changements du marché ?',
    ],
  },
  structure: {
    key:    'structure',
    label:  'Structure',
    fr:     'Structure',
    icon:   '🏗',
    type:   'hard',
    color:  '#818cf8',
    bg:     'rgba(129,140,248,.08)',
    border: 'rgba(129,140,248,.25)',
    desc:   'Organigramme, hiérarchie et répartition des responsabilités',
    questions: [
      'Comment est organisée la hiérarchie de décision ?',
      'Les responsabilités sont-elles clairement définies ?',
      'La structure favorise-t-elle la collaboration inter-départements ?',
      'La structure est-elle adaptée à votre taille et stratégie ?',
    ],
  },
  systems: {
    key:    'systems',
    label:  'Systèmes',
    fr:     'Systems',
    icon:   '⚙',
    type:   'hard',
    color:  '#a78bfa',
    bg:     'rgba(167,139,250,.08)',
    border: 'rgba(167,139,250,.25)',
    desc:   'Processus, procédures et flux d\'information quotidiens',
    questions: [
      'Quels sont les systèmes IT et processus métier clés ?',
      'Les flux d\'information sont-ils efficaces et fiables ?',
      'Comment les performances sont-elles mesurées et reportées ?',
      'Les systèmes supportent-ils bien la stratégie actuelle ?',
    ],
  },
  style: {
    key:    'style',
    label:  'Style',
    fr:     'Style',
    icon:   '🎭',
    type:   'soft',
    color:  '#f472b6',
    bg:     'rgba(244,114,182,.08)',
    border: 'rgba(244,114,182,.25)',
    desc:   'Style de management et culture comportementale des leaders',
    questions: [
      'Quel est le style de leadership dominant (directif, participatif, délégué) ?',
      'Comment les décisions importantes sont-elles prises ?',
      'La culture managériale est-elle cohérente avec la stratégie ?',
      'Comment le changement est-il communiqué et conduit ?',
    ],
  },
  staff: {
    key:    'staff',
    label:  'Personnel',
    fr:     'Staff',
    icon:   '👥',
    type:   'soft',
    color:  '#fb923c',
    bg:     'rgba(251,146,60,.08)',
    border: 'rgba(251,146,60,.25)',
    desc:   'Profils des employés, recrutement, fidélisation et développement RH',
    questions: [
      'Avez-vous les bons profils pour exécuter votre stratégie ?',
      'Comment attirez-vous et retenez-vous les talents clés ?',
      'Le plan de développement RH est-il aligné sur les besoins futurs ?',
      'Y a-t-il des gaps de compétences critiques ?',
    ],
  },
  skills: {
    key:    'skills',
    label:  'Compétences',
    fr:     'Skills',
    icon:   '🛠',
    type:   'soft',
    color:  '#34d399',
    bg:     'rgba(52,211,153,.08)',
    border: 'rgba(52,211,153,.25)',
    desc:   'Capacités distinctives et savoir-faire qui différencient l\'entreprise',
    questions: [
      'Quelles sont vos compétences cœur (core competencies) ?',
      'Ces compétences sont-elles un avantage concurrentiel durable ?',
      'Les compétences actuelles seront-elles suffisantes demain ?',
      'Comment les compétences sont-elles développées et transmises ?',
    ],
  },
  sharedValues: {
    key:    'sharedValues',
    label:  'Valeurs partagées',
    fr:     'Shared Values',
    icon:   '💎',
    type:   'center',
    color:  '#facc15',
    bg:     'rgba(250,204,21,.08)',
    border: 'rgba(250,204,21,.3)',
    desc:   'Valeurs fondamentales, culture d\'entreprise et raison d\'être (centre du modèle)',
    questions: [
      'Quelles valeurs guident les décisions et comportements au quotidien ?',
      'La culture d\'entreprise est-elle vécue ou seulement affichée ?',
      'Les valeurs sont-elles alignées avec la stratégie de changement ?',
      'Comment les nouvelles recrues s\'approprient-elles la culture ?',
    ],
  },
}

const ALIGNMENT_PAIRS = [
  ['strategy',  'structure'],
  ['strategy',  'systems'],
  ['structure', 'systems'],
  ['style',     'staff'],
  ['staff',     'skills'],
  ['style',     'sharedValues'],
  ['sharedValues', 'strategy'],
  ['sharedValues', 'staff'],
]

export async function POST(request) {
  try {
    const body = await request.json()
    const {
      projectName,
      projectTag,
      companyName,
      changeInitiative,
      context,
      elements,   // { [key]: { score, description, strengths, weaknesses, notes } }
      changeType, // 'transformation' | 'restructuring' | 'growth' | 'turnaround' | 'merger' | 'digital'
    } = body

    if (!elements || Object.keys(elements).length === 0) {
      return Response.json({ error: 'Aucun élément 7S évalué' }, { status: 400 })
    }

    const contextLines = [
      projectName      && `Entreprise / Projet : ${projectName}`,
      projectTag       && `Secteur : ${projectTag}`,
      companyName      && `Société : ${companyName}`,
      changeInitiative && `Initiative de changement : ${changeInitiative}`,
      changeType       && `Type de changement : ${changeType}`,
      context          && `Contexte : ${context}`,
    ].filter(Boolean).join('\n')

    const elementsDetail = Object.entries(SEVEN_S).map(([key, meta]) => {
      const el = elements[key] || {}
      return `
### ${meta.icon} ${meta.label} (${meta.fr}) — Score : ${el.score ?? 3}/5 — Type : ${meta.type === 'center' ? 'Centre (pivot)' : meta.type === 'hard' ? 'Facteur dur' : 'Facteur mou'}
${meta.desc}
${el.description ? `Évaluation : ${el.description}` : ''}
${el.strengths   ? `Points forts : ${el.strengths}` : ''}
${el.weaknesses  ? `Points faibles : ${el.weaknesses}` : ''}
${el.notes       ? `Notes : ${el.notes}` : ''}
`.trim()
    }).join('\n\n')

    // Compute misalignment pairs
    const scores = Object.fromEntries(Object.entries(elements).map(([k, v]) => [k, v.score ?? 3]))
    const misalignedPairs = ALIGNMENT_PAIRS
      .map(([a, b]) => ({ a, b, diff: Math.abs((scores[a] || 3) - (scores[b] || 3)) }))
      .filter(p => p.diff >= 1.5)
      .sort((x, y) => y.diff - x.diff)
      .map(p => `${SEVEN_S[p.a]?.label} vs ${SEVEN_S[p.b]?.label} (écart : ${p.diff.toFixed(1)})`)

    const avgScore = Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length

    const prompt = `Tu es un consultant senior McKinsey spécialisé en transformation organisationnelle et dans le modèle des 7S.

${contextLines ? `## CONTEXTE\n${contextLines}\n` : ''}

## ÉVALUATION DES 7S

Score moyen global : ${avgScore.toFixed(2)}/5

${elementsDetail}

${misalignedPairs.length > 0 ? `## DÉSALIGNEMENTS DÉTECTÉS (écart ≥ 1.5)\n${misalignedPairs.join('\n')}` : ''}

---

Génère une analyse 7S complète, précise et transformative pour guider le changement.
Réponds UNIQUEMENT en JSON valide avec cette structure exacte :

{
  "readiness_score": 3.4,
  "readiness_label": "Pas prêt | Fragile | En préparation | Prêt avec réserves | Prêt | Très prêt",
  "executive_summary": "Synthèse de 3-5 phrases : état d'alignement global des 7S, facteurs critiques pour le succès du changement, risque principal et priorité d'action.",

  "alignment_matrix": [
    {
      "element_a": "strategy",
      "element_b": "structure",
      "alignment": "Alignés | Partiellement alignés | Désalignés | Conflit critique",
      "analysis": "Pourquoi ces deux éléments sont-ils alignés ou pas — 1-2 phrases spécifiques",
      "priority": "Haute | Moyenne | Faible"
    }
  ],

  "elements": {
    "strategy":      { "assessment": "Analyse 2-3 phrases spécifique au contexte", "strengths": ["Force #1", "Force #2"], "risks": ["Risque #1"], "actions": ["Action prioritaire #1", "Action #2"], "change_impact": "Impact direct sur l'initiative de changement" },
    "structure":     { "assessment": "...", "strengths": [], "risks": [], "actions": [], "change_impact": "..." },
    "systems":       { "assessment": "...", "strengths": [], "risks": [], "actions": [], "change_impact": "..." },
    "style":         { "assessment": "...", "strengths": [], "risks": [], "actions": [], "change_impact": "..." },
    "staff":         { "assessment": "...", "strengths": [], "risks": [], "actions": [], "change_impact": "..." },
    "skills":        { "assessment": "...", "strengths": [], "risks": [], "actions": [], "change_impact": "..." },
    "sharedValues":  { "assessment": "...", "strengths": [], "risks": [], "actions": [], "change_impact": "..." }
  },

  "critical_misalignments": [
    {
      "pair": ["element_a_key", "element_b_key"],
      "severity": "Critique | Élevé | Modéré",
      "description": "Nature et conséquences du désalignement sur le changement",
      "resolution": "Comment résoudre ce désalignement — action concrète"
    }
  ],

  "change_risks": [
    {
      "risk": "Risque de changement identifié",
      "source": "Quel(s) S en sont la source",
      "probability": "Faible | Modérée | Élevée",
      "severity": "Faible | Modérée | Élevée | Critique",
      "mitigation": "Mesure de mitigation concrète"
    }
  ],

  "transformation_roadmap": [
    {
      "phase": "Phase 1 — Stabiliser (0-3 mois)",
      "focus_elements": ["strategy", "sharedValues"],
      "actions": ["Action #1 avec responsable suggéré", "Action #2", "Action #3"],
      "milestone": "Résultat mesurable",
      "success_criteria": "Comment savoir que cette phase est réussie"
    },
    {
      "phase": "Phase 2 — Aligner (3-9 mois)",
      "focus_elements": [],
      "actions": [],
      "milestone": "",
      "success_criteria": ""
    },
    {
      "phase": "Phase 3 — Transformer (9-24 mois)",
      "focus_elements": [],
      "actions": [],
      "milestone": "",
      "success_criteria": ""
    }
  ],

  "quick_wins": [
    { "action": "Action rapide réalisable en <30 jours", "s_element": "structure", "impact": "Impact attendu" }
  ],

  "kpis": [
    { "name": "KPI de transformation #1", "target": "Cible mesurable", "s_element": "strategy", "timeline": "0-6 mois" }
  ],

  "conclusion": "Verdict final sur la viabilité du changement et la recommandation stratégique principale. 2-3 phrases percutantes."
}

RÈGLES IMPÉRATIVES :
- readiness_score entre 1.0 et 5.0 (basé sur le score moyen et les désalignements)
- alignment_matrix doit couvrir au minimum les 7 paires les plus critiques
- Les éléments à faible score (< 2.5) sont des risques critiques — souligner leur impact sur le changement
- Les Valeurs Partagées (centre) qui sont faibles contaminent TOUS les autres S
- Les facteurs durs (Strategy, Structure, Systems) sont plus rapides à changer que les facteurs mous
- Les facteurs mous (Style, Staff, Skills) nécessitent 12-24 mois min pour un vrai changement
- Les quick_wins doivent être réalisables SANS budget supplémentaire majeur
- La roadmap doit être cohérente avec le type de changement spécifié`

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
        readiness_score: avgScore,
        readiness_label: avgScore >= 4 ? 'Prêt' : avgScore >= 3 ? 'En préparation' : 'Fragile',
        executive_summary: rawText.slice(0, 600),
        alignment_matrix: [],
        elements: Object.fromEntries(Object.keys(SEVEN_S).map(k => [k, {
          assessment: `Analyse de ${SEVEN_S[k].label} en cours.`,
          strengths: [], risks: [], actions: [], change_impact: '',
        }])),
        critical_misalignments: [],
        change_risks: [],
        transformation_roadmap: [],
        quick_wins: [],
        kpis: [],
        conclusion: 'Une analyse approfondie est nécessaire pour finaliser les recommandations.',
      }
    }

    return Response.json({ success: true, result })

  } catch (err) {
    console.error('7S API error:', err)
    return Response.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}