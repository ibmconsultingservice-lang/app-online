// ✅ Fonctionne avec App Hosting car SSR
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY, // ← lu correctement avec App Hosting
})

export async function POST(request) {
  try {
    const body = await request.json()
    const { typeLettre, details } = body

    const message = await client.messages.create({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages:   [{ role: 'user', content: `Rédige une ${typeLettre}: ${details}` }],
    })

    return NextResponse.json({ lettre: message.content[0].text })

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}