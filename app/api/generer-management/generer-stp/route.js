import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

// ── JSON parsing robuste (3 passes) ──────────────────────────────────────────
function parseJSON(text) {
  // 1. Direct
  try { return JSON.parse(text.trim()) } catch {}
  // 2. Strip markdown fences
  const stripped = text
    .replace(/^```(?:json)?\s*/im, '')
    .replace(/```\s*$/im, '')
    .trim()
  try { return JSON.parse(stripped) } catch {}
  // 3. Extract first JSON object
  const match = text.match(/\{[\s\S]*\}/)
  if (match) try { return JSON.parse(match[0]) } catch {}
  return null
}

// ── Valeurs autorisées ─────────────────────────────────────────────────────
const VALID_SEG_CATS    = ['geographic', 'demographic', 'psychographic', 'behavioral']
const VALID_GROWTH      = ['élevé', 'modéré', 'faible']
const VALID_STRATEGIES  = ['undifferentiated', 'differentiated', 'concentrated', 'micro']
const VALID_PRIORITIES  = ['primary', 'secondary', 'tertiary']
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

// ── Helpers de normalisation ───────────────────────────────────────────────
function normalizeSegmentation(raw) {
  const result = { geographic: [], demographic: [], psychographic: [], behavioral: [] }
  if (!raw || typeof raw !== 'object') return result

  for (const catId of VALID_SEG_CATS) {
    const items = Array.isArray(raw[catId]) ? raw[catId] : []
    result[catId] = items.map(seg => ({
      id:          uid(),
      label:       String(seg.label       || seg.name  || '').trim(),
      description: String(seg.description || '').trim(),
      size:        String(seg.size        || '').trim(),
      growth:      VALID_GROWTH.includes(seg.growth) ? seg.growth : 'modéré',
      relevance:   Math.min(5, Math.max(1, parseInt(seg.relevance) || 3)),
      category:    catId,
    })).filter(s => s.label)
  }
  return result
}

function normalizeTargeting(raw) {
  const defaultResult = {
    strategy:           'concentrated',
    strategyRationale:  '',
    segments:           [],
  }
  if (!raw || typeof raw !== 'object') return defaultResult

  const strategy = VALID_STRATEGIES.includes(raw.strategy) ? raw.strategy : 'concentrated'
  const segments  = Array.isArray(raw.segments) ? raw.segments : []

  return {
    strategy,
    strategyRationale: String(raw.strategyRationale || raw.rationale || '').trim(),
    segments: segments.map(seg => ({
      id:            uid(),
      label:         String(seg.label         || seg.name || '').trim(),
      segmentType:   String(seg.segmentType   || 'demographic'),
      priority:      VALID_PRIORITIES.includes(seg.priority) ? seg.priority : 'primary',
      potential:     Math.min(5, Math.max(1, parseInt(seg.potential)    || 3)),
      competition:   Math.min(5, Math.max(1, parseInt(seg.competition)  || 3)),
      fit:           Math.min(5, Math.max(1, parseInt(seg.fit)          || 3)),
      rationale:     String(seg.rationale     || '').trim(),
      estimatedSize: String(seg.estimatedSize || '').trim(),
      keyNeeds:      Array.isArray(seg.keyNeeds) ? seg.keyNeeds.map(String) : [],
    })).filter(s => s.label),
  }
}

function normalizePositioning(raw) {
  const empty = {
    targetCustomer:      '',
    category:            '',
    differentiator:      '',
    benefit:             '',
    proof:               '',
    valueProposition:    '',
    positioningStatement:'',
    timeHorizon:         '',
    pillars:             [],
    perceptualMap: {
      xAxis:       '',
      yAxis:       '',
      xLabel:      { low: '', high: '' },
      yLabel:      { low: '', high: '' },
      brand:       { x: 3, y: 3, label: 'Notre marque' },
      competitors: [],
    },
  }
  if (!raw || typeof raw !== 'object') return empty

  // Perceptual map
  const mapRaw = raw.perceptualMap || {}
  const competitors = Array.isArray(mapRaw.competitors) ? mapRaw.competitors : []
  const perceptualMap = {
    xAxis:  String(mapRaw.xAxis  || '').trim(),
    yAxis:  String(mapRaw.yAxis  || '').trim(),
    xLabel: {
      low:  String(mapRaw.xLabel?.low  || '').trim(),
      high: String(mapRaw.xLabel?.high || '').trim(),
    },
    yLabel: {
      low:  String(mapRaw.yLabel?.low  || '').trim(),
      high: String(mapRaw.yLabel?.high || '').trim(),
    },
    brand: {
      x:     Math.min(5, Math.max(1, parseFloat(mapRaw.brand?.x) || 3)),
      y:     Math.min(5, Math.max(1, parseFloat(mapRaw.brand?.y) || 3)),
      label: String(mapRaw.brand?.label || 'Notre marque').trim(),
    },
    competitors: competitors.map(c => ({
      id:   uid(),
      name: String(c.name || '').trim(),
      x:    Math.min(5, Math.max(1, parseFloat(c.x) || 3)),
      y:    Math.min(5, Math.max(1, parseFloat(c.y) || 3)),
    })).filter(c => c.name),
  }

  // Pillars
  const pillars = Array.isArray(raw.pillars) ? raw.pillars : []

  return {
    targetCustomer:       String(raw.targetCustomer      || '').trim(),
    category:             String(raw.category            || '').trim(),
    differentiator:       String(raw.differentiator      || '').trim(),
    benefit:              String(raw.benefit             || '').trim(),
    proof:                String(raw.proof               || '').trim(),
    valueProposition:     String(raw.valueProposition    || '').trim(),
    positioningStatement: String(raw.positioningStatement|| '').trim(),
    timeHorizon:          String(raw.timeHorizon         || '').trim(),
    pillars: pillars.map(p => ({
      id:          uid(),
      icon:        String(p.icon        || '⭐').trim(),
      title:       String(p.title       || '').trim(),
      description: String(p.description || '').trim(),
    })).filter(p => p.title),
    perceptualMap,
  }
}

// ── POST handler ──────────────────────────────────────────────────────────────
export async function POST(request) {
  try {
    const body               = await request.json()
    const contextDescription = String(body.contextDescription || '').trim()
    const projectName        = String(body.projectName        || '').trim()
    const projectTag         = String(body.projectTag         || '').trim()

    if (!contextDescription) {
      return Response.json({ error: 'Description du contexte requise' }, { status: 400 })
    }

    const contextMeta = [
      projectName ? `Projet : ${projectName}` : null,
      projectTag  ? `Tag : ${projectTag}`     : null,
    ].filter(Boolean).join('\n')

    const systemPrompt = `Tu es un expert en stratégie marketing, spécialisé dans l'analyse STP (Segmentation, Targeting, Positioning).
Tu génères des analyses STP précises, structurées et immédiatement utilisables.
Tu réponds UNIQUEMENT en JSON valide, sans balises markdown, sans aucun texte avant ou après.`

    const userPrompt = `Génère une analyse STP complète à partir de ce contexte :

${contextMeta ? `## META\n${contextMeta}\n\n` : ''}## CONTEXTE PROJET
${contextDescription}

---

Retourne UNIQUEMENT ce JSON (sans texte autour, sans backticks) :

{
  "companyName": "Nom de l'entreprise ou du projet détecté",
  "industry": "Secteur d'activité identifié",
  "contextSummary": "Résumé du contexte en 1-2 phrases pour confirmation utilisateur",

  "segmentation": {
    "geographic": [
      {
        "label": "Nom du segment géographique",
        "description": "Caractéristiques géographiques précises",
        "size": "Taille estimée (ex: 12M habitants)",
        "growth": "élevé",
        "relevance": 4
      }
    ],
    "demographic": [
      {
        "label": "Nom du segment démographique",
        "description": "Âge, genre, revenu, CSP, niveau d'études...",
        "size": "Taille estimée",
        "growth": "modéré",
        "relevance": 5
      }
    ],
    "psychographic": [
      {
        "label": "Nom du segment psychographique",
        "description": "Style de vie, valeurs, personnalité, centres d'intérêt...",
        "size": "",
        "growth": "modéré",
        "relevance": 4
      }
    ],
    "behavioral": [
      {
        "label": "Nom du segment comportemental",
        "description": "Comportement d'achat, fréquence, fidélité, occasion d'achat...",
        "size": "",
        "growth": "élevé",
        "relevance": 5
      }
    ]
  },

  "targeting": {
    "strategy": "concentrated",
    "strategyRationale": "Justification de la stratégie choisie en 1-2 phrases",
    "segments": [
      {
        "label": "Nom du segment cible prioritaire",
        "segmentType": "demographic",
        "priority": "primary",
        "potential": 4,
        "competition": 3,
        "fit": 5,
        "rationale": "Pourquoi ce segment est prioritaire",
        "estimatedSize": "TAM/SAM estimé",
        "keyNeeds": ["Besoin clé 1", "Besoin clé 2", "Besoin clé 3"]
      },
      {
        "label": "Nom du segment cible secondaire",
        "segmentType": "behavioral",
        "priority": "secondary",
        "potential": 3,
        "competition": 2,
        "fit": 4,
        "rationale": "Pourquoi ce segment est secondaire",
        "estimatedSize": "",
        "keyNeeds": ["Besoin 1", "Besoin 2"]
      }
    ]
  },

  "positioning": {
    "targetCustomer": "Description précise du client idéal (persona)",
    "category": "Catégorie de marché dans laquelle vous vous positionnez",
    "differentiator": "Ce qui vous rend unique et défendable vs concurrents",
    "benefit": "Bénéfice principal concret pour le client",
    "proof": "Raison de croire — preuve tangible ou certifiable",
    "valueProposition": "Proposition de valeur complète en 2-3 phrases",
    "positioningStatement": "Pour [client cible], [marque/produit] est le/la [catégorie] qui [différenciateur principal] parce que [preuve clé].",
    "timeHorizon": "Ambition à 2-3 ans",
    "pillars": [
      { "icon": "🚀", "title": "Pilier 1", "description": "Description du pilier de positionnement" },
      { "icon": "💎", "title": "Pilier 2", "description": "Description du pilier de positionnement" },
      { "icon": "🤝", "title": "Pilier 3", "description": "Description du pilier de positionnement" }
    ],
    "perceptualMap": {
      "xAxis": "Axe X de la carte (ex: Prix)",
      "yAxis": "Axe Y de la carte (ex: Qualité)",
      "xLabel": { "low": "Économique", "high": "Premium" },
      "yLabel": { "low": "Basique", "high": "Excellence" },
      "brand": { "x": 3.5, "y": 4.2, "label": "Nous" },
      "competitors": [
        { "name": "Concurrent A", "x": 4.0, "y": 2.5 },
        { "name": "Concurrent B", "x": 2.0, "y": 3.5 },
        { "name": "Concurrent C", "x": 3.0, "y": 2.0 }
      ]
    }
  }
}

RÈGLES IMPÉRATIVES :
- "growth" : uniquement "élevé", "modéré" ou "faible"
- "strategy" : uniquement "undifferentiated", "differentiated", "concentrated" ou "micro"
- "priority" : uniquement "primary", "secondary" ou "tertiary"
- "relevance", "potential", "competition", "fit" : entiers de 1 à 5
- "x", "y" dans perceptualMap : décimaux de 1.0 à 5.0
- Génère 2-3 segments par catégorie de segmentation
- Génère 2-3 segments cibles dans targeting (1 primary, 1-2 secondary)
- Génère 3 piliers de positionnement
- Génère 3 concurrents dans la carte perceptuelle
- Tout doit être adapté précisément au secteur et au contexte fourni
- Les scores doivent refléter la réalité du marché décrit`

    const response = await client.messages.create({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system:     systemPrompt,
      messages:   [{ role: 'user', content: userPrompt }],
    })

    const rawText = response.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('')

    const parsed = parseJSON(rawText)

    if (!parsed) {
      console.error('generer-stp: parse fail. Raw:', rawText.slice(0, 500))
      return Response.json(
        { error: 'Réponse IA invalide — impossible de parser le JSON' },
        { status: 500 }
      )
    }

    // Vérification minimale
    if (!parsed.segmentation && !parsed.targeting && !parsed.positioning) {
      console.error('generer-stp: structure manquante. Parsed:', JSON.stringify(parsed).slice(0, 300))
      return Response.json(
        { error: 'Structure STP incomplète dans la réponse IA' },
        { status: 500 }
      )
    }

    // Normalisation complète
    const data = {
      companyName:    String(parsed.companyName    || '').trim(),
      industry:       String(parsed.industry       || '').trim(),
      contextSummary: String(parsed.contextSummary || '').trim(),
      segmentation:   normalizeSegmentation(parsed.segmentation),
      targeting:      normalizeTargeting(parsed.targeting),
      positioning:    normalizePositioning(parsed.positioning),
    }

    return Response.json({ success: true, data })

  } catch (err) {
    console.error('generer-stp error:', err)
    return Response.json(
      { error: err.message || 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}