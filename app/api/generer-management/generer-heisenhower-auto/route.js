import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

// ── Quadrant metadata ─────────────────────────────────────────────────────────
export const QUADRANTS = {
  Q1: { id: 'Q1', label: 'Urgent & Important',       icon: '🔴', action: 'FAIRE',    color: '#f87171', bg: 'rgba(248,113,113,.1)',  border: 'rgba(248,113,113,.25)', desc: 'Crises, urgences, deadlines critiques — à exécuter immédiatement' },
  Q2: { id: 'Q2', label: 'Important, Non urgent',    icon: '🟢', action: 'PLANIFIER', color: '#34d399', bg: 'rgba(52,211,153,.1)',   border: 'rgba(52,211,153,.25)',  desc: 'Stratégie, croissance, prévention — à planifier dans l\'agenda' },
  Q3: { id: 'Q3', label: 'Urgent, Non important',    icon: '🔵', action: 'DÉLÉGUER',  color: '#60a5fa', bg: 'rgba(96,165,250,.1)',   border: 'rgba(96,165,250,.25)',  desc: 'Interruptions, réunions périphériques — à déléguer' },
  Q4: { id: 'Q4', label: 'Ni urgent ni important',   icon: '⚪', action: 'ÉLIMINER',  color: '#9896aa', bg: 'rgba(152,150,170,.08)', border: 'rgba(152,150,170,.2)',  desc: 'Distractions, activités sans valeur — à éliminer' },
}

const SYSTEM_PROMPT = `Tu es un expert en gestion du temps et en méthode Eisenhower.
À partir d'une description de projet ou de contexte organisationnel, tu génères automatiquement une liste de tâches classifiées dans la matrice d'Eisenhower (4 quadrants).

RÈGLES ABSOLUES :
- Réponds UNIQUEMENT avec du JSON valide, sans backticks, sans texte avant ou après.
- Génère entre 8 et 20 tâches réalistes selon la complexité du projet décrit.
- Répartis les tâches de façon réaliste : ~20% Q1, ~40% Q2, ~25% Q3, ~15% Q4.
- Les tâches doivent être concrètes, actionnables et spécifiques au contexte.
- urgency et importance sont des scores de 1 à 10.
- Q1 = urgency ≥ 7 ET importance ≥ 7
- Q2 = urgency < 7 ET importance ≥ 7
- Q3 = urgency ≥ 7 ET importance < 7
- Q4 = urgency < 7 ET importance < 7
- Les scores doivent être cohérents avec le quadrant assigné.
- estimatedTime en minutes (ex: 30, 60, 120, 240).
- deadline : null ou chaîne "YYYY-MM-DD" ou durée relative "J+2", "S+1".

FORMAT DE RÉPONSE (JSON strict) :
{
  "projectTitle": "string",
  "projectSummary": "string (2-3 phrases résumant le contexte et l'approche Eisenhower recommandée)",
  "tasks": [
    {
      "id": "string (ex: t1, t2…)",
      "title": "string (verbe d'action + objet, concis)",
      "description": "string (pourquoi cette tâche, contexte, impact attendu)",
      "quadrant": "Q1 | Q2 | Q3 | Q4",
      "urgency": 8,
      "importance": 9,
      "estimatedTime": 60,
      "deadline": "J+1",
      "assignee": "string (rôle ou prénom suggéré, optionnel)",
      "category": "string (ex: Client, Technique, RH, Stratégie, Admin, Communication)",
      "priority": 1
    }
  ],
  "insights": {
    "critical_path": "string (tâches Q1 les plus urgentes à traiter en priorité absolue)",
    "delegation_opportunities": "string (quelles tâches Q3 déléguer et à qui)",
    "planning_priorities": "string (tâches Q2 à inscrire en agenda cette semaine)",
    "elimination_candidates": "string (tâches Q4 à supprimer ou automatiser)"
  },
  "recommendations": ["string", "string", "string"]
}`

export async function POST(request) {
  try {
    const body = await request.json()
    const { description, projectName } = body

    if (!description || description.trim().length < 15) {
      return Response.json({ error: 'Description trop courte (minimum 15 caractères).' }, { status: 400 })
    }

    const prompt = `Génère une matrice d'Eisenhower complète pour le projet ou contexte suivant :

DESCRIPTION : ${description.trim()}
${projectName ? `NOM DU PROJET : ${projectName}` : ''}

Analyse le contexte, identifie toutes les tâches clés, classe-les dans les 4 quadrants Eisenhower avec des scores précis d'urgence et d'importance, et fournis des insights stratégiques concrets.`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    })

    const rawText = response.content.filter(b => b.type === 'text').map(b => b.text).join('')

    let parsed
    try {
      const clean = rawText.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim()
      parsed = JSON.parse(clean)
    } catch {
      return Response.json({ error: 'Erreur de parsing de la réponse IA.', raw: rawText.slice(0, 400) }, { status: 500 })
    }

    if (!parsed.tasks || !Array.isArray(parsed.tasks)) {
      return Response.json({ error: 'Format de réponse invalide : champ tasks manquant.' }, { status: 500 })
    }

    // Validate and normalize tasks
    const validQuadrants = ['Q1', 'Q2', 'Q3', 'Q4']
    const normalized = parsed.tasks.map((t, i) => ({
      id:            t.id            || `t${i + 1}`,
      title:         t.title         || `Tâche ${i + 1}`,
      description:   t.description   || '',
      quadrant:      validQuadrants.includes(t.quadrant) ? t.quadrant : 'Q2',
      urgency:       Math.min(10, Math.max(1, parseInt(t.urgency)    || 5)),
      importance:    Math.min(10, Math.max(1, parseInt(t.importance) || 5)),
      estimatedTime: Math.max(5, parseInt(t.estimatedTime) || 60),
      deadline:      t.deadline      || null,
      assignee:      t.assignee      || '',
      category:      t.category      || 'Général',
      priority:      parseInt(t.priority) || i + 1,
      status:        'todo',
      createdAt:     new Date().toISOString(),
    }))

    return Response.json({
      success: true,
      data: {
        projectTitle:   parsed.projectTitle   || projectName || 'Nouveau projet',
        projectSummary: parsed.projectSummary || '',
        tasks:          normalized,
        insights:       parsed.insights       || {},
        recommendations: parsed.recommendations || [],
      },
    })
  } catch (err) {
    console.error('[generer-eisenhower-generate] Error:', err)
    if (err?.status === 401) return Response.json({ error: 'Clé API invalide.' },              { status: 401 })
    if (err?.status === 429) return Response.json({ error: 'Limite API atteinte. Réessayez.' },{ status: 429 })
    return Response.json({ error: 'Erreur serveur interne.', details: err?.message }, { status: 500 })
  }
}

export async function GET() {
  return Response.json({ status: 'ok', endpoint: 'generer-eisenhower-generate', version: '1.0.0' })
}