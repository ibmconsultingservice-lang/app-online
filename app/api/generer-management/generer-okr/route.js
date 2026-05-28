import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

// ── Helpers ───────────────────────────────────────────────────────────────────
const calcProgress = (current, target) => {
  const c = parseFloat(current), t = parseFloat(target)
  if (!t || isNaN(c) || isNaN(t)) return 0
  return Math.min(100, Math.round((c / t) * 100))
}

const avgProgress = (krs = []) => {
  if (!krs.length) return 0
  return Math.round(krs.reduce((s, kr) => s + calcProgress(kr.current, kr.target), 0) / krs.length)
}

const STATUS_LABELS = {
  on_track:    'On Track',
  at_risk:     'At Risk',
  off_track:   'Off Track',
  completed:   'Complété',
  not_started: 'Non démarré',
}

const LEVEL_LABELS = {
  company:  'Entreprise',
  team:     'Équipe',
  personal: 'Individuel',
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { analysisName, context, objectives, projectName, projectTag } = body

    if (!objectives || objectives.length === 0) {
      return Response.json({ error: 'Aucun objectif fourni' }, { status: 400 })
    }

    // ── Enrich objectives with computed metrics ────────────────────────────
    const enriched = objectives.map(obj => {
      const krs         = obj.keyResults || []
      const progress    = avgProgress(krs)
      const completedKR = krs.filter(kr => calcProgress(kr.current, kr.target) >= 100).length
      return {
        ...obj,
        computedProgress: progress,
        completedKR,
        totalKR: krs.length,
        levelLabel:  LEVEL_LABELS[obj.level]  || obj.level,
        statusLabel: STATUS_LABELS[obj.status] || obj.status,
      }
    })

    // ── Global stats ──────────────────────────────────────────────────────
    const totalObjs      = objectives.length
    const globalProgress = Math.round(enriched.reduce((s, o) => s + o.computedProgress, 0) / totalObjs)
    const completedObjs  = enriched.filter(o => o.computedProgress >= 100).length
    const onTrackObjs    = enriched.filter(o => o.status === 'on_track').length
    const atRiskObjs     = enriched.filter(o => o.status === 'at_risk').length
    const offTrackObjs   = enriched.filter(o => o.status === 'off_track' || (o.computedProgress < 40 && o.status !== 'not_started')).length
    const totalKRs       = enriched.reduce((s, o) => s + o.totalKR, 0)

    const contextLines = [
      projectName && `Entreprise / Projet : ${projectName}`,
      projectTag  && `Secteur : ${projectTag}`,
      context     && `Contexte du cycle : ${context}`,
    ].filter(Boolean).join('\n')

    // ── Prompt ────────────────────────────────────────────────────────────
    const prompt = `Tu es un expert en management par les OKR (Objectives & Key Results), coach de performance organisationnelle.

${contextLines ? `## CONTEXTE\n${contextLines}\n` : ''}

## CYCLE OKR : ${analysisName}

### Vue d'ensemble du cycle
- ${totalObjs} objectif(s) · ${totalKRs} Key Result(s)
- Progression globale : ${globalProgress}%
- Complétés : ${completedObjs} · On Track : ${onTrackObjs} · At Risk : ${atRiskObjs} · Off Track : ${offTrackObjs}

### Détail des objectifs :

${enriched.map((obj, i) => `
**OBJECTIF ${i+1} — ${obj.title}** [${obj.levelLabel}]
- Période : ${obj.period} ${obj.year || ''}
- Statut : ${obj.statusLabel}
- Progression calculée : ${obj.computedProgress}%
- Key Results : ${obj.totalKR} total · ${obj.completedKR} complété(s)
${obj.description ? `- Description : ${obj.description}` : ''}

${(obj.keyResults || []).length > 0 ? `Key Results :\n${(obj.keyResults || []).map((kr, j) => {
  const kprog = calcProgress(kr.current, kr.target)
  return `  KR${j+1}: ${kr.title}
  → Actuel: ${kr.current || 0}${kr.unit || ''} / Cible: ${kr.target || '?'}${kr.unit || ''} (${kprog}%)${kr.metric ? ` — Métrique: ${kr.metric}` : ''}${kr.notes ? `\n  Note: ${kr.notes}` : ''}`
}).join('\n')}` : '  Aucun Key Result défini.'}
`).join('\n---\n')}

---

Génère une analyse OKR stratégique et actionnable. Réponds UNIQUEMENT en JSON valide avec cette structure exacte :

{
  "synthese": "Paragraphe de 4-6 phrases sur la santé globale du cycle OKR. Évalue l'ambition des objectifs, la qualité des KRs (SMART ?), l'alignement entre niveaux (entreprise/équipe/individuel), les risques principaux, et la trajectoire globale. Sois direct et précis.",

  "objectifs": [
    {
      "titre": "titre exact de l'objectif",
      "score": 0-100,
      "analyse": "Analyse de 2-3 phrases : qualité de la formulation, réalisme des KRs, risques spécifiques, points forts.",
      "suggestion": "Suggestion concrète et immédiatement applicable pour améliorer cet objectif ou ses KRs (max 30 mots)"
    }
  ],

  "krs_suggeres": [
    {
      "objectif": "titre de l'objectif concerné",
      "kr": "Nouveau KR suggéré par l'IA car manquant ou faible",
      "cible": "valeur cible suggérée avec unité"
    }
  ],

  "priorites": [
    "Action prioritaire #1 concrète, urgente et mesurable",
    "Action prioritaire #2",
    "Action prioritaire #3",
    "Action prioritaire #4",
    "Action prioritaire #5"
  ],

  "conclusion": "Phrase de conclusion percutante sur la trajectoire du cycle et l'ajustement principal à opérer."
}

RÈGLES IMPÉRATIVES :
- Évalue chaque objectif individuellement avec son vrai score (basé sur la progression des KRs et leur qualité)
- Les KRs suggérés ne concernent que les objectifs ayant 0 KR ou des KRs mal formulés (non mesurables)
- Les priorités doivent être ordonnées par impact décroissant
- Tiens compte du niveau (Entreprise > Équipe > Individuel) pour évaluer la cohérence verticale
- Si des objectifs n'ont pas de KRs, signale-le explicitement comme risque majeur
- Un bon OKR a 3-5 KRs mesurables avec baseline et cible claires
- Identifie les dépendances et conflits potentiels entre objectifs`

    // ── Call Claude ────────────────────────────────────────────────────────
    const response = await client.messages.create({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 2500,
      messages: [{ role: 'user', content: prompt }],
    })

    // ── Parse ──────────────────────────────────────────────────────────────
    const rawText = response.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('')

    let result
    try {
      const match = rawText.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('Pas de JSON')
      result = JSON.parse(match[0])

      // Ensure objectifs array matches input order
      if (!result.objectifs || result.objectifs.length !== enriched.length) {
        result.objectifs = enriched.map((obj, i) => ({
          titre:      obj.title,
          score:      obj.computedProgress,
          analyse:    result.objectifs?.[i]?.analyse || `Progression : ${obj.computedProgress}%. ${obj.totalKR} KR(s) défini(s).`,
          suggestion: result.objectifs?.[i]?.suggestion || (obj.totalKR === 0 ? 'Ajoutez des Key Results mesurables pour cet objectif.' : ''),
        }))
      }
    } catch {
      // Fallback
      result = {
        synthese: `Cycle OKR "${analysisName}" avec ${totalObjs} objectifs à ${globalProgress}% de progression globale. ${atRiskObjs + offTrackObjs > 0 ? `${atRiskObjs + offTrackObjs} objectif(s) nécessitent une attention urgente.` : 'La trajectoire globale est satisfaisante.'}`,
        objectifs: enriched.map(obj => ({
          titre:      obj.title,
          score:      obj.computedProgress,
          analyse:    `Progression de ${obj.computedProgress}% avec ${obj.totalKR} Key Result(s). Statut : ${obj.statusLabel}.`,
          suggestion: obj.totalKR === 0 ? 'Définissez des Key Results mesurables pour suivre la progression.' : '',
        })),
        krs_suggeres: enriched.filter(o => o.totalKR === 0).map(o => ({
          objectif: o.title,
          kr:       'Définir un indicateur de succès mesurable',
          cible:    'À définir selon contexte',
        })),
        priorites: [
          'Définir des KRs pour tous les objectifs sans métriques',
          'Mettre à jour les valeurs actuelles des KRs en retard',
          'Réviser les objectifs Off Track avec les équipes concernées',
          'Aligner les OKRs individuels sur les priorités entreprise',
          'Planifier une revue hebdomadaire de la progression',
        ],
        conclusion: 'La rigueur dans le suivi des Key Results est la clé du succès de ce cycle OKR.',
      }
    }

    return Response.json({ success: true, result })

  } catch (err) {
    console.error('OKR API error:', err)
    return Response.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}