import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request) {
  try {
    const { prompt } = await request.json()

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: `Tu es un expert en création de business plans professionnels.
Tu génères des plans d'affaires structurés, complets et adaptés au marché africain.
Réponds UNIQUEMENT avec un JSON valide sans markdown ni backticks.`,
      messages: [{
        role: 'user',
        content: `Génère un business plan complet pour : "${prompt}"

Réponds avec ce JSON exact :
{
  "sections": [
    {
      "id": 1,
      "title": "Résumé Exécutif",
      "blocks": [
        { "id": 11, "type": "text", "content": "Contenu détaillé..." }
      ]
    }
  ]
}

Inclus ces sections : Résumé Exécutif, Description de l'Entreprise, Analyse du Marché, Organisation & Management, Produits & Services, Stratégie Marketing, Plan Financier, Projections sur 3 ans.`
      }]
    })

    let text = message.content[0].text.trim()
    text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim()
    const data = JSON.parse(text)

    return NextResponse.json(data)

  } catch (error) {
    console.error('BusinessPlan error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}