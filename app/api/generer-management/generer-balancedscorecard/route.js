import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(request) {
  try {
    const body = await request.json()
    const { action, cardName, vision, strategie, objectives, projectName, projectTag } = body

    if (action !== 'analyse') {
      return Response.json({ success: false, error: 'Action non reconnue' }, { status: 400 })
    }

    if (!objectives || !Array.isArray(objectives) || objectives.length === 0) {
      return Response.json(
        { success: false, error: 'Au moins un objectif est requis pour l\'analyse' },
        { status: 400 }
      )
    }

    // Summarize objectives for the prompt
    const objectivesSummary = objectives
      .map(o => {
        const progress =
          o.valeurActuelle && o.cible
            ? ` (actuel: ${o.valeurActuelle}${o.unite || ''} / cible: ${o.cible}${o.unite || ''})`
            : ''
        return `- [${o.perspective}] ${o.name}${o.kpi ? ` | KPI: ${o.kpi}` : ''}${progress} | Statut: ${o.status} | Poids: ${o.poids || 1}`
      })
      .join('\n')

    const systemPrompt = `Tu es un expert senior en stratégie d'entreprise, en Balanced Scorecard et en pilotage de la performance.
Tu analyses des BSC avec rigueur et fournis des recommandations actionnables.
Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant ou après, sans balises markdown.`

    const userPrompt = `Analyse ce Balanced Scorecard et fournis une évaluation stratégique complète.

## Scorecard : "${cardName}"
${projectName ? `Projet/Organisation : ${projectName}` : ''}
${projectTag ? `Secteur : ${projectTag}` : ''}
${vision ? `Vision : ${vision}` : ''}
${strategie ? `Stratégie : ${strategie}` : ''}

## Objectifs (${objectives.length}) :
${objectivesSummary}

Réponds avec ce JSON exact :
{
  "synthese": "Synthèse stratégique globale de 3-4 phrases : évaluation de l'équilibre des perspectives, cohérence avec la vision, niveau de maturité général",
  "scoreParPerspective": {
    "finance": 0-100,
    "clients": 0-100,
    "processus": 0-100,
    "apprentissage": 0-100
  },
  "recommandations": [
    {
      "objectif": "Nom de l'objectif analysé",
      "perspective": "finance | clients | processus | apprentissage",
      "analyse": "Analyse courte de cet objectif (1-2 phrases) : pertinence, niveau d'ambition, cohérence KPI/cible",
      "action": "Action concrète recommandée (courte, impérative)"
    }
  ],
  "alignement": "Évaluation de l'alignement causal entre les 4 perspectives et la vision stratégique (2-3 phrases)",
  "priorites": [
    "Priorité d'action #1 formulée de manière concrète et actionnable",
    "Priorité d'action #2",
    "Priorité d'action #3",
    "Priorité d'action #4 (optionnel)",
    "Priorité d'action #5 (optionnel)"
  ],
  "conclusion": "Conclusion synthétique et encourageante de 1-2 phrases avec le principal levier de succès identifié"
}

Règles :
- "scoreParPerspective" : note de maturité 0-100 basée sur le nombre, la qualité et le statut des objectifs de chaque perspective
- "recommandations" : analyse UNIQUEMENT les objectifs existants (un par objectif ou les plus critiques), maximum 8
- "priorites" : 3 à 5 priorités d'action les plus impactantes pour améliorer la performance globale
- Sois précis, concret et orienté résultats
- Adapte le ton au secteur et au contexte si détectés`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      messages: [{ role: 'user', content: userPrompt }],
      system: systemPrompt,
    })

    const rawText = response.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('')

    // Strip possible markdown fences
    const cleaned = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim()

    let result
    try {
      result = JSON.parse(cleaned)
    } catch {
      console.error('JSON parse error. Raw response:', rawText)
      return Response.json(
        { success: false, error: 'Réponse IA invalide — impossible de parser le JSON' },
        { status: 500 }
      )
    }

    // Validate and normalize
    if (!result.synthese || !result.scoreParPerspective) {
      return Response.json(
        { success: false, error: 'Structure JSON invalide : champs requis manquants' },
        { status: 500 }
      )
    }

    // Clamp scores to 0-100
    const perspectives = ['finance', 'clients', 'processus', 'apprentissage']
    perspectives.forEach(key => {
      if (result.scoreParPerspective[key] !== undefined) {
        result.scoreParPerspective[key] = Math.min(
          100,
          Math.max(0, Math.round(result.scoreParPerspective[key]))
        )
      }
    })

    // Ensure recommandations is an array
    if (!Array.isArray(result.recommandations)) {
      result.recommandations = []
    }

    // Ensure priorites is an array
    if (!Array.isArray(result.priorites)) {
      result.priorites = []
    }

    return Response.json({ success: true, result })
  } catch (err) {
    console.error('generer-balancescorecard error:', err)
    return Response.json(
      { success: false, error: err.message || 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}