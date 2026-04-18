import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req) {
  try {
    const { description } = await req.json()

    if (!description?.trim()) {
      return NextResponse.json({ error: 'Description manquante' }, { status: 400 })
    }

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: `You are a workflow designer expert. Analyze this workflow description and generate a structured JSON workflow diagram.

DESCRIPTION: "${description}"

Return ONLY a valid JSON object with this exact structure (no markdown, no comments, no backticks):
{
  "nodes": [
    {
      "id": "unique_string_id",
      "type": "start|end|process|decision|data|document|connector",
      "label": "Short label text",
      "x": number,
      "y": number,
      "width": number,
      "height": number
    }
  ],
  "edges": [
    {
      "from": "node_id",
      "to": "node_id",
      "label": "optional edge label",
      "dashed": false
    }
  ]
}

RULES:
- Use type "start" for the beginning (green oval), "end" for termination (red oval)
- Use type "process" for actions/tasks (blue rectangle)
- Use type "decision" for yes/no branches (yellow diamond)
- Use type "data" for input/output data (purple parallelogram)
- Use type "document" for documents/reports (cyan document shape)
- Use type "connector" for connection points (gray small circle)
- Layout nodes in a logical top-to-bottom or left-to-right flow
- Start at x:100, y:50, space nodes at least 120px apart vertically and 200px horizontally
- process nodes: width:140, height:50
- decision nodes: width:150, height:70
- start/end nodes: width:120, height:44
- data nodes: width:140, height:50
- document nodes: width:140, height:56
- connector nodes: width:40, height:40
- For decisions, use dashed:true for the "No" branch edge
- Add meaningful edge labels for decision branches (Oui/Non, Approuvé/Rejeté, etc.)
- Generate 6-15 nodes depending on complexity
- Keep labels concise (max 4 words)
- Ensure every path leads to an "end" node
- Position nodes to avoid overlapping

Generate the workflow now:`
      }]
    })

    const raw = message.content[0]?.text?.trim() || ''
    const clean = raw.replace(/```json|```/g, '').trim()

    let workflow
    try {
      workflow = JSON.parse(clean)
    } catch {
      // Try to extract JSON from response
      const match = clean.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('Claude n\'a pas retourné un JSON valide')
      workflow = JSON.parse(match[0])
    }

    if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
      throw new Error('Structure de workflow invalide')
    }

    // Sanitize and validate nodes
    workflow.nodes = workflow.nodes.map((n, i) => ({
      id: n.id || `node_${i}`,
      type: ['start', 'end', 'process', 'decision', 'data', 'document', 'connector'].includes(n.type) ? n.type : 'process',
      label: String(n.label || 'Étape').slice(0, 40),
      x: Number(n.x) || 100 + (i % 3) * 200,
      y: Number(n.y) || 50 + Math.floor(i / 3) * 120,
      width: Number(n.width) || 140,
      height: Number(n.height) || 50,
    }))

    workflow.edges = (workflow.edges || []).map(e => ({
      from: String(e.from || ''),
      to: String(e.to || ''),
      label: e.label ? String(e.label).slice(0, 20) : '',
      dashed: !!e.dashed,
    })).filter(e => e.from && e.to)

    return NextResponse.json(workflow)

  } catch (err) {
    console.error('[generer-workflow]', err)
    return NextResponse.json({ error: err.message || 'Erreur interne' }, { status: 500 })
  }
}