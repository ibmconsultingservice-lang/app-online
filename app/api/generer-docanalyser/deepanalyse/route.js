import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request) {
  try {
    const formData = await request.formData()
    const file       = formData.get('file')
    const manualText = formData.get('manualText') || ''
    const prompt     = formData.get('prompt')     || ''

    if (!prompt.trim()) {
      return NextResponse.json({ error: 'Question manquante' }, { status: 400 })
    }

    let documentContent = manualText
    let detectedFormat  = 'text'

    // ── Extract text from uploaded file (same logic as main route) ──
    if (file && file.size > 0) {
      detectedFormat = file.name.split('.').pop().toLowerCase()
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      if (detectedFormat === 'txt') {
        documentContent = buffer.toString('utf-8')
      } else if (detectedFormat === 'pdf') {
        try {
          const pdfParse = require('pdf-parse')
          const pdfData  = await pdfParse(buffer)
          documentContent = pdfData.text
        } catch (e) {
          documentContent = `[PDF reçu: ${file.name}]`
        }
      } else if (detectedFormat === 'docx') {
        try {
          const mammoth = await import('mammoth')
          const result  = await mammoth.extractRawText({ buffer })
          documentContent = result.value
        } catch (e) {
          documentContent = `[DOCX reçu: ${file.name}]`
        }
      } else if (['xlsx', 'xls', 'csv'].includes(detectedFormat)) {
        try {
          const XLSX     = await import('xlsx')
          const workbook = XLSX.read(buffer, { type: 'buffer' })
          const sheet    = workbook.Sheets[workbook.SheetNames[0]]
          documentContent = XLSX.utils.sheet_to_csv(sheet)
        } catch (e) {
          documentContent = `[Excel reçu: ${file.name}]`
        }
      }
    }

    const hasDocument = documentContent.trim().length > 0

    const message = await client.messages.create({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 3000,
      system: `Tu es un expert en investigation documentaire approfondie.
Tu réponds à des questions précises sur des documents professionnels.
Tes réponses sont détaillées, structurées et basées uniquement sur le contenu fourni.
Si l'information n'est pas dans le document, dis-le clairement.
Réponds toujours en français.`,
      messages: [{
        role:    'user',
        content: hasDocument
          ? `DOCUMENT SOURCE :\n${documentContent.slice(0, 15000)}\n\n---\n\nQUESTION D'INVESTIGATION :\n${prompt}\n\nFournis une réponse approfondie, structurée et précise basée sur le document.`
          : `QUESTION D'INVESTIGATION (sans document source) :\n${prompt}\n\nFournis une réponse approfondie et structurée.`,
      }],
    })

    return NextResponse.json({ content: message.content[0].text })

  } catch (error) {
    console.error('DeepAnalyse error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}