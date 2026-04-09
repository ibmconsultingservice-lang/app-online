import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request) {
  try {
    const body = await request.json()

    // ── Case 1: Generate slide structure (returns JSON array) ──
    if (body.getStructure) {
      const { prompt } = body

      const message = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: `Tu es un expert en création de présentations PowerPoint professionnelles.
Tu réponds UNIQUEMENT avec un tableau JSON valide, sans texte avant ni après, sans markdown, sans backticks.`,
        messages: [{
          role: 'user',
          content: `Crée une structure de présentation sur : "${prompt}"

Réponds avec un tableau JSON de 6 à 8 slides. Chaque slide doit avoir exactement ce format :
[
  {
    "title": "Titre de la slide",
    "content": ["Point clé 1", "Point clé 2", "Point clé 3"],
    "imageKeyword": "english keyword for image search",
    "imageUrl": ""
  }
]

IMPORTANT: Réponds UNIQUEMENT avec le tableau JSON. Rien d'autre.`
        }]
      })

      let text = message.content[0].text.trim()
      // Strip any accidental markdown fences
      text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim()

      let slides = JSON.parse(text)

      // Fetch Pexels images for each slide
      const pexelsKey = process.env.PEXELS_API_KEY
      if (pexelsKey) {
        slides = await Promise.all(slides.map(async (slide) => {
          try {
            const res = await fetch(
              `https://api.pexels.com/v1/search?query=${encodeURIComponent(slide.imageKeyword)}&per_page=1`,
              { headers: { Authorization: pexelsKey } }
            )
            const data = await res.json()
            slide.imageUrl = data.photos?.[0]?.src?.large || ''
          } catch {
            slide.imageUrl = ''
          }
          return slide
        }))
      }

      return NextResponse.json(slides)
    }

    // ── Case 2: Export to PPTX (returns binary file) ──
    if (body.slides) {
      const { slides } = body
      const PptxGenJS = (await import('pptxgenjs')).default
      const pres = new PptxGenJS()
      pres.layout = 'LAYOUT_16x9'

      slides.forEach((slide) => {
        const s = pres.addSlide()

        // Background
        s.background = { color: 'FFFFFF' }

        // Left color band
        s.addShape(pres.ShapeType.rect, {
          x: 0, y: 0, w: 0.12, h: '100%',
          fill: { color: '2563EB' }
        })

        // Title
        s.addText(slide.title || '', {
          x: 0.3, y: 0.3, w: 9, h: 1.2,
          fontSize: 28, bold: true,
          color: '0F172A', fontFace: 'Arial',
          align: 'left'
        })

        // Content bullets
        if (slide.content?.length) {
          const bullets = slide.content.map(point => ({
            text: point,
            options: { bullet: true, fontSize: 16, color: '475569', breakLine: true }
          }))
          s.addText(bullets, {
            x: 0.3, y: 1.8, w: 5.5, h: 3.2,
            fontFace: 'Arial', valign: 'top'
          })
        }

        // Image
        if (slide.imageUrl) {
          s.addImage({
            path: slide.imageUrl,
            x: 6.0, y: 1.2, w: 3.5, h: 3.5,
            sizing: { type: 'contain', w: 3.5, h: 3.5 }
          })
        }
      })

      const buffer = await pres.write({ outputType: 'nodebuffer' })
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'Content-Disposition': 'attachment; filename="Presentation_Pro.pptx"'
        }
      })
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  } catch (error) {
    console.error('PPTX error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}