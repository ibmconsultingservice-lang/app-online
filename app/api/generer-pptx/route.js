import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request) {
  try {
    const body = await request.json()

    // ── Case 1: Generate slide structure ──
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

Réponds avec un tableau JSON de 6 à 10 slides. Chaque slide doit avoir exactement ce format :
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
      text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim()
      let slides = JSON.parse(text)

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

    // ── Case 2: Export to PPTX ──
    if (body.slides) {
      const { slides } = body
      const PptxGenJS = (await import('pptxgenjs')).default
      const pres = new PptxGenJS()
      pres.layout = 'LAYOUT_16x9'

      // Slide dimensions: 10in x 5.625in (standard 16:9)
      const W = 10
      const H = 5.625

      slides.forEach((slide, idx) => {
        const s = pres.addSlide()
        s.background = { color: 'FFFFFF' }

        // ── Alternating layout: even = image left, odd = image right ──
        const imageOnLeft = idx % 2 === 0

        const imgX  = imageOnLeft ? 0 : W / 2
        const textX = imageOnLeft ? W / 2 : 0

        // ── Image — full bleed on its half ──
        if (slide.imageUrl) {
          s.addImage({
            path:   slide.imageUrl,
            x:      imgX,
            y:      0,
            w:      W / 2,
            h:      H,
            sizing: { type: 'cover', w: W / 2, h: H },
          })
        } else {
          // Fallback: colored rectangle
          s.addShape(pres.ShapeType.rect, {
            x:    imgX,
            y:    0,
            w:    W / 2,
            h:    H,
            fill: { color: imageOnLeft ? '2563EB' : 'F1F5F9' },
          })
        }

        // ── Thin accent line between image and text ──
        s.addShape(pres.ShapeType.rect, {
          x:    imageOnLeft ? W / 2 - 0.04 : W / 2,
          y:    0,
          w:    0.04,
          h:    H,
          fill: { color: '2563EB' },
        })

        // ── Text half background ──
        s.addShape(pres.ShapeType.rect, {
          x:    textX,
          y:    0,
          w:    W / 2,
          h:    H,
          fill: { color: 'FFFFFF' },
        })

        // ── Slide number (small, top corner of text side) ──
        s.addText(`${String(idx + 1).padStart(2, '0')}`, {
          x:        textX + 0.3,
          y:        0.25,
          w:        0.6,
          h:        0.3,
          fontSize: 9,
          color:    '94A3B8',
          bold:     true,
          fontFace: 'Arial',
        })

        // ── Title ──
        s.addText(slide.title || '', {
          x:        textX + 0.35,
          y:        0.7,
          w:        W / 2 - 0.7,
          h:        1.4,
          fontSize: 22,
          bold:     true,
          color:    '0F172A',
          fontFace: 'Arial',
          valign:   'top',
          wrap:     true,
        })

        // ── Accent underline ──
        s.addShape(pres.ShapeType.rect, {
          x:    textX + 0.35,
          y:    2.2,
          w:    0.5,
          h:    0.045,
          fill: { color: '2563EB' },
        })

        // ── Content bullets ──
        if (slide.content?.length) {
          const bullets = slide.content.map(point => ({
            text:    point,
            options: {
              bullet:    { type: 'bullet', indent: 10 },
              fontSize:  13,
              color:     '475569',
              breakLine: true,
              paraSpaceAfter: 6,
            },
          }))

          s.addText(bullets, {
            x:        textX + 0.35,
            y:        2.35,
            w:        W / 2 - 0.7,
            h:        H - 2.7,
            fontFace: 'Arial',
            valign:   'top',
            wrap:     true,
          })
        }

        // ── Bottom brand bar on text side ──
        s.addShape(pres.ShapeType.rect, {
          x:    textX,
          y:    H - 0.28,
          w:    W / 2,
          h:    0.28,
          fill: { color: 'F8FAFC' },
        })
      })

      const buffer = await pres.write({ outputType: 'nodebuffer' })
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type':        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'Content-Disposition': 'attachment; filename="Presentation_Pro.pptx"',
        },
      })
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  } catch (error) {
    console.error('PPTX error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}