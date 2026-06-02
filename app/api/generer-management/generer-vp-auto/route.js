import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const PRIORITY_VALID   = ['high', 'medium', 'low']
const IMPORTANCE_RANGE = { min: 1, max: 5 }

const sanitizeItems = (arr) =>
  (arr || []).map(item => ({
    text:       String(item.text || ''),
    priority:   PRIORITY_VALID.includes(item.priority) ? item.priority : 'medium',
    importance: Math.min(IMPORTANCE_RANGE.max, Math.max(IMPORTANCE_RANGE.min, parseInt(item.importance) || 3)),
    notes:      String(item.notes || ''),
  }))

export async function POST(request) {
  try {
    const body = await request.json()
    const { description, projectName, projectTag } = body

    if (!description?.trim()) {
      return Response.json({ error: 'Description requise' }, { status: 400 })
    }

    const ctx = [
      projectName && `Entreprise / Projet : ${projectName}`,
      projectTag  && `Secteur : ${projectTag}`,
    ].filter(Boolean).join('\n')

    const prompt = `Tu es un expert en stratégie marketing et en Value Proposition Canvas (Osterwalder & Pigneur).

${ctx ? `## CONTEXTE\n${ctx}\n` : ''}

## DESCRIPTION FOURNIE :
${description}

---

À partir de cette description, génère un Value Proposition Canvas (CVP) complet et réaliste.

Le canvas est structuré en deux parties :
1. **PROFIL CLIENT** (droite) — ce que vit le client :
   - customer_jobs : tâches/objectifs que le client cherche à accomplir (fonctionnels, sociaux, émotionnels)
   - pains : douleurs, obstacles, risques que le client veut éviter
   - gains : bénéfices, résultats positifs que le client désire

2. **CARTE DE VALEUR** (gauche) — ce que nous offrons :
   - products_services : produits et services que nous proposons
   - pain_relievers : comment nos offres soulagent les douleurs clients
   - gain_creators : comment nos offres créent les bénéfices clients

Réponds UNIQUEMENT en JSON valide :

{
  "canvasName": "Nom court et pertinent (ex: 'CVP Plateforme RH PME')",
  "context": "Résumé du contexte en 1-2 phrases",
  "segment": "Nom du segment client ciblé (ex: 'PME africaines 10-50 salariés')",
  "canvas": {
    "customer_jobs": [
      { "text": "Tâche ou objectif client précis", "priority": "high", "importance": 5, "notes": "Contexte ou précision" }
    ],
    "pains": [
      { "text": "Douleur ou obstacle client spécifique", "priority": "high", "importance": 4, "notes": "" }
    ],
    "gains": [
      { "text": "Bénéfice ou résultat désiré", "priority": "medium", "importance": 3, "notes": "" }
    ],
    "products_services": [
      { "text": "Produit ou service proposé", "priority": "high", "importance": 5, "notes": "" }
    ],
    "pain_relievers": [
      { "text": "Comment on soulage cette douleur spécifique", "priority": "high", "importance": 4, "notes": "" }
    ],
    "gain_creators": [
      { "text": "Comment on crée ce bénéfice spécifique", "priority": "medium", "importance": 3, "notes": "" }
    ]
  },
  "fit_score": 72,
  "synthese": "3-4 phrases sur l'adéquation entre la proposition de valeur et le profil client : ce qui fonctionne bien, les écarts, les points à renforcer.",
  "forces": [
    "Force principale de la proposition de valeur #1",
    "Force #2"
  ],
  "gaps": [
    "Gap ou manque identifié dans la proposition de valeur #1",
    "Gap #2"
  ],
  "recommandations": [
    "Recommandation stratégique #1 concrète",
    "Recommandation #2",
    "Recommandation #3",
    "Recommandation #4 (si pertinent)"
  ],
  "conclusion": "Verdict stratégique en une phrase mémorable sur l'adéquation valeur/client."
}

RÈGLES :
- 3 à 6 items par section, selon la richesse du contexte
- priority : exactement "high", "medium" ou "low"
- importance : entier 1-5
- Les pain_relievers doivent répondre DIRECTEMENT aux pains listés
- Les gain_creators doivent répondre DIRECTEMENT aux gains listés
- fit_score : entier 0-100 estimant l'adéquation proposition/profil (100 = fit parfait)
- Les items doivent être SPÉCIFIQUES au contexte, pas génériques
- Assigner "high" priority aux éléments les plus stratégiques (max 2 par section)`

    const response = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
    })

    const rawText = response.content.filter(b => b.type === 'text').map(b => b.text).join('')

    let result
    try {
      const m = rawText.match(/\{[\s\S]*\}/)
      if (!m) throw new Error('No JSON')
      result = JSON.parse(m[0])

      // Sanitize all sections
      const SECTIONS = ['customer_jobs','pains','gains','products_services','pain_relievers','gain_creators']
      for (const s of SECTIONS) {
        result.canvas[s] = sanitizeItems(result.canvas[s])
      }
      result.fit_score = Math.min(100, Math.max(0, parseInt(result.fit_score) || 60))

    } catch {
      return Response.json({ error: 'Erreur de génération — veuillez réessayer.' }, { status: 500 })
    }

    return Response.json({ success: true, result })

  } catch (err) {
    console.error('CVP Auto error:', err)
    return Response.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}