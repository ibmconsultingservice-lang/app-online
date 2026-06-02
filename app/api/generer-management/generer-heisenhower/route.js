import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const SYSTEM_PROMPT = `Tu es un expert senior en productivité, gestion du temps et méthode Eisenhower.
Tu reçois une liste de tâches déjà classifiées dans la matrice d'Eisenhower et tu fournis une analyse stratégique complète avec recommandations actionnables.

RÈGLES ABSOLUES :
- Réponds UNIQUEMENT avec du JSON valide, sans backticks, sans texte avant ou après.
- Sois précis, concret, personnalisé au contexte fourni.
- Identifie les problèmes réels : trop de Q1 (mauvaise anticipation ?), trop de Q3 (mauvaise délégation ?)...
- health_score entre 0 et 100.
- Les reclassifications doivent être justifiées avec des critères précis.

FORMAT DE RÉPONSE (JSON strict) :
{
  "health_score": 72,
  "health_label": "Critique | Fragile | Acceptable | Bon | Excellent",
  "executive_summary": "string (3-5 phrases : état global, pattern identifié, risque principal, priorité d'action)",

  "quadrant_analysis": {
    "Q1": { "count": 3, "assessment": "string", "risk": "Faible | Modéré | Élevé", "advice": "string" },
    "Q2": { "count": 5, "assessment": "string", "risk": "Faible | Modéré | Élevé", "advice": "string" },
    "Q3": { "count": 4, "assessment": "string", "risk": "Faible | Modéré | Élevé", "advice": "string" },
    "Q4": { "count": 2, "assessment": "string", "risk": "Faible | Modéré | Élevé", "advice": "string" }
  },

  "reclassifications": [
    {
      "task_id": "string",
      "task_title": "string",
      "current_quadrant": "Q1",
      "suggested_quadrant": "Q2",
      "justification": "string (pourquoi ce reclassement améliore la priorisation)",
      "confidence": "Haute | Moyenne | Faible"
    }
  ],

  "time_analysis": {
    "total_estimated_minutes": 0,
    "Q1_minutes": 0,
    "Q2_minutes": 0,
    "Q3_minutes": 0,
    "Q4_minutes": 0,
    "overload_risk": "Faible | Modéré | Élevé | Critique",
    "comment": "string (analyse de la charge temporelle)"
  },

  "patterns": [
    { "pattern": "string (comportement ou tendance identifié)", "impact": "Positif | Négatif | Neutre", "action": "string" }
  ],

  "action_plan": {
    "today": ["string", "string"],
    "this_week": ["string", "string"],
    "this_month": ["string", "string"],
    "eliminate_now": ["string (titre de tâche Q4 à supprimer)"]
  },

  "delegation_map": [
    { "task_id": "string", "task_title": "string", "suggest_to": "string (rôle/profil)", "rationale": "string" }
  ],

  "productivity_tips": ["string", "string", "string"],

  "kpis": [
    { "metric": "string", "current": "string", "target": "string", "timeline": "string" }
  ],

  "conclusion": "string (verdict final et recommandation principale — 2 phrases percutantes)"
}`

export async function POST(request) {
  try {
    const body = await request.json()
    const { tasks, projectName, projectContext } = body

    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return Response.json({ error: 'Aucune tâche à analyser.' }, { status: 400 })
    }

    // Build context
    const Q = { Q1: [], Q2: [], Q3: [], Q4: [] }
    tasks.forEach(t => { if (Q[t.quadrant]) Q[t.quadrant].push(t) })

    const totalTime = tasks.reduce((s, t) => s + (t.estimatedTime || 0), 0)

    const tasksDetail = tasks.map(t =>
      `- [${t.quadrant}] "${t.title}" | Urgence: ${t.urgency}/10 | Importance: ${t.importance}/10 | Temps: ${t.estimatedTime || '?'}min | Statut: ${t.status || 'todo'}${t.assignee ? ` | Assigné: ${t.assignee}` : ''}${t.deadline ? ` | Deadline: ${t.deadline}` : ''}${t.description ? `\n  Contexte: ${t.description}` : ''}`
    ).join('\n')

    const stats = `Répartition : Q1=${Q.Q1.length} tâches, Q2=${Q.Q2.length}, Q3=${Q.Q3.length}, Q4=${Q.Q4.length} | Total: ${tasks.length} tâches | Temps estimé total: ${Math.round(totalTime / 60)}h${totalTime % 60}min`

    const prompt = `Analyse cette matrice d'Eisenhower et fournis une évaluation stratégique complète :

${projectName ? `PROJET : ${projectName}` : ''}
${projectContext ? `CONTEXTE : ${projectContext}` : ''}

${stats}

TÂCHES CLASSIFIÉES :
${tasksDetail}

Évalue la qualité de la priorisation, identifie les déséquilibres, les tâches mal classifiées, les risques de surcharge, et propose un plan d'action concret pour optimiser la productivité.`

    const response = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 3500,
      system:     SYSTEM_PROMPT,
      messages:   [{ role: 'user', content: prompt }],
    })

    const rawText = response.content.filter(b => b.type === 'text').map(b => b.text).join('')

    let result
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON')
      result = JSON.parse(jsonMatch[0])
    } catch {
      // Fallback
      result = {
        health_score: 50,
        health_label: 'Acceptable',
        executive_summary: rawText.slice(0, 500),
        quadrant_analysis: {
          Q1: { count: Q.Q1.length, assessment: 'Analyse en cours.', risk: 'Modéré', advice: 'Traitez ces tâches en priorité.' },
          Q2: { count: Q.Q2.length, assessment: 'Analyse en cours.', risk: 'Faible',  advice: 'Planifiez ces tâches dans votre agenda.' },
          Q3: { count: Q.Q3.length, assessment: 'Analyse en cours.', risk: 'Modéré', advice: 'Déléguez ces tâches si possible.' },
          Q4: { count: Q.Q4.length, assessment: 'Analyse en cours.', risk: 'Faible',  advice: 'Éliminez ou reportez ces tâches.' },
        },
        reclassifications: [],
        time_analysis: { total_estimated_minutes: totalTime, Q1_minutes: 0, Q2_minutes: 0, Q3_minutes: 0, Q4_minutes: 0, overload_risk: 'Modéré', comment: '' },
        patterns: [], action_plan: { today: [], this_week: [], this_month: [], eliminate_now: [] },
        delegation_map: [], productivity_tips: [], kpis: [],
        conclusion: 'Une analyse approfondie est nécessaire pour optimiser votre priorisation.',
      }
    }

    return Response.json({ success: true, result })
  } catch (err) {
    console.error('[generer-eisenhower-analyze] Error:', err)
    if (err?.status === 401) return Response.json({ error: 'Clé API invalide.' },              { status: 401 })
    if (err?.status === 429) return Response.json({ error: 'Limite API atteinte. Réessayez.' },{ status: 429 })
    return Response.json({ error: 'Erreur serveur interne.', details: err?.message }, { status: 500 })
  }
}

export async function GET() {
  return Response.json({ status: 'ok', endpoint: 'generer-eisenhower-analyze', version: '1.0.0' })
}