import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req) {
  try {
    const { company, industry, context, mode } = await req.json()

    if (!company?.trim()) {
      return NextResponse.json({ error: 'Nom de l\'entreprise requis' }, { status: 400 })
    }

    const systemPrompt = `Tu es un expert en stratégie d'entreprise et en Business Model Canvas (méthode Osterwalder).
Tu génères des BMC précis, concrets et actionnables.
Réponds UNIQUEMENT avec un JSON valide, sans markdown, sans backticks, sans commentaires.`

    const userPrompt = `Génère un Business Model Canvas complet pour :
Entreprise : "${company}"
Secteur : "${industry || 'Non spécifié'}"
Contexte : "${context || 'Startup en phase de lancement'}"
Mode : "${mode || 'analyse'}" ${mode === 'generate' ? '(générer de zéro)' : '(analyser et enrichir)'}

Génère exactement ce JSON :
{
  "company": "nom",
  "industry": "secteur",
  "tagline": "phrase d'accroche courte et percutante",
  "score": {
    "overall": 72,
    "viability": 80,
    "innovation": 65,
    "scalability": 70
  },
  "blocks": {
    "keyPartners": {
      "title": "Partenaires Clés",
      "items": ["partenaire 1", "partenaire 2", "partenaire 3", "partenaire 4"],
      "insight": "Une observation stratégique courte sur ce bloc"
    },
    "keyActivities": {
      "title": "Activités Clés",
      "items": ["activité 1", "activité 2", "activité 3", "activité 4"],
      "insight": "Une observation stratégique courte sur ce bloc"
    },
    "keyResources": {
      "title": "Ressources Clés",
      "items": ["ressource 1", "ressource 2", "ressource 3", "ressource 4"],
      "insight": "Une observation stratégique courte sur ce bloc"
    },
    "valuePropositions": {
      "title": "Propositions de Valeur",
      "items": ["valeur 1", "valeur 2", "valeur 3", "valeur 4"],
      "insight": "Une observation stratégique courte sur ce bloc"
    },
    "customerRelationships": {
      "title": "Relations Clients",
      "items": ["relation 1", "relation 2", "relation 3"],
      "insight": "Une observation stratégique courte sur ce bloc"
    },
    "channels": {
      "title": "Canaux",
      "items": ["canal 1", "canal 2", "canal 3", "canal 4"],
      "insight": "Une observation stratégique courte sur ce bloc"
    },
    "customerSegments": {
      "title": "Segments Clients",
      "items": ["segment 1", "segment 2", "segment 3"],
      "insight": "Une observation stratégique courte sur ce bloc"
    },
    "costStructure": {
      "title": "Structure des Coûts",
      "items": ["coût 1", "coût 2", "coût 3", "coût 4"],
      "insight": "Une observation stratégique courte sur ce bloc",
      "type": "Cost-Driven ou Value-Driven"
    },
    "revenueStreams": {
      "title": "Sources de Revenus",
      "items": ["revenu 1", "revenu 2", "revenu 3"],
      "insight": "Une observation stratégique courte sur ce bloc",
      "model": "type de modèle de revenus"
    }
  },
  "strategic_insights": [
    "Insight stratégique global 1",
    "Insight stratégique global 2",
    "Insight stratégique global 3"
  ],
  "risks": [
    { "level": "high", "text": "Risque majeur identifié" },
    { "level": "medium", "text": "Risque modéré" },
    { "level": "low", "text": "Risque mineur" }
  ],
  "opportunities": [
    "Opportunité de croissance 1",
    "Opportunité de croissance 2",
    "Opportunité de croissance 3"
  ]
}`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    let text = message.content[0].text.trim()
      .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim()

    const canvas = JSON.parse(text)
    return NextResponse.json(canvas)

  } catch (err) {
    console.error('BMC route error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}