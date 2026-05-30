import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

// ── Robust JSON extractor ─────────────────────────────────────────────────────
function extractJSON(text) {
  if (!text) return null
  // Strip markdown fences
  const stripped = text.replace(/^```(?:json)?\s*/im, '').replace(/\s*```\s*$/im, '').trim()
  try { return JSON.parse(stripped) } catch {}
  const s = stripped.indexOf('{'), e = stripped.lastIndexOf('}')
  if (s !== -1 && e > s) { try { return JSON.parse(stripped.slice(s, e + 1)) } catch {} }
  const m = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/i)
  if (m) { try { return JSON.parse(m[1]) } catch {} }
  return null
}

const BLOCK_KEYS = [
  'keyPartners', 'keyActivities', 'keyResources',
  'valuePropositions', 'customerRelationships', 'channels',
  'customerSegments', 'costStructure', 'revenueStreams',
]

const BLOCK_LABELS = {
  keyPartners:           'Partenaires Clés',
  keyActivities:         'Activités Clés',
  keyResources:          'Ressources Clés',
  valuePropositions:     'Propositions de Valeur',
  customerRelationships: 'Relations Clients',
  channels:              'Canaux',
  customerSegments:      'Segments Clients',
  costStructure:         'Structure des Coûts',
  revenueStreams:        'Sources de Revenus',
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { company, industry, context } = body

    if (!company?.trim() && !context?.trim()) {
      return Response.json({ error: 'Décrivez votre entreprise ou projet pour générer le canvas.' }, { status: 400 })
    }

    const contextLines = [
      company  && `Entreprise : ${company}`,
      industry && `Secteur : ${industry}`,
      context  && `Description : ${context}`,
    ].filter(Boolean).join('\n')

    const prompt = `Tu es un expert en stratégie d'entreprise et modèle Osterwalder (Business Model Canvas).

## CONTEXTE
${contextLines}

Génère un Business Model Canvas complet, réaliste et actionnable pour ce projet.
Réponds UNIQUEMENT avec du JSON valide, sans backticks markdown, sans texte avant ou après.

{
  "company": "Nom exact de l'entreprise",
  "industry": "Secteur d'activité",
  "tagline": "Phrase de positionnement mémorable (max 12 mots)",
  "score": {
    "overall": 72,
    "viability": 70,
    "innovation": 68,
    "scalability": 75
  },
  "blocks": {
    "keyPartners": {
      "items": ["Partenaire #1 spécifique", "Partenaire #2", "Partenaire #3"],
      "insight": "Insight stratégique court sur les partenariats de ce modèle."
    },
    "keyActivities": {
      "items": ["Activité clé #1", "Activité #2", "Activité #3"],
      "insight": "Insight sur les activités différenciantes."
    },
    "keyResources": {
      "items": ["Ressource #1", "Ressource #2", "Ressource #3"],
      "insight": "Insight sur les ressources critiques."
    },
    "valuePropositions": {
      "items": ["Proposition de valeur principale", "VP secondaire", "Avantage différenciant"],
      "insight": "Insight sur la valeur créée pour les clients."
    },
    "customerRelationships": {
      "items": ["Type de relation #1", "Type #2"],
      "insight": "Insight sur la stratégie de fidélisation."
    },
    "channels": {
      "items": ["Canal #1 (ex: site web direct)", "Canal #2", "Canal #3"],
      "insight": "Insight sur l'efficacité des canaux de distribution."
    },
    "customerSegments": {
      "items": ["Segment cible principal", "Segment secondaire", "Persona clé"],
      "insight": "Insight sur la segmentation et le marché adressable."
    },
    "costStructure": {
      "items": ["Coût fixe principal", "Coût variable #1", "Investissement clé"],
      "insight": "Insight sur la structure de coûts et le point mort.",
      "type": "Cost-driven | Value-driven"
    },
    "revenueStreams": {
      "items": ["Flux de revenus #1 (ex: abonnement SaaS)", "Flux #2", "Flux #3"],
      "insight": "Insight sur la diversification et la récurrence des revenus.",
      "model": "Description courte du modèle de revenus"
    }
  },
  "strategic_insights": [
    "Insight stratégique #1 — spécifique et actionnable pour ce projet",
    "Insight #2 sur un levier de croissance identifié",
    "Insight #3 sur un risque ou une opportunité clé",
    "Insight #4 sur l'avantage concurrentiel"
  ],
  "opportunities": [
    "Opportunité de croissance #1 concrète",
    "Opportunité #2 liée au marché ou au timing",
    "Opportunité #3 d'expansion ou diversification"
  ],
  "risks": [
    {"level": "high",   "text": "Risque critique #1 à adresser en priorité"},
    {"level": "medium", "text": "Risque #2 à surveiller"},
    {"level": "low",    "text": "Risque mineur #3 à monitorer"}
  ]
}

Règles strictes :
- overall entre 40 et 95, scores entre 40 et 98
- 3 à 5 items par bloc (pas plus)
- Tous les éléments DOIVENT être spécifiques au contexte fourni — zéro générique
- Les insights doivent révéler des dynamiques non évidentes
- Le tagline doit être mémorable et précis
- level des risques : "high" | "medium" | "low"`

    const response = await client.messages.create({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages:   [{ role: 'user', content: prompt }],
    })

    const rawText = response.content.filter(b => b.type === 'text').map(b => b.text).join('')
    console.log('[BMC generate] raw length:', rawText.length, '| preview:', rawText.slice(0, 120))

    const parsed = extractJSON(rawText)

    if (!parsed || !parsed.blocks) {
      console.error('[BMC generate] parse failed. raw:', rawText.slice(0, 400))
      return Response.json({
        error: 'La génération IA a retourné un format inattendu — réessayez en précisant davantage votre contexte.',
      }, { status: 422 })
    }

    // Ensure all block keys exist with correct shape
    for (const key of BLOCK_KEYS) {
      if (!parsed.blocks[key]) {
        parsed.blocks[key] = { items: [], insight: '' }
      } else {
        if (!Array.isArray(parsed.blocks[key].items)) parsed.blocks[key].items = []
        if (!parsed.blocks[key].insight) parsed.blocks[key].insight = ''
      }
    }

    // Ensure score fields exist
    if (!parsed.score) parsed.score = {}
    parsed.score.overall    = parsed.score.overall    ?? 70
    parsed.score.viability  = parsed.score.viability  ?? 68
    parsed.score.innovation = parsed.score.innovation ?? 65
    parsed.score.scalability= parsed.score.scalability?? 72

    // Ensure arrays exist
    if (!Array.isArray(parsed.strategic_insights)) parsed.strategic_insights = []
    if (!Array.isArray(parsed.opportunities))      parsed.opportunities      = []
    if (!Array.isArray(parsed.risks))              parsed.risks              = []

    return Response.json(parsed)

  } catch (err) {
    console.error('[BMC generate] error:', err)
    return Response.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}