import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const DIMENSIONS = ['political', 'economic', 'social', 'technological', 'environmental', 'legal']

const DIM_LABELS = {
  political:     'Politique',
  economic:      'Économique',
  social:        'Social',
  technological: 'Technologique',
  environmental: 'Environnemental',
  legal:         'Légal',
}

// ── Robust JSON extractor ─────────────────────────────────────────────────────
// Handles: plain JSON, ```json blocks, truncated responses
function extractJSON(text) {
  if (!text) return null

  // 1. Strip markdown code fences
  const stripped = text
    .replace(/^```(?:json)?\s*/im, '')
    .replace(/\s*```\s*$/im, '')
    .trim()

  // 2. Try direct parse first
  try { return JSON.parse(stripped) } catch {}

  // 3. Extract between first { and last }
  const start = stripped.indexOf('{')
  const end   = stripped.lastIndexOf('}')
  if (start !== -1 && end !== -1 && end > start) {
    try { return JSON.parse(stripped.slice(start, end + 1)) } catch {}
  }

  // 4. Try to find a JSON block inside the original text
  const match = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/i)
  if (match) { try { return JSON.parse(match[1]) } catch {} }

  return null
}

// ── POST handler ──────────────────────────────────────────────────────────────
export async function POST(request) {
  try {
    const body = await request.json()
    const { mode = 'analyze' } = body
    return mode === 'generate' ? handleGenerate(body) : handleAnalyze(body)
  } catch (err) {
    console.error('PESTEL API error:', err)
    return Response.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// MODE 1 — GENERATE
// ══════════════════════════════════════════════════════════════════════════════
async function handleGenerate(body) {
  const { context, industry, geography, projectName, projectTag, companyName } = body

  if (!context?.trim()) {
    return Response.json({ error: 'Contexte requis pour la génération' }, { status: 400 })
  }

  const ctx = [
    projectName  && `Projet : ${projectName}`,
    companyName  && `Société : ${companyName}`,
    projectTag   && `Secteur : ${projectTag}`,
    industry     && `Industrie : ${industry}`,
    geography    && `Géographie : ${geography}`,
    `Description : ${context}`,
  ].filter(Boolean).join('\n')

  // Keep descriptions SHORT to stay within token budget
  const prompt = `Tu es un expert PESTEL. Génère une analyse PESTEL complète pour ce projet.

## CONTEXTE
${ctx}

Réponds UNIQUEMENT avec du JSON valide, sans aucun texte avant ou après, sans backticks markdown.
Structure exacte requise :

{
  "analysis_name": "Nom court descriptif",
  "headline": "Une phrase sur l'environnement macro de ce secteur",
  "factors": {
    "political": [
      {"title": "Titre court (max 4 mots)", "description": "Impact concret en 1-2 phrases.", "impact": "high", "nature": "opportunity", "timeframe": "medium", "source": "Source réelle"}
    ],
    "economic": [],
    "social": [],
    "technological": [],
    "environmental": [],
    "legal": []
  },
  "quick_synthesis": {
    "top_opportunities": ["Opportunité #1", "Opportunité #2"],
    "top_threats": ["Menace #1", "Menace #2"],
    "critical_factor": "Le facteur le plus critique"
  }
}

Règles strictes :
- 3 à 4 facteurs par dimension (pas plus)
- description : 1-2 phrases courtes et spécifiques au contexte
- impact : "high" | "medium" | "low"
- nature : "opportunity" | "threat" | "neutral"
- timeframe : "short" | "medium" | "long"
- Facteurs spécifiques à CE contexte, pas génériques`

  const response = await client.messages.create({
    model:      'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages:   [{ role: 'user', content: prompt }],
  })

  const rawText = response.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('')

  console.log('[PESTEL generate] raw length:', rawText.length)
  console.log('[PESTEL generate] raw preview:', rawText.slice(0, 200))

  const parsed = extractJSON(rawText)

  if (parsed && parsed.factors) {
    // Ensure all dims exist
    for (const dim of DIMENSIONS) {
      if (!Array.isArray(parsed.factors[dim])) parsed.factors[dim] = []
    }
    return Response.json({ success: true, mode: 'generate', result: parsed })
  }

  // Last resort: try to build from partial data
  console.error('[PESTEL generate] JSON parse failed. Raw:', rawText.slice(0, 500))
  return Response.json({
    success: false,
    error: 'La génération IA a retourné un format inattendu. Réessayez ou utilisez le mode manuel.',
  }, { status: 422 })
}

// ══════════════════════════════════════════════════════════════════════════════
// MODE 2 — ANALYZE
// ══════════════════════════════════════════════════════════════════════════════
async function handleAnalyze(body) {
  const { analysisName, industry, geography, factors, projectName, projectTag } = body

  const totalFactors = Object.values(factors || {}).reduce((s, arr) => s + (arr?.length || 0), 0)
  if (!totalFactors) {
    return Response.json({ error: 'Aucun facteur à analyser' }, { status: 400 })
  }

  const ctx = [
    projectName  && `Projet : ${projectName}`,
    projectTag   && `Secteur : ${projectTag}`,
    industry     && `Industrie : ${industry}`,
    geography    && `Géographie : ${geography}`,
  ].filter(Boolean).join('\n')

  const factorsText = DIMENSIONS.map(dimId => {
    const dimFactors = factors?.[dimId] || []
    if (!dimFactors.length) return null
    return `### ${DIM_LABELS[dimId]}\n` + dimFactors.map(f =>
      `- [${(f.nature || 'neutral').toUpperCase()}][${f.impact || 'medium'}] ${f.title}${f.description ? ` : ${f.description}` : ''}`
    ).join('\n')
  }).filter(Boolean).join('\n\n')

  const prompt = `Tu es un consultant stratégique senior spécialisé en analyse PESTEL.

${ctx ? `## CONTEXTE\n${ctx}\n` : ''}
## ANALYSE : ${analysisName}
## FACTEURS
${factorsText}

Génère une analyse stratégique PESTEL. Réponds UNIQUEMENT avec du JSON valide, sans backticks.

{
  "synthese": "3-4 phrases sur l'environnement macro et les forces dominantes.",
  "score_global": {
    "opportunites": 3.2,
    "menaces": 2.8,
    "volatilite": "Stable | Modérée | Volatile | Très volatile",
    "verdict": "Environnement favorable | Neutre | Défavorable | Très défavorable"
  },
  "dimensions": [
    {
      "id": "political",
      "dimension": "Politique",
      "score": 3,
      "tendance": "Favorable | Neutre | Défavorable",
      "analyse": "2-3 phrases spécifiques aux facteurs fournis.",
      "alerte": "Alerte critique ou null",
      "opportunite_cle": "Meilleure opportunité ou null"
    }
  ],
  "interactions": [
    {
      "dim_a": "technological",
      "dim_b": "legal",
      "type": "synergie | tension | amplification | neutralisation",
      "description": "Comment ces dimensions interagissent."
    }
  ],
  "opportunites": ["Opportunité #1", "Opportunité #2", "Opportunité #3"],
  "menaces": ["Menace #1", "Menace #2", "Menace #3"],
  "priorites": ["Action #1", "Action #2", "Action #3", "Action #4"],
  "veille": [
    {"signal": "Signal à surveiller", "dimension": "political", "frequence": "Hebdomadaire | Mensuelle | Trimestrielle"}
  ],
  "conclusion": "Verdict stratégique final en une phrase percutante."
}

Règles : score dimensions 1-5, score_global 1.0-5.0, analyser uniquement les facteurs fournis.`

  const response = await client.messages.create({
    model:      'claude-sonnet-4-20250514',
    max_tokens: 3000,
    messages:   [{ role: 'user', content: prompt }],
  })

  const rawText = response.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('')

  console.log('[PESTEL analyze] raw length:', rawText.length)

  const parsed = extractJSON(rawText)

  if (parsed) {
    return Response.json({ success: true, mode: 'analyze', result: parsed })
  }

  console.error('[PESTEL analyze] JSON parse failed. Raw:', rawText.slice(0, 500))

  // Graceful fallback for analyze mode
  const fallback = {
    synthese: rawText.slice(0, 600),
    score_global: { opportunites: 3, menaces: 3, volatilite: 'Modérée', verdict: 'Neutre' },
    dimensions: DIMENSIONS.map(id => ({
      id, dimension: DIM_LABELS[id], score: 3, tendance: 'Neutre',
      analyse: `Analyse ${DIM_LABELS[id]} — données insuffisantes pour une analyse approfondie.`,
      alerte: null, opportunite_cle: null,
    })),
    interactions: [],
    opportunites: ['Relancez l\'analyse avec un contexte plus détaillé.'],
    menaces:      ['Relancez l\'analyse avec un contexte plus détaillé.'],
    priorites:    ['Compléter les facteurs par dimension pour une analyse plus précise.'],
    veille:       [],
    conclusion:   'Une analyse plus complète est recommandée.',
  }

  return Response.json({ success: true, mode: 'analyze', result: fallback })
}