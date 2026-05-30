import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(request) {
  try {
    const body = await request.json()
    const { action, description, cardName, projectName, projectTag } = body

    if (action !== 'generate') {
      return Response.json({ success: false, error: 'Action non reconnue' }, { status: 400 })
    }

    if (!description?.trim() || !cardName?.trim()) {
      return Response.json({ success: false, error: 'Nom et description requis' }, { status: 400 })
    }

    const systemPrompt = `Tu es un expert en stratégie d'entreprise et en Balanced Scorecard (BSC).
Tu génères des BSC complets, structurés et pertinents en JSON pur.
Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant ou après, sans balises markdown.`

    const userPrompt = `Génère un Balanced Scorecard complet pour le contexte suivant :

Nom du BSC : "${cardName}"
${projectName ? `Projet/Organisation : ${projectName}` : ''}
${projectTag ? `Secteur/Tag : ${projectTag}` : ''}
Description : ${description}

Génère un BSC avec exactement 12 à 16 objectifs répartis équitablement sur les 4 perspectives (finance, clients, processus, apprentissage).

Réponds avec ce JSON exact :
{
  "vision": "vision stratégique en 1-2 phrases",
  "strategie": "axes stratégiques principaux en 1-2 phrases",
  "synthese": "synthèse contextuelle de 1-2 phrases expliquant la logique du BSC généré",
  "objectives": [
    {
      "id": "obj-1",
      "name": "Nom de l'objectif stratégique",
      "description": "Description courte de l'objectif",
      "perspective": "finance | clients | processus | apprentissage",
      "kpi": "Nom du KPI principal",
      "cible": "valeur numérique cible (sans unité)",
      "valeurActuelle": "",
      "unite": "unité de mesure (%, k€, pts, etc.)",
      "responsable": "Rôle/fonction responsable",
      "echeance": "",
      "status": "non-defini",
      "poids": 2
    }
  ]
}

Règles importantes :
- Les IDs doivent être uniques : "obj-1", "obj-2", etc.
- "cible" doit être une valeur numérique pertinente et réaliste (ex: "20", "85", "1000")
- "valeurActuelle" doit être une chaîne vide ""
- "echeance" doit être une chaîne vide ""
- "status" doit toujours être "non-defini"
- "poids" entre 1 et 5 selon l'importance stratégique
- Les objectifs doivent être concrets, mesurables et adaptés au secteur décrit
- Répartis équitablement : 3-4 objectifs par perspective`

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

    // Validate minimal structure
    if (!result.objectives || !Array.isArray(result.objectives)) {
      return Response.json(
        { success: false, error: 'Structure JSON invalide : champ "objectives" manquant' },
        { status: 500 }
      )
    }

    // Ensure all objectives have required fields and unique ids
    result.objectives = result.objectives.map((obj, index) => ({
      id: obj.id || `obj-${index + 1}`,
      name: obj.name || 'Objectif sans nom',
      description: obj.description || '',
      perspective: ['finance', 'clients', 'processus', 'apprentissage'].includes(obj.perspective)
        ? obj.perspective
        : 'finance',
      kpi: obj.kpi || '',
      cible: String(obj.cible ?? ''),
      valeurActuelle: '',
      unite: obj.unite || '',
      responsable: obj.responsable || '',
      echeance: '',
      status: 'non-defini',
      poids: Math.min(5, Math.max(1, parseInt(obj.poids) || 2)),
    }))

    return Response.json({ success: true, result })
  } catch (err) {
    console.error('generer-bsc error:', err)
    return Response.json(
      { success: false, error: err.message || 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}