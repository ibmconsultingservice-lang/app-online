import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const manualText = formData.get('manualText') || ''

    let inputText = manualText
    let detectedFormat = 'txt'

    // Si fichier uploadé — extraire le texte
    if (file && file.size > 0) {
      const fileName = file.name.toLowerCase()
      detectedFormat = fileName.split('.').pop()

      // Pour txt/csv — lire directement
      if (['txt', 'csv'].includes(detectedFormat)) {
        inputText = await file.text()
      } else {
        // Pour docx/pdf — on lit le texte brut
        const buffer = await file.arrayBuffer()
        inputText = `[Fichier ${detectedFormat} uploadé — ${file.name}]\n` + manualText
      }
    }

    if (!inputText.trim()) {
      return NextResponse.json({ error: 'Aucun contenu fourni' }, { status: 400 })
    }

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: `Tu es un expert en correction et réparation de documents professionnels.
Tu corriges les fautes d'orthographe, de grammaire, de syntaxe et améliores la cohérence du texte.
Tu retournes uniquement le texte corrigé et amélioré, sans commentaires ni explications.`,
      messages: [{
        role: 'user',
        content: `Répare et améliore ce document :\n\n${inputText}`
      }],
    })

    return NextResponse.json({
      content: message.content[0].text,
      detectedFormat,
    })

  } catch (error) {
    console.error('Erreur DocRepairer:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}