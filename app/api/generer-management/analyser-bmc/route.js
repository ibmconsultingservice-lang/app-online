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

// ── Block metadata ────────────────────────────────────────────────────────────
const BLOCKS_META = {
  keyPartners:           { label: 'KP', title: 'Partenaires Clés'       },
  keyActivities:         { label: 'KA', title: 'Activités Clés'         },
  keyResources:          { label: 'KR', title: 'Ressources Clés'        },
  valuePropositions:     { label: 'VP', title: 'Propositions de Valeur' },
  customerRelationships: { label: 'CR', title: 'Relations Clients'      },
  channels:              { label: 'CH', title: 'Canaux'                 },
  customerSegments:      { label: 'CS', title: 'Segments Clients'       },
  costStructure:         { label: 'C$', title: 'Structure des Coûts'    },
  revenueStreams:        { label: 'R$', title: 'Sources de Revenus'     },
}

// ── Check canvas has content ──────────────────────────────────────────────────
function hasContent(canvas) {
  if (!canvas) return false
  const blocks = canvas.blocks || canvas
  if (typeof blocks !== 'object') return false
  return Object.keys(BLOCKS_META).some(k => {
    const b = blocks[k]
    return Array.isArray(b?.items) ? b.items.length > 0 : false
  })
}

// ── Serialize canvas for prompt ───────────────────────────────────────────────
function serializeCanvas(canvas) {
  const blocks = canvas.blocks || canvas
  return Object.entries(BLOCKS_META).map(([key, meta]) => {
    const block = blocks[key]
    if (!block) return null
    const items = Array.isArray(block.items) ? block.items : []
    if (!items.length) return null
    return `### ${meta.label} — ${meta.title}\n${items.map(it => `- ${it}`).join('\n')}`
  }).filter(Boolean).join('\n\n')
}

// ── POST ──────────────────────────────────────────────────────────────────────
export async function POST(request) {
  try {
    const body = await request.json()
    const { canvas, projectName, projectTag } = body

    // Validate canvas presence
    if (!canvas) {
      return Response.json({
        error: 'Canvas requis — aucun canvas transmis. Générez ou importez un BMC d\'abord.',
      }, { status: 400 })
    }

    // Validate canvas has at least one filled block
    if (!hasContent(canvas)) {
      return Response.json({
        error: 'Canvas vide — ajoutez des éléments dans au moins un bloc avant d\'analyser.',
      }, { status: 400 })
    }

    const contextLines = [
      projectName && `Projet : ${projectName}`,
      projectTag  && `Secteur : ${projectTag}`,
      canvas.company  && `Entreprise : ${canvas.company}`,
      canvas.industry && `Industrie : ${canvas.industry}`,
      canvas.tagline  && `Positionnement : ${canvas.tagline}`,
    ].filter(Boolean).join('\n')

    const canvasText = serializeCanvas(canvas)

    const filledBlocks = Object.keys(BLOCKS_META).filter(k => {
      const b = (canvas.blocks || canvas)[k]
      return Array.isArray(b?.items) && b.items.length > 0
    })

    const prompt = `Tu es un consultant senior spécialisé en modèles d'affaires et méthode Osterwalder.

${contextLines ? `## CONTEXTE\n${contextLines}\n` : ''}

## BUSINESS MODEL CANVAS (${filledBlocks.length}/9 blocs remplis)

${canvasText}

Génère une analyse stratégique approfondie de ce BMC. Identifie les forces, faiblesses, incohérences et opportunités cachées.
Réponds UNIQUEMENT avec du JSON valide, sans backticks, sans texte avant ou après.

{
  "score": {
    "overall": 72,
    "viability": 70,
    "innovation": 65,
    "scalability": 75,
    "commentaire": "Synthèse du score en une phrase percutante."
  },

  "diagnostic": "Diagnostic global du BMC en 3-5 phrases : forces du modèle, gaps critiques, viabilité perçue et recommandation principale.",

  "blocs": [
    {
      "key": "valuePropositions",
      "statut": "fort | moyen | faible",
      "analyse": "Analyse de 2-3 phrases spécifiques aux éléments de ce bloc — pas générique.",
      "suggestion": "Action concrète et prioritaire pour renforcer ce bloc (max 15 mots).",
      "items_a_ajouter": ["Élément suggéré #1 à ajouter directement", "Élément #2"]
    }
  ],

  "coherences": [
    {
      "type": "alignement | tension | opportunite",
      "description": "Description concrète de l'alignement, tension ou opportunité entre 2 blocs spécifiques du canvas."
    }
  ],

  "priorites": [
    "Priorité #1 — action immédiate avec impact le plus fort",
    "Priorité #2",
    "Priorité #3",
    "Priorité #4 (si pertinent)"
  ],

  "opportunites_cachees": [
    "Opportunité stratégique non exploitée identifiée dans le canvas",
    "Opportunité #2 de pivot ou d'extension",
    "Opportunité #3 d'optimisation des flux"
  ],

  "risques": [
    {"level": "high",   "text": "Risque critique identifié dans le modèle actuel"},
    {"level": "medium", "text": "Risque modéré à surveiller"},
    {"level": "low",    "text": "Risque mineur ou tendance à anticiper"}
  ],

  "conclusion": "Verdict stratégique final en 1-2 phrases percutantes sur la solidité du modèle et le chemin recommandé."
}

Règles strictes :
- N'analyser QUE les blocs fournis (ignore les blocs vides)
- Chaque analyse de bloc doit citer les éléments réels fournis
- overall entre 30 et 95 (honnête, pas flatteur)
- statut : "fort" si le bloc est solide et différenciant, "moyen" si correct mais améliorable, "faible" si lacunaire ou risqué
- items_a_ajouter : 2-3 suggestions concrètes et spécifiques au contexte, cliquables pour ajout direct
- coherences : au minimum 2 alignements ET 1 tension réels entre blocs
- priorites : classées par impact décroissant, actionnables immédiatement
- level des risques : "high" | "medium" | "low"`

    const response = await client.messages.create({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 3500,
      messages:   [{ role: 'user', content: prompt }],
    })

    const rawText = response.content.filter(b => b.type === 'text').map(b => b.text).join('')
    console.log('[BMC analyze] raw length:', rawText.length, '| preview:', rawText.slice(0, 120))

    const parsed = extractJSON(rawText)

    if (!parsed) {
      console.error('[BMC analyze] parse failed. raw:', rawText.slice(0, 500))
      return Response.json({
        error: 'L\'analyse IA a retourné un format inattendu — réessayez.',
      }, { status: 422 })
    }

    // Normalize + ensure all fields exist
    if (!parsed.score) parsed.score = {}
    parsed.score.overall     = parsed.score.overall     ?? 68
    parsed.score.viability   = parsed.score.viability   ?? 65
    parsed.score.innovation  = parsed.score.innovation  ?? 62
    parsed.score.scalability = parsed.score.scalability ?? 70
    parsed.score.commentaire = parsed.score.commentaire ?? ''

    if (!Array.isArray(parsed.blocs))               parsed.blocs               = []
    if (!Array.isArray(parsed.coherences))          parsed.coherences          = []
    if (!Array.isArray(parsed.priorites))           parsed.priorites           = []
    if (!Array.isArray(parsed.opportunites_cachees))parsed.opportunites_cachees= []
    if (!Array.isArray(parsed.risques))             parsed.risques             = []

    // Normalize blocs: ensure items_a_ajouter is always an array
    parsed.blocs = parsed.blocs.map(b => ({
      ...b,
      items_a_ajouter: Array.isArray(b.items_a_ajouter) ? b.items_a_ajouter : [],
    }))

    return Response.json({ success: true, result: parsed })

  } catch (err) {
    console.error('[BMC analyze] error:', err)
    return Response.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}