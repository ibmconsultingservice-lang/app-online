import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const getQuadrant = (ms, gr) => {
  const highShare  = ms >= 50
  const highGrowth = gr >= 10
  if (highShare  && highGrowth)  return 'star'
  if (highShare  && !highGrowth) return 'cow'
  if (!highShare && highGrowth)  return 'question'
  return 'dog'
}

// ── Mode 1 : Génération automatique depuis description ────────────────────────
export async function POST(request) {
  try {
    const body = await request.json()
    const { description, projectName, projectTag, mode } = body

    if (!description?.trim()) {
      return Response.json({ error: 'Description requise' }, { status: 400 })
    }

    const contextLines = [
      projectName && `Entreprise / Projet : ${projectName}`,
      projectTag  && `Secteur : ${projectTag}`,
    ].filter(Boolean).join('\n')

    const prompt = `Tu es un consultant en stratégie senior, expert de la matrice BCG.

${contextLines ? `## CONTEXTE\n${contextLines}\n` : ''}

## DESCRIPTION DU CONTEXTE FOURNI PAR L'UTILISATEUR :
${description}

---

À partir de cette description, génère une matrice BCG réaliste et cohérente pour ce contexte.
Identifie entre 3 et 8 produits/unités stratégiques pertinents et positionne-les sur la matrice BCG.

Réponds UNIQUEMENT en JSON valide avec cette structure exacte :

{
  "analysisName": "Nom court et pertinent pour cette analyse (ex: 'Portefeuille Produits 2025')",
  "context": "Résumé du contexte stratégique en 1-2 phrases pour rappel",
  "products": [
    {
      "name": "Nom du produit/unité stratégique",
      "marketShare": 65,
      "growthRate": 18,
      "revenue": 2400,
      "description": "Description courte du produit et justification de son positionnement BCG",
      "quadrant": "star|cow|question|dog"
    }
  ],
  "synthese": "Paragraphe de 3-4 phrases sur la logique du portefeuille généré, les équilibres, les forces et les faiblesses identifiées depuis le contexte fourni.",
  "recommandations": [
    {
      "produit": "nom exact du produit",
      "quadrant": "star|cow|question|dog",
      "analyse": "Analyse spécifique de 2-3 phrases pour ce produit dans ce quadrant.",
      "action": "Action prioritaire courte (max 8 mots)"
    }
  ],
  "priorites": [
    "Priorité stratégique #1 concrète",
    "Priorité #2",
    "Priorité #3"
  ],
  "conclusion": "Phrase de conclusion stratégique mémorable."
}

RÈGLES IMPÉRATIVES :
- marketShare : entre 0 et 100 (% de part de marché relative)
- growthRate : entre -10 et 45 (% de croissance annuelle du marché)
- revenue : en k€, cohérent avec le contexte (peut être 0 si non estimable)
- Le portefeuille doit être RÉALISTE et VARIÉ : inclure des Stars, des Cash Cows, des Question Marks et potentiellement des Dogs selon ce qui est pertinent
- Ne pas mettre tous les produits dans le même quadrant
- Les chiffres doivent être cohérents avec le secteur et le contexte fourni
- Si la description mentionne des produits/services spécifiques, les utiliser directement
- Si la description est générale, inférer des produits typiques du secteur`

    const response = await client.messages.create({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 2500,
      messages: [{ role: 'user', content: prompt }],
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

      // Ensure quadrant is computed/validated for each product
      result.products = (result.products || []).map(p => ({
        ...p,
        marketShare: Math.min(100, Math.max(0,  parseFloat(p.marketShare) || 0)),
        growthRate:  Math.min(50,  Math.max(-20, parseFloat(p.growthRate)  || 0)),
        revenue:     parseFloat(p.revenue) || 0,
        quadrant:    getQuadrant(parseFloat(p.marketShare) || 0, parseFloat(p.growthRate) || 0),
      }))
    } catch (e) {
      return Response.json({ error: 'Erreur de génération — veuillez réessayer.' }, { status: 500 })
    }

    return Response.json({ success: true, result })

  } catch (err) {
    console.error('BCG Auto-generate error:', err)
    return Response.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}