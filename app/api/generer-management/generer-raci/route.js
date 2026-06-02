import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const ROLE_META = {
  R: { label: 'Responsible', fr: 'Responsable', desc: 'Réalise la tâche',              color: '#6366f1' },
  A: { label: 'Accountable', fr: 'Réalise',     desc: 'Rend compte du résultat',       color: '#f59e0b' },
  C: { label: 'Consulted',   fr: 'Consulté',    desc: 'Consulté avant/pendant',        color: '#34d399' },
  I: { label: 'Informed',    fr: 'Informé',     desc: 'Informé du résultat',           color: '#94a3b8' },
}

const PHASE_OPTIONS = ['Initiation', 'Planification', 'Exécution', 'Contrôle', 'Clôture', 'Général']

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
    console.error('RACI API error:', err)
    return Response.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// ROUTE 1 — Generate full RACI matrix from free-text project description
// ════════════════════════════════════════════════════════════════════════════════
async function handleGenerate({ description, analysisName, projectName, projectTag }) {
  if (!description?.trim()) {
    return Response.json({ error: 'Description requise' }, { status: 400 })
  }

  const prompt = `Tu es un consultant senior en management de projet, expert des matrices RACI et de la gouvernance organisationnelle.

L'utilisateur décrit son projet en langage naturel. Tu dois construire une matrice RACI complète et opérationnelle.

## ENTRÉE UTILISATEUR
${projectName   ? `Projet/Organisation : ${projectName}` : ''}
${projectTag    ? `Secteur : ${projectTag}` : ''}
${analysisName  ? `Nom de l'analyse : ${analysisName}` : ''}
Description : ${description}

## CONSIGNES
- Identifie 4 à 8 acteurs clés (personnes ou rôles) adaptés au contexte
- Identifie 8 à 16 tâches ou livrables clés, regroupées par phase
- Assigne des rôles RACI cohérents pour chaque croisement tâche×acteur
- Respecte les règles RACI : un seul A par tâche, au moins un R par tâche
- Chaque acteur doit avoir au moins une assignation
- Adapte le vocabulaire et les rôles au secteur/contexte détecté

Phases disponibles : Initiation, Planification, Exécution, Contrôle, Clôture, Général

Rôles RACI :
- R (Responsible) : réalise la tâche
- A (Accountable) : valide et rend compte — UN SEUL PAR TÂCHE
- C (Consulted) : consulté avant/pendant
- I (Informed) : informé du résultat

Réponds UNIQUEMENT en JSON valide :

{
  "context": "Résumé du contexte détecté en 1-2 phrases",
  "actors": [
    { "id": "actor_1", "label": "Nom court", "role": "Rôle ou poste" }
  ],
  "tasks": [
    { "id": "task_1", "label": "Nom de la tâche", "phase": "Initiation|Planification|Exécution|Contrôle|Clôture|Général", "desc": "Description courte optionnelle" }
  ],
  "matrix": {
    "task_1": { "actor_1": "R", "actor_2": "A", "actor_3": "C" }
  },
  "synthese": "Paragraphe de 2-3 phrases expliquant la logique de gouvernance choisie et les points d'attention de cette matrice."
}

RÈGLES STRICTES :
1. Chaque tâche doit avoir EXACTEMENT UN rôle A et AU MOINS UN rôle R
2. Les IDs doivent être simples et uniques : actor_1, actor_2... task_1, task_2...
3. Dans "matrix", ne renseigner que les cases non vides (omettre les croisements sans rôle)
4. Les rôles sont UNIQUEMENT "R", "A", "C" ou "I"
5. Génère un minimum de 6 acteurs et 10 tâches`

  const response = await client.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 3000,
    messages:   [{ role: 'user', content: prompt }],
  })

  const rawText = response.content.filter(b => b.type === 'text').map(b => b.text).join('')

  try {
    const m = rawText.match(/\{[\s\S]*\}/)
    if (!m) throw new Error('Pas de JSON')
    const parsed = JSON.parse(m[0])

    // Re-inject guaranteed unique IDs and remap matrix keys
    const actorIdMap = {}
    const actors = (parsed.actors || []).map((a, i) => {
      const newId = uid()
      actorIdMap[a.id] = newId
      return { ...a, id: newId }
    })

    const taskIdMap = {}
    const tasks = (parsed.tasks || []).map((t, i) => {
      const newId = uid()
      taskIdMap[t.id] = newId
      return { ...t, id: newId }
    })

    // Remap matrix with new IDs
    const matrix = {}
    for (const [oldTaskId, actorRoles] of Object.entries(parsed.matrix || {})) {
      const newTaskId = taskIdMap[oldTaskId]
      if (!newTaskId) continue
      matrix[newTaskId] = {}
      for (const [oldActorId, role] of Object.entries(actorRoles || {})) {
        const newActorId = actorIdMap[oldActorId]
        if (newActorId && ['R', 'A', 'C', 'I'].includes(role)) {
          matrix[newTaskId][newActorId] = role
        }
      }
    }

    return Response.json({ success: true, result: { context: parsed.context || '', actors, tasks, matrix, synthese: parsed.synthese || '' } })
  } catch (parseErr) {
    return Response.json({ error: 'Erreur de parsing IA', raw: rawText.slice(0, 400) }, { status: 500 })
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// ROUTE 2 — Analyse existing RACI matrix
// ════════════════════════════════════════════════════════════════════════════════
async function handleAnalyse({ analysisName, context, tasks, actors, matrix, projectName, projectTag }) {
  if (!tasks?.length || !actors?.length) {
    return Response.json({ error: 'Tâches et acteurs requis' }, { status: 400 })
  }

  // Stats
  const stats = {}
  for (const actor of actors) {
    stats[actor.id] = { R: 0, A: 0, C: 0, I: 0, total: 0 }
    for (const task of tasks) {
      const role = matrix?.[task.id]?.[actor.id]
      if (role) { stats[actor.id][role]++; stats[actor.id].total++ }
    }
  }

  const tasksNoA    = tasks.filter(t => !actors.some(a => matrix?.[t.id]?.[a.id] === 'A')).map(t => t.label)
  const tasksNoR    = tasks.filter(t => !actors.some(a => matrix?.[t.id]?.[a.id] === 'R')).map(t => t.label)
  const overloaded  = actors.filter(a => stats[a.id].R > tasks.length * 0.5).map(a => a.label)
  const idle        = actors.filter(a => stats[a.id].total === 0).map(a => a.label)

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
  "synthese": "3-4 phrases sur la qualité globale de la matrice RACI : clarté des responsabilités, équilibre de la charge, risques de gouvernance.",

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
      "diagnostic": "1-2 phrases sur la charge et le rôle de cet acteur.",
      "alerte": "surcharge|sous-utilisation|confusion_roles|ok",
      "suggestion": "Suggestion d'ajustement si nécessaire"
    }
  ],

  "bonnes_pratiques": ["Ce qui fonctionne bien #1", "Bonne pratique #2"],

  "optimisations": [
    {
      "priorite": "haute|moyenne|faible",
      "titre": "Titre court",
      "description": "Description actionnable : quoi changer, où, comment, impact attendu."
    }
  ],

  "score_gouvernance": {
    "note": 7,
    "sur": 10,
    "commentaire": "Justification courte du score."
  },

  "conclusion": "Phrase stratégique mémorable sur la maturité de gouvernance."
}

RÈGLES : Un seul A par tâche | Signale les confusions R=A sur même personne | Évalue les acteurs passifs (uniquement C/I)`

  const response = await client.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 2000,
    messages:   [{ role: 'user', content: prompt }],
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
}