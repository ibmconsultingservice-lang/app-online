import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

// ── Perspective helpers ───────────────────────────────────────────────────────
const PERSPECTIVE_LABELS = {
  finance:       'Finance',
  clients:       'Clients',
  processus:     'Processus internes',
  apprentissage: 'Apprentissage & Croissance',
}

const PERSPECTIVE_FOCUS = {
  finance:       'Résultats financiers, ROI, croissance du chiffre d\'affaires, réduction des coûts',
  clients:       'Satisfaction client, fidélisation, acquisition, part de marché',
  processus:     'Excellence opérationnelle, qualité, délais, innovation de processus',
  apprentissage: 'Capital humain, compétences, culture d\'innovation, systèmes d\'information',
}

const STATUS_LABELS = {
  'atteint':     'Atteint (100%)',
  'en-cours':    'En cours (~50%)',
  'en-retard':   'En retard (0%)',
  'non-defini':  'Non défini',
}

// ── Helper: per-perspective weighted score ────────────────────────────────────
function computePerspScores(objectives) {
  const byPerspective = objectives.reduce((acc, o) => {
    const key = o.perspective || 'finance'
    if (!acc[key]) acc[key] = []
    acc[key].push(o)
    return acc
  }, {})

  const perspScores = {}
  for (const [key, objs] of Object.entries(byPerspective)) {
    const s = objs.filter(o => o.status !== 'non-defini')
    if (!s.length) continue
    const tw = s.reduce((acc, o) => acc + (o.poids || 1), 0)
    perspScores[key] = Math.round(s.reduce((acc, o) => {
      const v = o.status === 'atteint' ? 1 : o.status === 'en-cours' ? 0.5 : 0
      return acc + v * (o.poids || 1)
    }, 0) / tw * 100)
  }
  return { byPerspective, perspScores }
}

// ════════════════════════════════════════════════════════════════════════════════
// POST handler — routes on action field
// ════════════════════════════════════════════════════════════════════════════════
export async function POST(request) {
  try {
    const body = await request.json()
    const { action } = body

    // ── Route 1: AI Generation from project description ──────────────────────
    if (action === 'generate') {
      return handleGenerate(body)
    }

    // ── Route 2: AI Analysis of existing scorecard ───────────────────────────
    return handleAnalyse(body)

  } catch (err) {
    console.error('BSC API error:', err)
    return Response.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// ROUTE 1 — Generate objectives from a free-text project description
// ════════════════════════════════════════════════════════════════════════════════
async function handleGenerate({ description, projectName, projectTag, cardName }) {
  if (!description?.trim()) {
    return Response.json({ error: 'Description requise' }, { status: 400 })
  }

  const prompt = `Tu es un consultant senior en pilotage de la performance, expert Balanced Scorecard (BSC) selon Kaplan & Norton.

L'utilisateur décrit son projet / organisation en langage naturel. Tu dois concevoir un Balanced Scorecard complet, cohérent et immédiatement opérationnel.

## ENTRÉE UTILISATEUR
${projectName ? `Organisation : ${projectName}` : ''}
${projectTag  ? `Secteur : ${projectTag}` : ''}
${cardName    ? `Nom du BSC : ${cardName}` : ''}
Description : ${description}

## CONSIGNES
- Génère entre 3 et 5 objectifs par perspective (finance, clients, processus, apprentissage)
- Chaque objectif doit être SMART : spécifique, mesurable, réaliste
- Le KPI doit être concret et quantifiable
- Les cibles doivent être ambitieuses mais crédibles (basées sur le secteur)
- Adapte le vocabulaire au secteur/contexte détecté
- La vision et la stratégie doivent être synthétiques (1-2 phrases chacune)
- Les relations de cause à effet entre perspectives doivent être logiques

Réponds UNIQUEMENT en JSON valide, sans commentaire, sans markdown :

{
  "vision": "Vision stratégique synthétique en 1-2 phrases",
  "strategie": "Axes stratégiques prioritaires en 1-2 phrases",
  "objectives": [
    {
      "name": "Nom de l'objectif",
      "description": "Contexte et enjeu en 1 phrase",
      "perspective": "finance|clients|processus|apprentissage",
      "kpi": "Indicateur de mesure précis",
      "cible": "Valeur numérique cible",
      "valeurActuelle": "Estimation valeur de départ réaliste ou vide",
      "unite": "%, k€, pts, h, score…",
      "responsable": "Direction / équipe type",
      "echeance": "",
      "status": "non-defini",
      "poids": 2
    }
  ],
  "synthese": "Paragraphe de 2-3 phrases expliquant la logique globale du BSC généré et ses hypothèses clés."
}

RÈGLES IMPÉRATIVES :
1. "perspective" utilise UNIQUEMENT : finance, clients, processus, apprentissage
2. "poids" est un entier entre 1 et 5 (5 = objectif critique)
3. "status" est TOUJOURS "non-defini" pour les objectifs générés
4. "cible" et "valeurActuelle" sont des chaînes numériques (ex: "20", "1500") — jamais avec l'unité
5. "echeance" est vide "" (l'utilisateur le saisira)
6. Génère au minimum 12 objectifs répartis équitablement sur les 4 perspectives`

  const response = await client.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 3000,
    messages:   [{ role: 'user', content: prompt }],
  })

  const rawText = response.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('')

  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Pas de JSON dans la réponse')
    const result = JSON.parse(jsonMatch[0])

    // Inject unique IDs
    const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    result.objectives = (result.objectives || []).map(o => ({ id: uid(), ...o }))

    return Response.json({ success: true, result })
  } catch (parseErr) {
    return Response.json({ error: 'Erreur de parsing IA', raw: rawText.slice(0, 500) }, { status: 500 })
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// ROUTE 2 — Analyse existing scorecard (original logic, enhanced)
// ════════════════════════════════════════════════════════════════════════════════
async function handleAnalyse({ cardName, vision, strategie, objectives, projectName, projectTag }) {
  if (!objectives || objectives.length === 0) {
    return Response.json({ error: 'Aucun objectif fourni' }, { status: 400 })
  }

  const { byPerspective, perspScores } = computePerspScores(objectives)

  // ── Stats ──
  const totalObj   = objectives.length
  const atteints   = objectives.filter(o => o.status === 'atteint').length
  const enCours    = objectives.filter(o => o.status === 'en-cours').length
  const enRetard   = objectives.filter(o => o.status === 'en-retard').length
  const nonDefinis = objectives.filter(o => o.status === 'non-defini').length

  // ── Weighted global score ──
  const scored = objectives.filter(o => o.status !== 'non-defini')
  const totalWeight = scored.reduce((s, o) => s + (o.poids || 1), 0)
  const weightedScore = scored.length > 0
    ? Math.round(scored.reduce((s, o) => {
        const val = o.status === 'atteint' ? 1 : o.status === 'en-cours' ? 0.5 : 0
        return s + val * (o.poids || 1)
      }, 0) / totalWeight * 100)
    : null

  // ── Context block ──
  const contextLines = [
    projectName  && `Organisation / Projet : ${projectName}`,
    projectTag   && `Secteur : ${projectTag}`,
    vision       && `Vision stratégique : ${vision}`,
    strategie    && `Axes stratégiques : ${strategie}`,
  ].filter(Boolean).join('\n')

  // ── Objectives block ──
  const objectivesBlock = Object.entries(byPerspective).map(([key, objs]) => {
    return `
### Perspective "${PERSPECTIVE_LABELS[key] || key}" — Focus : ${PERSPECTIVE_FOCUS[key] || ''}
${objs.map((o, i) => `
${i + 1}. **${o.name}** (statut : ${STATUS_LABELS[o.status] || o.status}, poids : ${o.poids || 1}x)
   - KPI : ${o.kpi || 'non renseigné'}
   - Cible : ${o.cible ? `${o.cible}${o.unite ? ' ' + o.unite : ''}` : 'non définie'}
   - Valeur actuelle : ${o.valeurActuelle ? `${o.valeurActuelle}${o.unite ? ' ' + o.unite : ''}` : 'non renseignée'}
   ${o.responsable ? `- Responsable : ${o.responsable}` : ''}
   ${o.echeance ? `- Échéance : ${o.echeance}` : ''}
   ${o.description ? `- Contexte : ${o.description}` : ''}
`).join('')}`
  }).join('\n')

  const prompt = `Tu es un consultant senior en pilotage de la performance, expert des méthodologies Balanced Scorecard (BSC) de Kaplan & Norton.

${contextLines ? `## CONTEXTE STRATÉGIQUE\n${contextLines}\n` : ''}

## BALANCED SCORECARD : ${cardName}

### Vue d'ensemble du portefeuille d'objectifs :
- Total : ${totalObj} objectif(s) réparti(s) sur ${Object.keys(byPerspective).length} perspective(s)
- Atteints : ${atteints} | En cours : ${enCours} | En retard : ${enRetard} | Non définis : ${nonDefinis}
${weightedScore !== null ? `- Score global pondéré : ${weightedScore}%` : ''}
${Object.keys(perspScores).length > 0 ? `- Scores par perspective : ${Object.entries(perspScores).map(([k, v]) => `${PERSPECTIVE_LABELS[k]} ${v}%`).join(', ')}` : ''}

${objectivesBlock}

---

Génère une analyse BSC complète et actionnable. Réponds UNIQUEMENT en JSON valide avec cette structure exacte :

{
  "synthese": "Paragraphe de 3-5 phrases sur l'état d'ensemble du tableau de bord : équilibre entre perspectives, cohérence avec la vision/stratégie, points forts et zones de risque. Sois précis, évite les généralités.",

  "scoreParPerspective": {
    "finance": 0,
    "clients": 0,
    "processus": 0,
    "apprentissage": 0
  },

  "recommandations": [
    {
      "objectif": "nom exact de l'objectif",
      "perspective": "finance|clients|processus|apprentissage",
      "analyse": "2-3 phrases : analyse spécifique du statut actuel, des causes probables de retard ou succès, des leviers à activer.",
      "action": "Action prioritaire concrète et mesurable (max 10 mots)"
    }
  ],

  "alignement": "Paragraphe de 2-3 phrases sur la cohérence de cause à effet entre les 4 perspectives (apprentissage → processus → clients → finance) et les éventuelles lacunes de causalité dans le BSC actuel.",

  "priorites": [
    "Priorité #1 : action concrète avec impact attendu",
    "Priorité #2",
    "Priorité #3",
    "Priorité #4",
    "Priorité #5"
  ],

  "conclusion": "Phrase de synthèse percutante sur la trajectoire de performance et les prochaines étapes clés."
}

RÈGLES IMPÉRATIVES :
1. Dans "scoreParPerspective", utilise UNIQUEMENT les clés exactes : finance, clients, processus, apprentissage
   - Si une perspective n'a pas d'objectifs, mets 0
   - Sinon, évalue la maturité globale de la perspective (0-100%) en tenant compte des statuts ET de l'ambition des cibles
2. Dans "recommandations", inclus TOUS les objectifs dont le statut n'est pas "atteint", priorisés par impact stratégique
3. Les recommandations doivent être différenciées — pas de conseils génériques copiés de la théorie BSC
4. Si la vision/stratégie est fournie, vérifie explicitement l'alignement dans "alignement"
5. Identifie les déséquilibres entre perspectives (ex: trop d'objectifs financiers, manque d'apprentissage)
6. Les priorités doivent être ordonnées par urgence × impact, avec des actions concrètes`

  const response = await client.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 2500,
    messages:   [{ role: 'user', content: prompt }],
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

    result.scoreParPerspective = {
      finance:       perspScores.finance       ?? 0,
      clients:       perspScores.clients       ?? 0,
      processus:     perspScores.processus     ?? 0,
      apprentissage: perspScores.apprentissage ?? 0,
      ...(result.scoreParPerspective || {}),
    }

    result.recommandations = (result.recommandations || []).map(r => ({
      ...r,
      perspective: r.perspective || objectives.find(o => o.name === r.objectif)?.perspective || 'finance',
    }))
  } catch {
    result = {
      synthese: rawText.slice(0, 600),
      scoreParPerspective: {
        finance:       perspScores.finance       ?? 0,
        clients:       perspScores.clients       ?? 0,
        processus:     perspScores.processus     ?? 0,
        apprentissage: perspScores.apprentissage ?? 0,
      },
      recommandations: objectives
        .filter(o => o.status !== 'atteint')
        .map(o => ({
          objectif:    o.name,
          perspective: o.perspective || 'finance',
          analyse:     `L'objectif "${o.name}" est actuellement ${STATUS_LABELS[o.status]}. Un plan d'action structuré est nécessaire.`,
          action:      'Définir un plan d\'action avec jalons',
        })),
      alignement:  'Une analyse de l\'alignement entre perspectives nécessite une revue manuelle des relations de cause à effet.',
      priorites: [
        'Définir des KPIs mesurables pour tous les objectifs non définis',
        'Prioriser les objectifs en retard à fort impact stratégique',
        'Renforcer la perspective Apprentissage comme fondation',
        'Mettre en place un cycle de revue mensuel du BSC',
        'Assigner un responsable à chaque objectif sans pilote',
      ],
      conclusion: 'La mise en œuvre rigoureuse du BSC nécessite un engagement de la direction et un suivi régulier des indicateurs.',
    }
  }

  return Response.json({ success: true, result })
}