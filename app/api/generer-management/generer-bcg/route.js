import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

// ── Quadrant helpers ──────────────────────────────────────────────────────────
const getQuadrant = (ms, gr) => {
  const highShare  = ms >= 50
  const highGrowth = gr >= 10
  if (highShare  && highGrowth)  return 'star'
  if (highShare  && !highGrowth) return 'cow'
  if (!highShare && highGrowth)  return 'question'
  return 'dog'
}

const QUADRANT_LABELS = {
  star:     'Star (Étoile)',
  cow:      'Cash Cow (Vache à lait)',
  question: 'Question Mark (Dilemme)',
  dog:      'Dog (Poids mort)',
}

const QUADRANT_STRATEGY = {
  star:     'Investir massivement pour maintenir la position et soutenir la croissance.',
  cow:      'Exploiter et maximiser les flux de trésorerie, investissement minimal.',
  question: 'Décider : investir fortement pour en faire une Star, ou désinvestir.',
  dog:      'Envisager le désinvestissement ou la niche spécialisée à faible coût.',
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { analysisName, context, products, projectName, projectTag } = body

    if (!products || products.length === 0) {
      return Response.json({ error: 'Aucun produit fourni' }, { status: 400 })
    }

    // ── Build enriched product list for the prompt ──
    const productsWithQuadrants = products.map(p => ({
      ...p,
      quadrant:         getQuadrant(p.marketShare, p.growthRate),
      quadrantLabel:    QUADRANT_LABELS[getQuadrant(p.marketShare, p.growthRate)],
      defaultStrategy:  QUADRANT_STRATEGY[getQuadrant(p.marketShare, p.growthRate)],
    }))

    // ── Compute portfolio stats ──
    const totalRevenue    = products.reduce((s, p) => s + (p.revenue || 0), 0)
    const avgGrowth       = (products.reduce((s, p) => s + p.growthRate, 0)  / products.length).toFixed(1)
    const avgShare        = (products.reduce((s, p) => s + p.marketShare, 0) / products.length).toFixed(1)
    const quadrantCounts  = productsWithQuadrants.reduce((acc, p) => { acc[p.quadrant] = (acc[p.quadrant]||0)+1; return acc }, {})

    const contextLines = [
      projectName && `Entreprise / Projet : ${projectName}`,
      projectTag  && `Secteur : ${projectTag}`,
      context     && `Contexte de l'analyse : ${context}`,
    ].filter(Boolean).join('\n')

    // ── Prompt ──────────────────────────────────────────────────────────────
    const prompt = `Tu es un consultant en stratégie d'entreprise senior, expert de la matrice BCG (Boston Consulting Group).

${contextLines ? `## CONTEXTE\n${contextLines}\n` : ''}

## ANALYSE : ${analysisName}

### Portefeuille de ${products.length} produit(s) / unité(s) stratégique(s) :

${productsWithQuadrants.map((p, i) => `
**${i+1}. ${p.name}**
- Quadrant BCG : ${p.quadrantLabel}
- Part de marché relative : ${p.marketShare}%
- Taux de croissance marché : ${p.growthRate}%
${p.revenue ? `- Chiffre d'affaires : ${p.revenue.toLocaleString()} k€` : ''}
${p.description ? `- Description : ${p.description}` : ''}
- Stratégie théorique : ${p.defaultStrategy}
`).join('')}

### Statistiques du portefeuille :
- Croissance moyenne : ${avgGrowth}%
- Part de marché moyenne : ${avgShare}%
${totalRevenue > 0 ? `- CA total : ${totalRevenue.toLocaleString()} k€` : ''}
- Répartition : ${Object.entries(quadrantCounts).map(([q, c]) => `${c} ${QUADRANT_LABELS[q]}`).join(', ')}

---

Génère une analyse stratégique BCG approfondie et personnalisée. Réponds UNIQUEMENT en JSON valide avec cette structure exacte :

{
  "synthese": "Paragraphe de 3-5 phrases sur l'état général du portefeuille, les équilibres/déséquilibres, les risques et opportunités globaux. Sois précis et actionnable, pas générique.",

  "recommandations": [
    {
      "produit": "nom exact du produit",
      "quadrant": "star|cow|question|dog",
      "analyse": "Analyse spécifique de 2-3 phrases : pourquoi ce produit est dans ce quadrant, ce que cela signifie concrètement, quels leviers actionner.",
      "action": "Action prioritaire courte et concrète (max 8 mots)"
    }
  ],

  "priorites": [
    "Priorité d'action #1 concrète et mesurable",
    "Priorité d'action #2",
    "Priorité d'action #3",
    "Priorité d'action #4 (si pertinent)",
    "Priorité d'action #5 (si pertinent)"
  ],

  "conclusion": "Phrase de conclusion stratégique percutante et mémorable sur la trajectoire recommandée pour ce portefeuille."
}

RÈGLES IMPÉRATIVES :
- Chaque recommandation doit être spécifique au produit, pas copiée de la théorie générique
- Les priorités doivent être ordonnées par urgence et impact
- Tiens compte du contexte secteur si fourni
- Si plusieurs produits sont dans le même quadrant, différencie ton analyse selon leurs metrics (croissance relative, CA)
- Identifie les synergies potentielles entre produits
- Si le portefeuille est déséquilibré (ex: trop de Dogs), dis-le clairement`

    // ── Call Claude ──────────────────────────────────────────────────────────
    const response = await client.messages.create({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })

    // ── Parse response ───────────────────────────────────────────────────────
    const rawText = response.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('')

    let result
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('Pas de JSON dans la réponse')
      result = JSON.parse(jsonMatch[0])

      // Ensure quadrant field is present on each recommendation
      result.recommandations = (result.recommandations || []).map(r => ({
        ...r,
        quadrant: r.quadrant || getQuadrant(
          products.find(p => p.name === r.produit)?.marketShare || 0,
          products.find(p => p.name === r.produit)?.growthRate  || 0
        ),
      }))
    } catch {
      // Fallback: build a basic result from the raw text
      result = {
        synthese: rawText.slice(0, 600),
        recommandations: productsWithQuadrants.map(p => ({
          produit:  p.name,
          quadrant: p.quadrant,
          analyse:  `${p.name} est positionné dans le quadrant ${p.quadrantLabel}. ${p.defaultStrategy}`,
          action:   p.defaultStrategy.split('.')[0],
        })),
        priorites: [
          'Optimiser les Cash Cows existants',
          'Décider du sort des Question Marks',
          'Réduire l\'exposition aux Dogs',
        ],
        conclusion: 'Un rééquilibrage du portefeuille est recommandé pour maximiser la création de valeur.',
      }
    }

    return Response.json({ success: true, result })

  } catch (err) {
    console.error('BCG API error:', err)
    return Response.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}