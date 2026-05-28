import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

// ── Quadrant metadata ─────────────────────────────────────────────────────────
const QUADRANT_META = {
  strengths:     { label: 'Forces (Strengths)',           internal: true,  positive: true  },
  weaknesses:    { label: 'Faiblesses (Weaknesses)',      internal: true,  positive: false },
  opportunities: { label: 'Opportunités (Opportunities)', internal: false, positive: true  },
  threats:       { label: 'Menaces (Threats)',            internal: false, positive: false },
}

// ── TOWS combinations ─────────────────────────────────────────────────────────
// SO = Strengths + Opportunities  → Attaque / Développement
// WO = Weaknesses + Opportunities → Amélioration / Conversion
// ST = Strengths + Threats        → Défense / Protection
// WT = Weaknesses + Threats       → Survie / Réduction
const TOWS_TYPES = {
  SO: { label: 'Forces × Opportunités',    strategy: 'Stratégie d\'attaque : exploiter vos forces pour saisir les opportunités',   icon: '↗' },
  WO: { label: 'Faiblesses × Opportunités',strategy: 'Stratégie d\'amélioration : combler les faiblesses pour saisir les opportunités', icon: '↑' },
  ST: { label: 'Forces × Menaces',         strategy: 'Stratégie de défense : utiliser vos forces pour contrer les menaces',       icon: '⊡' },
  WT: { label: 'Faiblesses × Menaces',     strategy: 'Stratégie de survie : minimiser faiblesses et éviter les menaces',          icon: '↙' },
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { analysisName, context, objective, items, projectName, projectTag } = body

    // Validate: at least some items
    const totalItems = Object.values(items || {}).reduce((s, arr) => s + arr.length, 0)
    if (totalItems === 0) {
      return Response.json({ error: 'Aucun élément SWOT fourni' }, { status: 400 })
    }

    // ── Build formatted sections ──────────────────────────────────────────────
    const formatSection = (key) => {
      const arr = items[key] || []
      if (arr.length === 0) return `Aucun élément renseigné`
      return arr.map((item, i) =>
        `  ${i+1}. ${item.text}${item.priority === 'high' ? ' [HAUTE PRIORITÉ]' : item.priority === 'low' ? ' [faible priorité]' : ''} — Impact: ${item.impact}/5${item.notes ? ` — Note: ${item.notes}` : ''}`
      ).join('\n')
    }

    // ── Compute coverage stats ────────────────────────────────────────────────
    const counts = Object.fromEntries(
      Object.keys(QUADRANT_META).map(k => [k, (items[k] || []).length])
    )
    const highPriorityItems = Object.entries(items || {}).flatMap(([k, arr]) =>
      arr.filter(i => i.priority === 'high').map(i => `${QUADRANT_META[k].label}: "${i.text}"`)
    )
    const highImpactItems = Object.entries(items || {}).flatMap(([k, arr]) =>
      arr.filter(i => i.impact >= 4).map(i => `${QUADRANT_META[k].label}: "${i.text}"`)
    )

    const contextLines = [
      projectName  && `Entreprise / Projet : ${projectName}`,
      projectTag   && `Secteur : ${projectTag}`,
      context      && `Contexte : ${context}`,
      objective    && `Objectif stratégique : ${objective}`,
    ].filter(Boolean).join('\n')

    // ── Prompt ───────────────────────────────────────────────────────────────
    const prompt = `Tu es un consultant stratégique expert en analyse SWOT et en matrices TOWS. 
Tu fournis des analyses profondes, contextualisées et directement actionnables.

${contextLines ? `## CONTEXTE\n${contextLines}\n` : ''}

## ANALYSE SWOT : "${analysisName}"
Total : ${totalItems} éléments répartis sur ${Object.values(counts).filter(c => c > 0).length}/4 quadrants

### FORCES (${counts.strengths} éléments)
${formatSection('strengths')}

### FAIBLESSES (${counts.weaknesses} éléments)
${formatSection('weaknesses')}

### OPPORTUNITÉS (${counts.opportunities} éléments)
${formatSection('opportunities')}

### MENACES (${counts.threats} éléments)
${formatSection('threats')}

${highPriorityItems.length > 0 ? `### Éléments haute priorité identifiés :\n${highPriorityItems.map(i => `- ${i}`).join('\n')}\n` : ''}
${highImpactItems.length > 0 ? `### Éléments à fort impact (≥4/5) :\n${highImpactItems.map(i => `- ${i}`).join('\n')}\n` : ''}

---

Génère une analyse stratégique SWOT complète incluant les stratégies TOWS croisées.
Réponds UNIQUEMENT en JSON valide avec cette structure exacte :

{
  "diagnostic": "Paragraphe de 4-6 phrases. Évalue l'équilibre du portefeuille SWOT, l'état stratégique général, les tensions clés entre forces/faiblesses et opportunités/menaces. Sois précis, contextuel, pas générique.",

  "strategies": [
    {
      "type": "SO",
      "titre": "Titre court et percutant (max 8 mots)",
      "description": "Description de 2-3 phrases expliquant comment croiser spécifiquement ces forces avec ces opportunités pour créer de la valeur."
    },
    {
      "type": "WO",
      "titre": "...",
      "description": "..."
    },
    {
      "type": "ST",
      "titre": "...",
      "description": "..."
    },
    {
      "type": "WT",
      "titre": "...",
      "description": "..."
    }
  ],

  "priorites": [
    "Action prioritaire #1 : concrète, mesurable, avec horizon temporel si possible",
    "Action prioritaire #2",
    "Action prioritaire #3",
    "Action prioritaire #4 (si pertinent)",
    "Action prioritaire #5 (si pertinent)"
  ],

  "risques": [
    "Risque critique #1 : description et impact potentiel",
    "Risque critique #2",
    "Risque critique #3 (si pertinent)"
  ],

  "conclusion": "Phrase de synthèse stratégique mémorable sur la trajectoire recommandée."
}

RÈGLES ESSENTIELLES :
- Génère EXACTEMENT 4 stratégies TOWS (une SO, une WO, une ST, une WT)
- Chaque stratégie doit croiser des éléments SPÉCIFIQUES de ta liste, pas des généralités
- Si un quadrant est vide, adapte ta stratégie en conséquence et note-le
- Les priorités doivent être ordonnées par urgence × impact
- Les risques = menaces amplifiées par les faiblesses existantes
- Adapte le ton au secteur si renseigné
- Identifie les contradictions ou paradoxes dans la SWOT si présents`

    // ── Call Claude ───────────────────────────────────────────────────────────
    const response = await client.messages.create({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 2500,
      messages: [{ role: 'user', content: prompt }],
    })

    const rawText = response.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('')

    // ── Parse JSON ────────────────────────────────────────────────────────────
    let result
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('Pas de JSON dans la réponse')
      result = JSON.parse(jsonMatch[0])

      // Ensure all 4 TOWS types present
      const existingTypes = (result.strategies || []).map(s => s.type)
      for (const type of ['SO', 'WO', 'ST', 'WT']) {
        if (!existingTypes.includes(type)) {
          result.strategies = result.strategies || []
          result.strategies.push({
            type,
            titre: `Stratégie ${type}`,
            description: TOWS_TYPES[type].strategy,
          })
        }
      }
      // Keep only SO, WO, ST, WT
      result.strategies = result.strategies.filter(s => ['SO','WO','ST','WT'].includes(s.type))
      // Sort in canonical order
      const order = ['SO','WO','ST','WT']
      result.strategies.sort((a,b) => order.indexOf(a.type) - order.indexOf(b.type))

    } catch {
      // Fallback minimal
      result = {
        diagnostic: rawText.slice(0, 500) || 'Analyse en cours de traitement.',
        strategies: Object.entries(TOWS_TYPES).map(([type, meta]) => ({
          type,
          titre: `Stratégie ${type}`,
          description: meta.strategy,
        })),
        priorites: [
          'Capitaliser sur les forces identifiées pour saisir les opportunités clés',
          'Adresser en priorité les faiblesses à fort impact',
          'Mettre en place un plan de mitigation pour les menaces critiques',
        ],
        risques: [
          'Exposition aux menaces externes non compensées par des forces suffisantes',
        ],
        conclusion: 'Une approche équilibrée Forces-Opportunités permettra de maximiser la création de valeur.',
      }
    }

    return Response.json({ success: true, result })

  } catch (err) {
    console.error('SWOT API error:', err)
    return Response.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}