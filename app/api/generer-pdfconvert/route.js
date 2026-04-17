import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // ← Fix: use require instead of import for pdf-parse
    const pdfParse = require('pdf-parse')
    const pdfData = await pdfParse(buffer)
    const extractedText = pdfData.text

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: `Tu es un expert en conversion de documents. 
Tu convertis le contenu extrait d'un PDF en format structuré.
Réponds en français.`,
      messages: [{
        role: 'user',
        content: `Voici le texte extrait d'un PDF. Restructure et formate ce contenu proprement :\n\n${extractedText}`
      }]
    })

    return NextResponse.json({
      text: message.content[0].text,
      originalText: extractedText
    })

  } catch (error) {
    console.error('PDF Convert error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}