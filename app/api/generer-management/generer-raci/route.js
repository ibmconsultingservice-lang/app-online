import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const ROLE_META = {
  R: { label: 'Responsible',  fr: 'Responsable',  desc: 'Réalise la tâche',                    color: '#6366f1' },
  A: { label: 'Accountable',  fr: 'Réalise',       desc: 'Rend compte du résultat, valide',      color: '#f59e0b' },
  C: { label: 'Consulted',    fr: 'Consulté',      desc: 'Consulté avant / pendant la tâche',   color: '#34d399' },
  I: { label: 'Informed',     fr: 'Informé',       desc: 'Informé du résultat',                  color: '#94a3b8' },
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { analysisName, context, tasks, actors, matrix, projectName, projectTag } = body

    if (!tasks?.length || !actors?.length) {
      return Response.json({ error: 'Tâches et acteurs requis' }, { status: 400 })
    }

    // ── Build summary stats ──
    const stats = {}
    for (const actor of actors) {
      stats[actor.id] = { R: 0, A: 0, C: 0, I: 0, total: 0 }
      for (const task of tasks) {
        const role = matrix?.[task.id]?.[actor.id]
        if (role) { stats[actor.id][role]++; stats[actor.id].total++ }
      }
    }

    // Tasks with no Accountable (A)
    const tasksNoA = tasks.filter(t => !actors.some(a => matrix?.[t.id]?.[a.id] === 'A')).map(t => t.label)
    // Tasks with no Responsible (R)
    const tasksNoR = tasks.filter(t => !actors.some(a => matrix?.[t.id]?.[a.id] === 'R')).map(t => t.label)
    // Overloaded actors (many R)
    const overloaded = actors.filter(a => stats[a.id].R > tasks.length * 0.5).map(a => a.label)
    // Actors with 0 assignments
    const idle = actors.filter(a => stats[a.id].total === 0).map(a => a.label)

    const contextLines = [
      projectName && `Entreprise / Projet : ${projectName}`,
      projectTag  && `Secteur : ${projectTag}`,
      context     && `Contexte : ${context}`,
    ].filter(Boolean).join('\n')

    const matrixText = tasks.map(t => {
      const row = actors.map(a => {
        const role = matrix?.[t.id]?.[a.id]
        return `${a.label}: ${role || '—'}`
      }).join(' | ')
      return `• ${t.label} [${t.phase || 'général'}] : ${row}`
    }).join('\n')

    const actorStats = actors.map(a => {
      const s = stats[a.id]
      return `• ${a.label} (${a.role || 'sans rôle'}) : R×${s.R} A×${s.A} C×${s.C} I×${s.I}`
    }).join('\n')

    const prompt = `Tu es un consultant en management de projet senior, expert des matrices RACI et de la gouvernance organisationnelle.

${contextLines ? `## CONTEXTE\n${contextLines}\n` : ''}

## ANALYSE RACI : ${analysisName}

### Matrice (${tasks.length} tâches × ${actors.length} acteurs) :
${matrixText}

### Répartition par acteur :
${actorStats}

### Anomalies détectées :
- Tâches sans Accountable (A) : ${tasksNoA.length > 0 ? tasksNoA.join(', ') : 'Aucune ✓'}
- Tâches sans Responsible (R) : ${tasksNoR.length > 0 ? tasksNoR.join(', ') : 'Aucune ✓'}
- Acteurs surchargés (>50% de R) : ${overloaded.length > 0 ? overloaded.join(', ') : 'Aucun ✓'}
- Acteurs sans assignation : ${idle.length > 0 ? idle.join(', ') : 'Aucun ✓'}

---

Génère une analyse RACI stratégique. Réponds UNIQUEMENT en JSON valide :

{
  "synthese": "3-4 phrases sur la qualité globale de la matrice RACI : clarté des responsabilités, équilibre de la charge, risques de gouvernance identifiés.",

  "anomalies": [
    {
      "type": "missing_a|missing_r|overload|idle|multi_a|confusion",
      "severite": "haute|moyenne|faible",
      "description": "Description précise de l'anomalie",
      "taches_concernees": ["tâche1"],
      "acteurs_concernes": ["acteur1"],
      "recommandation": "Action corrective courte et concrète"
    }
  ],

  "acteurs": [
    {
      "id": "id exact de l'acteur",
      "diagnostic": "1-2 phrases sur la charge et le rôle de cet acteur dans la matrice.",
      "alerte": "surcharge|sous-utilisation|confusion_roles|ok",
      "suggestion": "Suggestion d'ajustement courte si nécessaire"
    }
  ],

  "bonnes_pratiques": [
    "Ce qui fonctionne bien dans cette matrice #1",
    "Bonne pratique #2 si pertinent"
  ],

  "optimisations": [
    {
      "priorite": "haute|moyenne|faible",
      "titre": "Titre court de l'optimisation",
      "description": "Description actionnable : quoi changer, où, comment, impact attendu."
    }
  ],

  "score_gouvernance": {
    "note": 7,
    "sur": 10,
    "commentaire": "Justification courte du score."
  },

  "conclusion": "Phrase stratégique mémorable sur la maturité de gouvernance de ce projet."
}

RÈGLES :
- Une tâche ne doit avoir qu'UN SEUL A (Accountable) — signale tout doublon
- R peut être multiple mais surveille la surcharge
- Identifie les zones floues où R et A sont confondus sur la même personne (risque de contrôle)
- Si un acteur est toujours C ou I et jamais R/A, questionne son utilité dans la matrice
- Score de gouvernance : 10 = matrice parfaite, 1 = chaos total`

    const response = await client.messages.create({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })

    const rawText = response.content.filter(b => b.type === 'text').map(b => b.text).join('')

    let result
    try {
      const m = rawText.match(/\{[\s\S]*\}/)
      if (!m) throw new Error('No JSON')
      result = JSON.parse(m[0])
    } catch {
      result = {
        synthese: rawText.slice(0, 400),
        anomalies: [],
        acteurs: actors.map(a => ({ id: a.id, diagnostic: `${a.label} — analyse non disponible.`, alerte: 'ok', suggestion: '' })),
        bonnes_pratiques: [],
        optimisations: [],
        score_gouvernance: { note: 5, sur: 10, commentaire: 'Analyse partielle.' },
        conclusion: 'Une révision manuelle de la matrice est recommandée.',
      }
    }

    return Response.json({ success: true, result, stats, anomaliesCount: { tasksNoA: tasksNoA.length, tasksNoR: tasksNoR.length, overloaded: overloaded.length, idle: idle.length } })

  } catch (err) {
    console.error('RACI API error:', err)
    return Response.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}