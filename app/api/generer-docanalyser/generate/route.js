import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request) {
  try {
    const body = await request.json()
    const { system, prompt, maxTokens = 2000 } = body

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      system: system || 'Tu es un assistant professionnel.',
      messages: [{ role: 'user', content: prompt }],
    })

    return NextResponse.json({ result: message.content[0].text })

  } catch (error) {
    console.error('Erreur:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
