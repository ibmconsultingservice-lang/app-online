import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()
const uid    = () => `${Date.now()}-${Math.random().toString(36).slice(2,7)}`

// ── Helpers ───────────────────────────────────────────────────
const calcProgress = (current, target) => {
  const c = parseFloat(current), t = parseFloat(target)
  if (!t || isNaN(c) || isNaN(t)) return 0
  return Math.min(100, Math.round((c / t) * 100))
}
const avgProgress = (krs = []) => {
  if (!krs.length) return 0
  return Math.round(krs.reduce((s, kr) => s + calcProgress(kr.current, kr.target), 0) / krs.length)
}
const inferStatus = (p) => {
  if (p >= 100) return 'completed'
  if (p >= 70)  return 'on_track'
  if (p >= 40)  return 'at_risk'
  if (p > 0)    return 'off_track'
  return 'not_started'
}

const PERIODS = ['Q1','Q2','Q3','Q4','H1','H2','Annuel']
const LEVELS  = { company:'Entreprise', team:'Équipe', personal:'Individuel' }

export async function POST(request) {
  try {
    const body = await request.json()
    const { mode, cycleName, context, objective: cycleObjective, objectives, projectName, projectTag, year } = body

    // ═══════════════════════════════════════════════════════
    // MODE 1 — GENERATE: IA crée tout le cycle OKR de zéro
    // ═══════════════════════════════════════════════════════
    if (mode === 'generate') {
      if (!context?.trim()) {
        return Response.json({ error: 'Contexte requis pour la génération automatique' }, { status: 400 })
      }

      const currentYear = year || new Date().getFullYear()

      const prompt = `Tu es un expert OKR (Objectives & Key Results) certifié, coach de performance organisationnelle.
À partir du contexte fourni, génère un cycle OKR complet, ambitieux et réaliste.

## CONTEXTE
${projectName ? `Organisation : ${projectName}` : ''}
${projectTag  ? `Secteur : ${projectTag}` : ''}
Nom du cycle : ${cycleName || 'Cycle OKR'}
${cycleObjective ? `Vision / Ambition : ${cycleObjective}` : ''}
Description : ${context}
Année : ${currentYear}

Génère exactement ce JSON (sans markdown, sans backticks) :
{
  "objectives": [
    {
      "title": "Objectif ambitieux et inspirant (commence par un verbe)",
      "description": "Contexte et raison d'être de cet objectif en 1-2 phrases",
      "level": "company",
      "period": "Q1",
      "year": "${currentYear}",
      "status": "not_started",
      "keyResults": [
        {
          "title": "KR mesurable et spécifique",
          "metric": "Nom de la métrique",
          "target": "100",
          "current": "0",
          "unit": "%",
          "status": "not_started",
          "notes": "Comment mesurer ce KR"
        }
      ]
    }
  ],
  "synthese": "Paragraphe de 3-5 phrases sur la logique du cycle OKR généré, l'ambition globale et la cohérence entre objectifs.",
  "priorites": [
    "Priorité #1 pour réussir ce cycle",
    "Priorité #2",
    "Priorité #3",
    "Priorité #4",
    "Priorité #5"
  ],
  "conclusion": "Phrase d'encouragement et de cadrage sur la trajectoire recommandée.",
  "healthScore": 75
}

RÈGLES IMPÉRATIVES :
- Génère 3 à 5 objectifs RÉALISTES et AMBITIEUX, adaptés au contexte
- Répartis les niveaux : au moins 1 "company", 1 "team", 1 "personal"
- Chaque objectif doit avoir 3 à 5 Key Results MESURABLES (cible numérique obligatoire)
- Les KRs doivent avoir target > 0, current = 0, et une unité claire (%, k€, users, pts, etc.)
- Les objectifs commencent par un verbe d'action fort (Atteindre, Lancer, Accroître, Construire…)
- period: répartis entre Q1, Q2, Q3, Q4 selon la logique temporelle
- level: "company" | "team" | "personal"
- status: "not_started" pour tous (cycle démarrant)
- Adapte TOUT au secteur et contexte fourni — PAS de contenu générique
- healthScore: entre 60-85 (nouveau cycle)
- La "metric" du KR = le nom court de l'indicateur (NPS, MAU, CA, Taux, Score…)`

      const response = await client.messages.create({
        model:      'claude-sonnet-4-20250514',
        max_tokens: 3500,
        messages:   [{ role:'user', content: prompt }],
      })

      const rawText  = response.content.filter(b => b.type==='text').map(b => b.text).join('')
      const match    = rawText.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('Réponse IA invalide — pas de JSON')

      const result = JSON.parse(match[0])

      // Add IDs + compute status from KRs
      const objectivesWithIds = (result.objectives || []).map(obj => ({
        ...obj,
        id:         uid(),
        createdAt:  new Date().toISOString(),
        keyResults: (obj.keyResults || []).map(kr => ({
          ...kr,
          id:     uid(),
          status: inferStatus(calcProgress(kr.current, kr.target)),
        })),
        status: 'not_started',
      }))

      return Response.json({
        success:    true,
        mode:       'generate',
        objectives: objectivesWithIds,
        analysis: {
          synthese:    result.synthese,
          priorites:   result.priorites,
          conclusion:  result.conclusion,
          healthScore: result.healthScore || 72,
          objectifs:   objectivesWithIds.map(obj => ({
            titre:      obj.title,
            score:      0,
            analyse:    `Objectif généré avec ${obj.keyResults.length} Key Result(s). Démarrez le suivi en mettant à jour les valeurs actuelles.`,
            suggestion: `Vérifiez que la cible de chaque KR est réaliste et que les données de mesure sont disponibles.`,
          })),
          krs_suggeres: [],
        }
      })
    }

    // ═══════════════════════════════════════════════════════
    // MODE 2 — ANALYSE: IA analyse les objectifs existants
    // ═══════════════════════════════════════════════════════
    if (mode === 'analyse') {
      if (!objectives?.length) {
        return Response.json({ error: 'Aucun objectif à analyser' }, { status: 400 })
      }

      const enriched = objectives.map(obj => ({
        ...obj,
        computedProgress: avgProgress(obj.keyResults || []),
        completedKR:     (obj.keyResults||[]).filter(kr => calcProgress(kr.current,kr.target) >= 100).length,
        totalKR:         (obj.keyResults||[]).length,
        levelLabel:      LEVELS[obj.level] || obj.level,
      }))

      const totalObjs      = objectives.length
      const globalProgress = Math.round(enriched.reduce((s,o) => s + o.computedProgress, 0) / totalObjs)
      const completedObjs  = enriched.filter(o => o.computedProgress >= 100).length
      const onTrackObjs    = enriched.filter(o => o.status === 'on_track').length
      const atRiskObjs     = enriched.filter(o => o.status === 'at_risk').length
      const offTrackObjs   = enriched.filter(o => ['off_track'].includes(o.status)).length
      const totalKRs       = enriched.reduce((s,o) => s + o.totalKR, 0)
      const noKR           = enriched.filter(o => o.totalKR === 0).length

      const ctxLines = [
        projectName     && `Organisation : ${projectName}`,
        projectTag      && `Secteur : ${projectTag}`,
        context         && `Contexte : ${context}`,
        cycleObjective  && `Ambition : ${cycleObjective}`,
      ].filter(Boolean).join('\n')

      const prompt = `Tu es un expert OKR certifié, coach de performance organisationnelle.
Analyse ce cycle OKR et fournis des recommandations stratégiques actionnables.

## CONTEXTE
${ctxLines || 'Non renseigné'}
Cycle : "${cycleName}"

## SYNTHÈSE DU CYCLE
- ${totalObjs} objectif(s) · ${totalKRs} Key Result(s)
- Progression globale : ${globalProgress}%
- On Track : ${onTrackObjs} · At Risk : ${atRiskObjs} · Off Track : ${offTrackObjs} · Complétés : ${completedObjs}
${noKR > 0 ? `⚠ ${noKR} objectif(s) SANS Key Result défini` : ''}

## DÉTAIL DES OBJECTIFS

${enriched.map((obj, i) => `
**OBJ ${i+1} — ${obj.title}** [${obj.levelLabel} · ${obj.period} ${obj.year || ''}]
- Statut : ${obj.status} · Progression : ${obj.computedProgress}%
- KRs : ${obj.totalKR} total · ${obj.completedKR} complété(s)
${obj.description ? `- Description : ${obj.description}` : ''}
${(obj.keyResults||[]).length > 0 ? `\nKey Results :\n${(obj.keyResults||[]).map((kr,j) => {
  const p = calcProgress(kr.current, kr.target)
  return `  KR${j+1}: ${kr.title}\n  → ${kr.current||0}${kr.unit||''} / ${kr.target||'?'}${kr.unit||''} (${p}%)${kr.metric ? ` — ${kr.metric}` : ''}${kr.notes ? `\n  Note: ${kr.notes}` : ''}`
}).join('\n')}` : '\n  ⚠ Aucun Key Result défini'}`
).join('\n---\n')}

Génère exactement ce JSON (sans markdown, sans backticks) :
{
  "synthese": "Paragraphe de 4-6 phrases sur la santé du cycle. Évalue ambition, qualité des KRs, alignement vertical, risques, trajectoire. Sois direct.",
  "objectifs": [
    {
      "titre": "titre exact de l'objectif",
      "score": 0,
      "analyse": "Analyse de 2-3 phrases : qualité formulation, réalisme KRs, risques, points forts.",
      "suggestion": "Suggestion concrète et immédiate (max 25 mots)"
    }
  ],
  "krs_suggeres": [
    {
      "objectif": "titre objectif concerné",
      "kr": "Nouveau KR suggéré car manquant ou faible",
      "cible": "valeur cible avec unité"
    }
  ],
  "priorites": [
    "Action urgente #1 avec horizon temporel si possible",
    "Action #2",
    "Action #3",
    "Action #4",
    "Action #5"
  ],
  "conclusion": "Phrase de synthèse mémorable sur la trajectoire et l'ajustement principal.",
  "healthScore": 65
}

RÈGLES :
- objectifs array = EXACTEMENT ${totalObjs} éléments dans le même ordre
- score par objectif = 0-100 basé sur progression KRs + qualité formulation
- krs_suggeres uniquement pour objectifs sans KR ou KRs non mesurables
- priorites ordonnées par impact × urgence décroissant
- healthScore reflète l'état réel du cycle (pas forcément positif)
- Identifie les dépendances et conflits potentiels`

      const response = await client.messages.create({
        model:      'claude-sonnet-4-20250514',
        max_tokens: 2500,
        messages:   [{ role:'user', content: prompt }],
      })

      const rawText = response.content.filter(b => b.type==='text').map(b => b.text).join('')
      const match   = rawText.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('Réponse IA invalide')

      let result = JSON.parse(match[0])

      // Ensure objectifs length matches
      if (!result.objectifs || result.objectifs.length !== enriched.length) {
        result.objectifs = enriched.map((obj, i) => ({
          titre:      obj.title,
          score:      obj.computedProgress,
          analyse:    result.objectifs?.[i]?.analyse || `Progression : ${obj.computedProgress}%. ${obj.totalKR} KR(s).`,
          suggestion: result.objectifs?.[i]?.suggestion || (obj.totalKR === 0 ? 'Ajoutez des Key Results mesurables.' : ''),
        }))
      }

      return Response.json({ success: true, mode: 'analyse', analysis: result })
    }

    return Response.json({ error: 'Mode invalide (generate|analyse)' }, { status: 400 })

  } catch (err) {
    console.error('OKR API error:', err)
    return Response.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}