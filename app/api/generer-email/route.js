import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const PLATFORMS = {
  linkedin:  'LinkedIn',
  email:     'Email professionnel',
  whatsapp:  'WhatsApp Business',
  sms:       'SMS / iMessage',
}

const TONES = {
  professional: 'strict et professionnel',
  friendly:     'amical et direct',
  persuasive:   'persuasif orienté vente',
  short:        'ultra-court et percutant',
}

export async function POST(request) {
  try {
    const { context, platform, tone } = await request.json()

    if (!context?.trim()) {
      return NextResponse.json({ error: 'Contexte manquant' }, { status: 400 })
    }

    const platformLabel = PLATFORMS[platform] || 'Email professionnel'
    const toneLabel     = TONES[tone]         || 'strict et professionnel'

    const message = await client.messages.create({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 800,
      system: `Tu es un expert en communication professionnelle et business development.
Tu rédiges des messages optimisés pour ${platformLabel}.
Ton : ${toneLabel}.
Le message doit être prêt à envoyer, sans explication supplémentaire.
Adapte la longueur et le style à la plateforme choisie.
Réponds UNIQUEMENT avec le message rédigé, sans introduction ni commentaire.`,
      messages: [{
        role:    'user',
        content: `Contexte et objectif : ${context}

Rédige un message ${toneLabel} pour ${platformLabel}.`,
      }],
    })

    const text = message.content[0].text.trim()
    return NextResponse.json({ text })

  } catch (error) {
    console.error('Email API error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}