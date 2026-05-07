import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function extractJSON(text) {
  let clean = text.trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim()
  try { return JSON.parse(clean) } catch {}
  const start = clean.indexOf('{')
  if (start === -1) throw new Error('No JSON found')
  let depth = 0, inStr = false, escape = false
  for (let i = start; i < clean.length; i++) {
    const ch = clean[i]
    if (escape) { escape = false; continue }
    if (ch === '\\' && inStr) { escape = true; continue }
    if (ch === '"') inStr = !inStr
    if (!inStr) {
      if (ch === '{') depth++
      if (ch === '}') { depth--; if (depth === 0) { try { return JSON.parse(clean.slice(start, i + 1)) } catch {} } }
    }
  }
  throw new Error('Invalid JSON')
}

export async function POST(request) {
  try {
    const { prompt } = await request.json()
    if (!prompt) return NextResponse.json({ error: 'Prompt requis' }, { status: 400 })

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      system: `Tu es un expert en création de mind maps structurées.
Tu génères UNIQUEMENT du JSON valide et COMPLET selon le format exact spécifié.
Réponds UNIQUEMENT avec le JSON, sans markdown, sans backticks, sans texte avant ou après.

TYPES DE NŒUDS DISPONIBLES : center, goal, action, problem, idea, note, pin

RÈGLES DE POSITIONNEMENT :
- Le nœud central (type: center) toujours à x:520, y:340
- Les nœuds autour espacés de 250-300px du centre
- Disposition en étoile ou rayonnante selon le contenu
- width: 180 pour center, 150-170 pour les autres, 80 pour pin
- height: 64 pour center, 56 pour les autres

FORMAT JSON EXACT :
{
  "nodes": [
    { "id": "n1", "type": "center", "x": 520, "y": 340, "label": "Titre Central", "detail": "Description détaillée", "width": 180, "height": 64 },
    { "id": "n2", "type": "goal", "x": 820, "y": 200, "label": "Objectif 1", "detail": "Détails...", "width": 160, "height": 56 }
  ],
  "edges": [
    { "id": "e1", "from": "n1", "to": "n2" }
  ]
}

RÈGLES :
- Génère entre 6 et 12 nœuds selon la complexité du sujet
- Toujours connecter les nœuds secondaires au nœud central
- Utiliser les types de manière cohérente : center=sujet principal, goal=objectifs, action=actions concrètes, problem=obstacles, idea=idées, note=informations, pin=détails courts
- Les labels doivent être courts (max 4 mots)
- Les details doivent être informatifs et concrets`,
      messages: [{
        role: 'user',
        content: `Génère un mind map JSON pour le sujet suivant : "${prompt}"
        
Crée une structure cohérente et bien organisée avec des nœuds pertinents pour ce sujet.
Assure-toi que toutes les connexions sont logiques et que le JSON est complet et valide.`
      }]
    })

    const text = message.content[0].text
    const data = extractJSON(text)

    if (!data.nodes || !Array.isArray(data.nodes) || !data.edges || !Array.isArray(data.edges)) {
      return NextResponse.json({ error: 'Structure JSON invalide' }, { status: 500 })
    }

    // Validate and clean nodes
    data.nodes = data.nodes.map(n => ({
      id: n.id || `n${Math.random()}`,
      type: ['center','goal','action','problem','idea','note','pin'].includes(n.type) ? n.type : 'note',
      x: Number(n.x) || 520,
      y: Number(n.y) || 340,
      label: String(n.label || 'Nœud'),
      detail: String(n.detail || ''),
      width: Number(n.width) || 160,
      height: Number(n.height) || 56,
    }))

    // Validate edges
    const nodeIds = new Set(data.nodes.map(n => n.id))
    data.edges = data.edges.filter(e => e.from && e.to && nodeIds.has(e.from) && nodeIds.has(e.to))

    return NextResponse.json(data)

  } catch (error) {
    console.error('PPM generation error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}