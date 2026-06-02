import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

// ── Static reference data (mirrors page constants) ────────────────────────────
const BONES = [
  { id: 'man',      label: "Main d'œuvre", desc: 'Personnel, compétences, formation, comportement humain' },
  { id: 'machine',  label: 'Machine',      desc: 'Équipements, outils, maintenance, technologie' },
  { id: 'material', label: 'Matière',      desc: 'Matières premières, composants, fournitures, intrants' },
  { id: 'method',   label: 'Méthode',      desc: 'Procédures, processus, instructions, standards opérationnels' },
  { id: 'milieu',   label: 'Milieu',       desc: 'Environnement, conditions de travail, lieu, contexte' },
  { id: 'measure',  label: 'Mesure',       desc: 'Contrôle qualité, métriques, inspection, calibration' },
]

const PRIORITY_VALUES = ['high', 'medium', 'low']
const uid = () => `ai-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

// ── Helper: flatten all causes for stats ─────────────────────────────────────
const flattenCauses = (bones = {}) => {
  const all = []
  Object.entries(bones).forEach(([boneId, causes]) => {
    causes.forEach(c => {
      all.push({ ...c, boneId })
      ;(c.subcauses || []).forEach(sc => all.push({ ...sc, boneId, isSubcause: true }))
    })
  })
  return all
}

// ── Helper: flatten why chains for stats ──────────────────────────────────────
const flattenChains = (chains = []) =>
  chains.map(c => ({
    id:       c.id,
    title:    c.title,
    steps:    c.steps?.length || 0,
    rootCause: c.steps?.length > 0 ? c.steps[c.steps.length - 1]?.because : null,
  }))

// ═════════════════════════════════════════════════════════════════════════════
// POST handler — dispatches between two modes
// ═════════════════════════════════════════════════════════════════════════════
export async function POST(request) {
  try {
    const body = await request.json()
    const { mode } = body  // 'generate' | 'analyze'

    if (mode === 'generate') {
      return await handleGenerate(body)
    } else {
      return await handleAnalyze(body)
    }
  } catch (err) {
    console.error('Ishikawa API error:', err)
    return Response.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// MODE 1 — GENERATE
// User provides a problem description + optional context
// Claude populates ALL bones, causes, subcauses AND 5-Why chains from scratch
// ═════════════════════════════════════════════════════════════════════════════
async function handleGenerate(body) {
  const { problem, context, impact, projectName, projectTag, nbWhyChains = 2 } = body

  if (!problem?.trim()) {
    return Response.json({ error: 'Problème requis pour la génération' }, { status: 400 })
  }

  const contextLines = [
    projectName && `Entreprise / Projet : ${projectName}`,
    projectTag  && `Secteur : ${projectTag}`,
    context     && `Contexte additionnel : ${context}`,
    impact      && `Impact observé : ${impact}`,
  ].filter(Boolean).join('\n')

  const prompt = `Tu es un expert en résolution de problèmes industriels et opérationnels, maître du diagramme d'Ishikawa (méthode 6M) et de la technique des 5 Pourquoi.

## PROBLÈME À ANALYSER
${problem}

${contextLines ? `## CONTEXTE\n${contextLines}\n` : ''}

## TA MISSION
Génère une analyse complète et réaliste de ce problème en deux parties :

### PARTIE 1 — Diagramme d'Ishikawa (6M)
Pour chacune des 6 catégories (Man, Machine, Material, Method, Milieu, Measure), identifie les causes probables. Sois spécifique au problème décrit, ne génère pas de causes génériques.

### PARTIE 2 — Chaînes 5 Pourquoi
Génère ${nbWhyChains} chaîne(s) de 5 Pourquoi à partir des causes racines les plus probables identifiées dans l'Ishikawa.

Réponds UNIQUEMENT en JSON valide avec cette structure exacte :

{
  "bones": {
    "man": [
      {
        "text": "Cause principale liée à la main d'œuvre",
        "priority": "high|medium|low",
        "subcauses": [
          { "text": "Sous-cause précise", "priority": "high|medium|low" }
        ]
      }
    ],
    "machine": [ /* même structure */ ],
    "material": [ /* même structure */ ],
    "method":   [ /* même structure */ ],
    "milieu":   [ /* même structure */ ],
    "measure":  [ /* même structure */ ]
  },
  "whyChains": [
    {
      "title": "Titre court de la chaîne (ex: Piste Méthode)",
      "steps": [
        { "why": "Pourquoi le problème se produit-il ?",           "because": "Réponse précise et contextualisée" },
        { "why": "Pourquoi [réponse précédente] ?",                "because": "Réponse précise" },
        { "why": "Pourquoi [réponse précédente] ?",                "because": "Réponse précise" },
        { "why": "Pourquoi [réponse précédente] ?",                "because": "Réponse précise" },
        { "why": "Pourquoi [réponse précédente] ?",                "because": "CAUSE RACINE FINALE — réponse très précise" }
      ]
    }
  ],
  "resume": "Résumé de 2-3 phrases sur les causes principales identifiées et la/les cause(s) racine(s) à traiter en priorité."
}

RÈGLES CRITIQUES :
- Génère 2 à 4 causes par catégorie 6M (pas plus, pas moins)
- Chaque cause peut avoir 0 à 2 sous-causes
- priority "high" = cause très probable ou impact fort sur le problème décrit
- priority "medium" = cause possible, à investiguer
- priority "low" = cause marginale ou rare
- Les chaînes 5 Pourquoi doivent être cohérentes avec les causes identifiées dans l'Ishikawa
- Chaque "why" doit être formulé comme une vraie question spécifique, pas générique
- Chaque "because" doit être une réponse factuelle et actionnable
- Sois très spécifique au secteur et contexte fournis — évite tout langage vague`

  const response = await client.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 3000,
    messages: [{ role: 'user', content: prompt }],
  })

  const rawText = response.content.filter(b => b.type === 'text').map(b => b.text).join('')

  let generated
  try {
    const match = rawText.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('Pas de JSON')
    generated = JSON.parse(match[0])
  } catch {
    // Robust fallback — build a minimal structure
    generated = buildFallbackGenerated(problem, context)
  }

  // Inject unique IDs into every cause and subcause
  const bonesWithIds = {}
  BONES.forEach(({ id }) => {
    bonesWithIds[id] = (generated.bones?.[id] || []).map(cause => ({
      id:        uid(),
      text:      cause.text       || 'Cause à préciser',
      priority:  PRIORITY_VALUES.includes(cause.priority) ? cause.priority : 'medium',
      subcauses: (cause.subcauses || []).map(sc => ({
        id:       uid(),
        text:     sc.text     || 'Sous-cause à préciser',
        priority: PRIORITY_VALUES.includes(sc.priority) ? sc.priority : 'medium',
      })),
    }))
  })

  const whyChainsWithIds = (generated.whyChains || []).map((chain, ci) => ({
    id:    uid(),
    title: chain.title || `Chaîne ${ci + 1}`,
    steps: (chain.steps || []).slice(0, 5).map(step => ({
      id:      uid(),
      why:     step.why     || '',
      because: step.because || '',
    })),
  }))

  return Response.json({
    success: true,
    mode:    'generate',
    data: {
      bones:      bonesWithIds,
      whyChains:  whyChainsWithIds,
      resume:     generated.resume || '',
    },
  })
}

// ═════════════════════════════════════════════════════════════════════════════
// MODE 2 — ANALYZE
// User has already filled bones/causes/why-chains
// Claude diagnoses, finds root causes, spots gaps, gives action plan
// ═════════════════════════════════════════════════════════════════════════════
async function handleAnalyze(body) {
  const { problem, context, impact, bones, whyChains, projectName, projectTag } = body

  const allCauses   = flattenCauses(bones)
  const chainsSummary = flattenChains(whyChains)

  if (allCauses.length === 0 && chainsSummary.length === 0) {
    return Response.json({ error: 'Aucun élément à analyser — ajoutez des causes ou des chaînes 5 Pourquoi' }, { status: 400 })
  }

  // Build a structured summary of current data for Claude
  const ishikawaSection = BONES.map(bone => {
    const causes = bones?.[bone.id] || []
    if (!causes.length) return `### ${bone.label} (${bone.id})\n  Aucune cause renseignée.`
    const lines = causes.map((c, i) => {
      const sub = (c.subcauses || []).map(sc => `    → ${sc.text} [${sc.priority}]`).join('\n')
      return `  ${i + 1}. [${c.priority?.toUpperCase()}] ${c.text}${sub ? '\n' + sub : ''}`
    }).join('\n')
    return `### ${bone.label}\n${lines}`
  }).join('\n\n')

  const whySection = (whyChains || []).length === 0
    ? 'Aucune chaîne 5 Pourquoi renseignée.'
    : (whyChains || []).map((chain, ci) => {
        const steps = (chain.steps || []).map((s, si) =>
          `  ${si + 1}. Pourquoi: ${s.why || '—'}\n     Parce que: ${s.because || '—'}`
        ).join('\n')
        const rootCause = chain.steps?.length > 0 ? chain.steps[chain.steps.length - 1]?.because : null
        return `**Chaîne ${ci + 1}: ${chain.title}** (${chain.steps?.length || 0}/5 étapes)\n${steps}${rootCause ? `\n  ★ Cause racine : ${rootCause}` : ''}`
      }).join('\n\n')

  const contextLines = [
    projectName && `Entreprise : ${projectName}`,
    projectTag  && `Secteur : ${projectTag}`,
    context     && `Contexte : ${context}`,
    impact      && `Impact : ${impact}`,
  ].filter(Boolean).join('\n')

  // Stats for context
  const highCount   = allCauses.filter(c => c.priority === 'high').length
  const totalCauses = allCauses.length
  const completedChains = chainsSummary.filter(c => c.steps >= 5).length

  const prompt = `Tu es un expert en analyse causale et amélioration continue (Lean, Six Sigma, PDCA).

## PROBLÈME
${problem}

${contextLines ? `## CONTEXTE\n${contextLines}\n` : ''}

## DONNÉES ISHIKAWA (6M) — ${totalCauses} cause(s) dont ${highCount} haute priorité

${ishikawaSection}

## DONNÉES 5 POURQUOI — ${chainsSummary.length} chaîne(s), ${completedChains} complète(s)

${whySection}

---

Génère une analyse experte de résolution de problème. Réponds UNIQUEMENT en JSON valide :

{
  "diagnostic": "Paragraphe de 3-5 phrases : synthèse des causes dominantes, catégories 6M les plus touchées, niveau de complétude de l'analyse, risques si non traité. Sois direct et spécifique.",

  "causes_racines": [
    {
      "cause":       "Formulation précise de la cause racine identifiée",
      "categorie":   "man|machine|material|method|milieu|measure",
      "explication": "2-3 phrases : pourquoi c'est une cause racine, lien avec le problème, mécanisme causal.",
      "action":      "Action corrective concrète et immédiate (max 12 mots)"
    }
  ],

  "manquantes": [
    "Description d'une cause ou dimension non explorée qui mériterait d'être investiguée",
    "..."
  ],

  "plan_action": [
    {
      "action": "Action prioritaire concrète et mesurable",
      "delai":  "Délai suggéré (ex: Immédiat, 1 semaine, 1 mois)"
    }
  ],

  "why_insights": [
    "Insight issu des chaînes 5 Pourquoi sur les causes systémiques sous-jacentes"
  ],

  "conclusion": "Phrase de verdict : nature du problème (ponctuel / systémique / structurel) et priorité absolue."
}

RÈGLES :
- Identifie 2 à 5 causes racines basées sur les données fournies (pas inventées)
- Les causes_racines doivent provenir des données Ishikawa ou des chaînes 5 Pourquoi
- Les "manquantes" pointent les catégories 6M vides ou sous-documentées
- Le plan_action doit être ordonné par urgence / impact décroissant (max 6 actions)
- Les why_insights ne s'affichent que si des chaînes 5 Pourquoi existent avec des réponses
- Si une catégorie 6M est vide, signale-le dans les manquantes
- Tiens compte du secteur (${projectTag || 'non spécifié'}) pour contextualiser`

  const response = await client.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 2500,
    messages: [{ role: 'user', content: prompt }],
  })

  const rawText = response.content.filter(b => b.type === 'text').map(b => b.text).join('')

  let result
  try {
    const match = rawText.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('Pas de JSON')
    result = JSON.parse(match[0])

    // Validate required keys
    if (!result.causes_racines) result.causes_racines = []
    if (!result.manquantes)     result.manquantes     = []
    if (!result.plan_action)    result.plan_action    = []
    if (!result.why_insights)   result.why_insights   = []
  } catch {
    // Fallback analysis
    const emptyCats = BONES.filter(b => !(bones?.[b.id]?.length > 0)).map(b => b.label)
    const highCauses = allCauses.filter(c => c.priority === 'high').slice(0, 3)

    result = {
      diagnostic: `Analyse de "${problem}" : ${totalCauses} cause(s) identifiée(s) dans ${Object.values(bones || {}).filter(arr => arr.length > 0).length} catégorie(s) sur 6. ${highCount} cause(s) de haute priorité nécessitent une attention immédiate. ${chainsSummary.length > 0 ? `${completedChains}/${chainsSummary.length} chaîne(s) 5 Pourquoi complète(s).` : 'Aucune chaîne 5 Pourquoi renseignée.'}`,
      causes_racines: highCauses.map(c => ({
        cause:       c.text,
        categorie:   c.boneId,
        explication: `Cause identifiée comme haute priorité dans la catégorie ${BONES.find(b => b.id === c.boneId)?.label || c.boneId}.`,
        action:      'Investiguer et mettre en place une action corrective',
      })),
      manquantes: emptyCats.map(cat => `La catégorie "${cat}" n'a aucune cause renseignée — à investiguer`),
      plan_action: [
        { action: 'Traiter en priorité les causes de haute priorité identifiées', delai: 'Immédiat' },
        { action: 'Compléter les catégories 6M non documentées', delai: '1 semaine' },
        { action: 'Valider les causes racines avec les équipes terrain', delai: '2 semaines' },
        { action: 'Déployer un plan de correction systémique', delai: '1 mois' },
      ],
      why_insights: chainsSummary.length > 0
        ? [`${completedChains} chaîne(s) 5 Pourquoi ont permis d'identifier des causes systémiques sous-jacentes.`]
        : [],
      conclusion: `Problème potentiellement systémique — traiter les ${highCount} cause(s) de haute priorité en urgence.`,
    }
  }

  return Response.json({ success: true, mode: 'analyze', result })
}

// ── Fallback generator (if JSON parse fails in generate mode) ─────────────────
function buildFallbackGenerated(problem, context) {
  const base = {
    bones: {
      man: [
        { text: 'Manque de formation ou compétences insuffisantes', priority: 'high', subcauses: [{ text: 'Absence de procédure de formation', priority: 'medium' }] },
        { text: 'Surcharge de travail ou fatigue', priority: 'medium', subcauses: [] },
      ],
      machine: [
        { text: 'Maintenance insuffisante ou absence de contrôle préventif', priority: 'high', subcauses: [] },
        { text: 'Équipement obsolète ou inadapté', priority: 'medium', subcauses: [{ text: 'Budget de renouvellement insuffisant', priority: 'low' }] },
      ],
      material: [
        { text: 'Qualité des intrants non vérifiée', priority: 'medium', subcauses: [] },
        { text: 'Rupture ou délai d\'approvisionnement', priority: 'medium', subcauses: [] },
      ],
      method: [
        { text: 'Procédures non documentées ou non respectées', priority: 'high', subcauses: [{ text: 'Absence de standard opératoire', priority: 'high' }] },
        { text: 'Processus non optimisé générant des erreurs', priority: 'medium', subcauses: [] },
      ],
      milieu: [
        { text: 'Conditions de travail défavorables', priority: 'medium', subcauses: [] },
        { text: 'Communication inter-équipes insuffisante', priority: 'medium', subcauses: [] },
      ],
      measure: [
        { text: 'Absence d\'indicateurs de suivi adaptés', priority: 'high', subcauses: [] },
        { text: 'Contrôles qualité non systématiques', priority: 'medium', subcauses: [] },
      ],
    },
    whyChains: [
      {
        title: 'Piste principale',
        steps: [
          { why: 'Pourquoi le problème se produit-il ?',               because: 'Les procédures ne sont pas respectées systématiquement' },
          { why: 'Pourquoi les procédures ne sont-elles pas respectées ?', because: 'Elles ne sont pas accessibles au moment opportun' },
          { why: 'Pourquoi ne sont-elles pas accessibles ?',           because: 'Elles n\'ont pas été formalisées et diffusées' },
          { why: 'Pourquoi n\'ont-elles pas été formalisées ?',        because: 'Aucun responsable désigné pour leur mise à jour' },
          { why: 'Pourquoi aucun responsable n\'est désigné ?',        because: 'Absence de gouvernance documentaire définie' },
        ],
      },
    ],
    resume: `L'analyse initiale du problème "${problem}" pointe vers des causes organisationnelles (méthodes, documentation) et humaines (formation, communication) comme facteurs prédominants. Des lacunes dans le contrôle et la mesure semblent amplifier l'impact. Une investigation terrain est recommandée pour valider ces hypothèses.`,
  }
  return base
}