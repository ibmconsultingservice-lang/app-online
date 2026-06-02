import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

// ── Robust JSON extractor ─────────────────────────────────────────────────────
function extractJSON(text) {
  if (!text) return null
  const stripped = text.replace(/^```(?:json)?\s*/im, '').replace(/\s*```\s*$/im, '').trim()
  try { return JSON.parse(stripped) } catch {}
  const s = stripped.indexOf('{'), e = stripped.lastIndexOf('}')
  if (s !== -1 && e > s) { try { return JSON.parse(stripped.slice(s, e + 1)) } catch {} }
  const m = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/i)
  if (m) { try { return JSON.parse(m[1]) } catch {} }
  return null
}

// ── Forces metadata ───────────────────────────────────────────────────────────
const FORCES_META = {
  rivalry: {
    label: 'Rivalité entre concurrents',
    description: 'Intensité de la compétition entre les acteurs existants',
    factors: ['Nombre élevé de concurrents', 'Croissance lente du marché', 'Coûts fixes élevés', 'Faible différenciation', 'Barrières à la sortie élevées', 'Guerres de prix fréquentes'],
  },
  newEntrants: {
    label: 'Menace de nouveaux entrants',
    description: "Facilité avec laquelle de nouveaux concurrents peuvent pénétrer le marché",
    factors: ["Faibles barrières à l'entrée", "Économies d'échelle inexistantes", 'Peu de capital requis', 'Absence de réglementation', 'Faible fidélisation clients', 'Accès facile aux technologies'],
  },
  substitutes: {
    label: 'Menace des produits substituts',
    description: 'Risque que des produits/services alternatifs détournent vos clients',
    factors: ['Alternatives nombreuses', 'Prix des substituts attractifs', 'Facilité de switching', 'Performances comparables', 'Innovation technologique rapide', 'Changements des habitudes'],
  },
  suppliers: {
    label: 'Pouvoir de négociation des fournisseurs',
    description: 'Capacité des fournisseurs à imposer leurs conditions',
    factors: ['Fournisseurs concentrés', "Absence d'alternatives", 'Coûts de changement élevés', 'Intégration verticale possible', 'Matières premières rares', 'Dépendance technologique'],
  },
  buyers: {
    label: 'Pouvoir de négociation des clients',
    description: 'Capacité des acheteurs à faire pression sur les prix et conditions',
    factors: ['Acheteurs concentrés', "Volume d'achat important", 'Faible coût de switching', 'Forte sensibilité aux prix', 'Produits standardisés', 'Acheteurs informés'],
  },
}

const INTENSITY_LABELS = { 1: 'Très faible', 2: 'Faible', 3: 'Modérée', 4: 'Élevée', 5: 'Très élevée' }
const scoreToLabel = (s) => INTENSITY_LABELS[Math.round(s)] || 'Modérée'

const getAttractiveness = (avg) => {
  if (avg <= 1.8) return { label: 'Très attractive', color: 'green' }
  if (avg <= 2.6) return { label: 'Attractive',       color: 'teal'   }
  if (avg <= 3.4) return { label: 'Neutre',            color: 'yellow' }
  if (avg <= 4.2) return { label: 'Peu attractive',    color: 'orange' }
  return               { label: 'Non attractive',   color: 'red'    }
}

// ── POST ──────────────────────────────────────────────────────────────────────
export async function POST(request) {
  try {
    const body = await request.json()
    const { mode = 'analyse' } = body
    return mode === 'generate' ? handleGenerate(body) : handleAnalyse(body)
  } catch (err) {
    console.error('[Porter] error:', err)
    return Response.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// MODE 1 — GENERATE : auto-score all 5 forces from free-text context
// ══════════════════════════════════════════════════════════════════════════════
async function handleGenerate(body) {
  const { analysisName, context, sector, projectName, projectTag } = body

  if (!context?.trim()) {
    return Response.json({ error: 'Contexte requis pour la génération automatique des 5 forces.' }, { status: 400 })
  }

  const ctx = [
    projectName && `Projet : ${projectName}`,
    projectTag  && `Tag secteur : ${projectTag}`,
    sector      && `Secteur : ${sector}`,
    `Contexte : ${context}`,
  ].filter(Boolean).join('\n')

  const prompt = `Tu es un expert en stratégie d'entreprise spécialisé dans le modèle des 5 Forces de Michael Porter.

## CONTEXTE
${ctx}

## ANALYSE : ${analysisName}

À partir de ce contexte, évalue les 5 Forces de Porter et génère une analyse stratégique complète.
Réponds UNIQUEMENT avec du JSON valide, sans backticks markdown, sans texte avant ou après.

{
  "generatedForces": {
    "rivalry": {
      "score": 3.5,
      "factors": ["Facteur identifié #1 spécifique au contexte", "Facteur #2", "Facteur #3"],
      "notes": "Observation spécifique sur la rivalité dans ce secteur (1-2 phrases).",
      "aiSummary": "Résumé analytique de 2-3 phrases expliquant le niveau d'intensité de cette force et ses implications concrètes pour l'entreprise."
    },
    "newEntrants": {
      "score": 2.5,
      "factors": ["Facteur #1", "Facteur #2"],
      "notes": "Observation sur les barrières à l'entrée.",
      "aiSummary": "Résumé analytique 2-3 phrases."
    },
    "substitutes": {
      "score": 3.0,
      "factors": ["Facteur #1", "Facteur #2"],
      "notes": "Observation sur les substituts.",
      "aiSummary": "Résumé analytique 2-3 phrases."
    },
    "suppliers": {
      "score": 2.0,
      "factors": ["Facteur #1", "Facteur #2"],
      "notes": "Observation sur le pouvoir fournisseurs.",
      "aiSummary": "Résumé analytique 2-3 phrases."
    },
    "buyers": {
      "score": 3.5,
      "factors": ["Facteur #1", "Facteur #2", "Facteur #3"],
      "notes": "Observation sur le pouvoir acheteurs.",
      "aiSummary": "Résumé analytique 2-3 phrases."
    }
  },
  "result": {
    "synthese": "Synthèse globale de 3-4 phrases sur l'attractivité du marché, les forces dominantes et l'enjeu stratégique principal.",
    "forces": [
      {
        "key": "rivalry",
        "analyse": "Analyse spécifique 2-3 phrases basée sur le contexte fourni.",
        "action": "Action stratégique courte et concrète (max 10 mots)"
      },
      {"key": "newEntrants", "analyse": "...", "action": "..."},
      {"key": "substitutes",  "analyse": "...", "action": "..."},
      {"key": "suppliers",    "analyse": "...", "action": "..."},
      {"key": "buyers",       "analyse": "...", "action": "..."}
    ],
    "opportunites": [
      "Opportunité stratégique #1 concrète et actionnable",
      "Opportunité #2",
      "Opportunité #3 (si pertinent)"
    ],
    "menaces": [
      "Menace prioritaire #1",
      "Menace #2",
      "Menace #3 (si pertinent)"
    ],
    "recommandations": [
      "Recommandation stratégique #1 prioritaire et mesurable",
      "Recommandation #2",
      "Recommandation #3",
      "Recommandation #4 (si pertinent)"
    ],
    "conclusion": "Phrase de conclusion stratégique percutante sur le positionnement recommandé."
  }
}

Règles strictes :
- score entre 1.0 et 5.0 (1=très faible, 5=très élevée) — basé honnêtement sur le contexte
- 2 à 4 factors par force, choisis parmi les facteurs classiques Porter les plus pertinents pour ce secteur
- Chaque aiSummary doit citer des éléments concrets du contexte fourni
- Les forces à score élevé (4-5) → action défensive/atténuation
- Les forces à score faible (1-2) → action pour exploiter l'avantage
- Tout doit être spécifique au contexte — zéro générique`

  const response = await client.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 3500,
    messages:   [{ role: 'user', content: prompt }],
  })

  const rawText = response.content.filter(b => b.type === 'text').map(b => b.text).join('')
  console.log('[Porter generate] raw length:', rawText.length)

  const parsed = extractJSON(rawText)

  if (!parsed || !parsed.generatedForces) {
    console.error('[Porter generate] parse failed:', rawText.slice(0, 400))
    return Response.json({
      error: 'La génération IA a retourné un format inattendu — réessayez avec un contexte plus détaillé.',
    }, { status: 422 })
  }

  // Normalize each force
  const FORCE_KEYS = ['rivalry', 'newEntrants', 'substitutes', 'suppliers', 'buyers']
  for (const key of FORCE_KEYS) {
    if (!parsed.generatedForces[key]) {
      parsed.generatedForces[key] = { score: 3, factors: [], notes: '', aiSummary: '' }
    } else {
      const f = parsed.generatedForces[key]
      f.score     = Math.min(5, Math.max(1, parseFloat(f.score) || 3))
      f.factors   = Array.isArray(f.factors) ? f.factors : []
      f.notes     = f.notes     || ''
      f.aiSummary = f.aiSummary || ''
    }
  }

  // Normalize result
  if (!parsed.result) parsed.result = null

  return Response.json({
    success:         true,
    mode:            'generate',
    generatedForces: parsed.generatedForces,
    result:          parsed.result,
  })
}

// ══════════════════════════════════════════════════════════════════════════════
// MODE 2 — ANALYSE : strategic analysis of manually-scored forces
// ══════════════════════════════════════════════════════════════════════════════
async function handleAnalyse(body) {
  const { analysisName, context, sector, forces, projectName, projectTag } = body

  if (!forces || Object.keys(forces).length === 0) {
    return Response.json({ error: 'Aucune force évaluée' }, { status: 400 })
  }

  const scores  = Object.values(forces).map(f => f.score || 3)
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length
  const attracts = getAttractiveness(avgScore)

  const ctx = [
    projectName && `Projet : ${projectName}`,
    projectTag  && `Tag : ${projectTag}`,
    sector      && `Secteur : ${sector}`,
    context     && `Contexte : ${context}`,
  ].filter(Boolean).join('\n')

  const forcesDetail = Object.entries(forces).map(([key, f]) => {
    const meta = FORCES_META[key]
    return `### ${meta?.label || key} — Score : ${(f.score || 3).toFixed(1)}/5 (${scoreToLabel(f.score || 3)})
${meta?.description || ''}
${f.factors?.length ? `Facteurs identifiés : ${f.factors.join(', ')}` : ''}
${f.notes ? `Notes : ${f.notes}` : ''}`
  }).join('\n\n')

  const prompt = `Tu es un consultant en stratégie d'entreprise senior, expert du modèle des 5 Forces de Michael Porter.

${ctx ? `## CONTEXTE\n${ctx}\n` : ''}

## ANALYSE : ${analysisName}
Score global d'attractivité : ${avgScore.toFixed(1)}/5 → ${attracts.label}

## ÉVALUATION DES 5 FORCES
${forcesDetail}

Génère une analyse stratégique Porter approfondie et personnalisée.
Réponds UNIQUEMENT avec du JSON valide, sans backticks, sans texte avant ou après.

{
  "synthese": "Paragraphe de 3-5 phrases sur l'attractivité globale du marché, les forces dominantes, les risques et opportunités clés. Sois précis et actionnable.",

  "forces": [
    {
      "key": "rivalry",
      "analyse": "Analyse spécifique 2-3 phrases : pourquoi cette force a ce niveau, implications concrètes.",
      "action": "Action stratégique courte et concrète (max 10 mots)"
    },
    {"key": "newEntrants", "analyse": "...", "action": "..."},
    {"key": "substitutes",  "analyse": "...", "action": "..."},
    {"key": "suppliers",    "analyse": "...", "action": "..."},
    {"key": "buyers",       "analyse": "...", "action": "..."}
  ],

  "opportunites": [
    "Opportunité stratégique #1 concrète et actionnable",
    "Opportunité #2",
    "Opportunité #3 (si pertinent)"
  ],

  "menaces": [
    "Menace prioritaire #1 à surveiller",
    "Menace #2",
    "Menace #3 (si pertinent)"
  ],

  "recommandations": [
    "Recommandation stratégique #1 prioritaire et mesurable",
    "Recommandation #2",
    "Recommandation #3",
    "Recommandation #4 (si pertinent)",
    "Recommandation #5 (si pertinent)"
  ],

  "conclusion": "Phrase de conclusion stratégique percutante sur le positionnement recommandé face à ces 5 forces."
}

Règles impératives :
- Chaque analyse de force doit être spécifique au contexte fourni et aux facteurs identifiés — pas de théorie générique
- Forces à haute intensité (4-5) → actions défensives/d'atténuation
- Forces à faible intensité (1-2) → actions pour exploiter l'avantage concurrentiel
- Identifie les interactions et synergies entre forces (ex: fort pouvoir fournisseur qui aggrave la rivalité)
- Adapte au secteur précis si fourni`

  const response = await client.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 2500,
    messages:   [{ role: 'user', content: prompt }],
  })

  const rawText = response.content.filter(b => b.type === 'text').map(b => b.text).join('')
  console.log('[Porter analyse] raw length:', rawText.length)

  const parsed = extractJSON(rawText)

  if (!parsed) {
    console.error('[Porter analyse] parse failed:', rawText.slice(0, 400))
    // Graceful fallback
    const fallback = {
      synthese: rawText.slice(0, 500) || 'Analyse en cours de traitement.',
      forces: Object.keys(forces).map(key => ({
        key,
        analyse: `Force "${FORCES_META[key]?.label || key}" — score ${(forces[key]?.score || 3).toFixed(1)}/5.`,
        action:  forces[key]?.score >= 4 ? 'Mettre en place des barrières défensives' : 'Capitaliser sur cet avantage concurrentiel',
      })),
      opportunites: ["Relancez l'analyse avec plus de contexte."],
      menaces:      ["Relancez l'analyse avec plus de contexte."],
      recommandations: ['Précisez le contexte et les facteurs pour des recommandations personnalisées.'],
      conclusion: 'Une analyse approfondie est recommandée avec davantage de contexte.',
    }
    return Response.json({ success: true, result: fallback })
  }

  // Normalize arrays
  if (!Array.isArray(parsed.forces))          parsed.forces          = []
  if (!Array.isArray(parsed.opportunites))    parsed.opportunites    = []
  if (!Array.isArray(parsed.menaces))         parsed.menaces         = []
  if (!Array.isArray(parsed.recommandations)) parsed.recommandations = []

  return Response.json({ success: true, mode: 'analyse', result: parsed })
}