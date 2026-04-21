import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request) {
  try {
    const formData = await request.formData()
    const file       = formData.get('file')
    const manualText = formData.get('manualText') || ''

    let documentContent = manualText
    let detectedFormat  = 'text'

    // ── Extract text from uploaded file ──
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
          documentContent = `[PDF reçu: ${file.name} — ${(file.size / 1024).toFixed(1)} Ko]`
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

    if (!documentContent.trim()) {
      return NextResponse.json({ error: 'Aucun contenu à analyser' }, { status: 400 })
    }

    const message = await client.messages.create({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 3000,
      system: `Tu es un expert en analyse documentaire professionnelle.
Tu analyses des documents business, financiers, juridiques et techniques.
Tu fournis des rapports de synthèse structurés, clairs et actionnables.
Réponds toujours en français avec une structure professionnelle.`,
      messages: [{
        role:    'user',
        content: `Analyse ce document et fournis un rapport de synthèse complet :

${documentContent.slice(0, 15000)}

Ton rapport doit inclure :
1. RÉSUMÉ EXÉCUTIF (3-5 lignes)
2. POINTS CLÉS IDENTIFIÉS
3. STRUCTURE DU DOCUMENT
4. DONNÉES ET CHIFFRES IMPORTANTS
5. POINTS D'ATTENTION ET RISQUES
6. RECOMMANDATIONS ACTIONNABLES`,
      }],
    })

    return NextResponse.json({
      content:         message.content[0].text,
      detectedFormat,
    })

  } catch (error) {
    console.error('DocAnalyser error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}