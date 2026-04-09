import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request) {
  try {
    const { history, tone } = await request.json()

    const systemPrompt = `Tu es CORE.AX, un expert en stratégie business de haut niveau.
Ton rôle : analyser des dossiers complexes et produire des solutions concrètes, structurées et actionnables.
Ton style : ${tone === 'persuasive' ? 'percutant et orienté vente' :
             tone === 'assertive'  ? 'autoritaire et direct' :
             tone === 'diplomatic' ? 'diplomatique et nuancé' :
             'analytique et data-driven'}.
Réponds toujours en français. Structure ta réponse avec des sections claires.`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: systemPrompt,
      messages: history,   // history is already [{role, content}] array
    })

    return NextResponse.json({ text: message.content[0].text })

  } catch (error) {
    console.error('Erreur:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}