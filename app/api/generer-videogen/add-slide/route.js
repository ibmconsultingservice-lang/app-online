import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request) {
  try {
    const { prompt, themeId, slideType, context } = await request.json()

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      system: `Tu es un expert en création de slides de présentation.
Tu génères UNE SEULE slide en JSON valide, sans markdown, sans backticks.`,
      messages: [{
        role: 'user',
        content: `Deck existant (contexte): ${context}
        
Génère une slide de type "${slideType}" pour : "${prompt}"

Réponds avec ce JSON exact selon le type :

Pour "bullets" ou "content":
{"type":"bullets","title":"...","subtitle":"...","bullets":["point 1","point 2","point 3"],"pexelsKeyword":"english keyword","motion":"fade","accent":null}

Pour "stats":
{"type":"stats","title":"...","stats":[{"value":"95%","label":"..."},{"value":"2x","label":"..."}],"pexelsKeyword":"english keyword","motion":"zoom","accent":null}

Pour "cta":
{"type":"cta","title":"...","subtitle":"...","cta":"Button text","pexelsKeyword":"english keyword","motion":"slideUp","accent":null}

Pour "cover" ou "title":
{"type":"cover","title":"...","subtitle":"...","badge":"LABEL","pexelsKeyword":"english keyword","motion":"fade","accent":null}

Pour "quote":
{"type":"quote","title":"...","quote":"...","author":"— Name","pexelsKeyword":"english keyword","motion":"fade","accent":null}

Réponds UNIQUEMENT avec le JSON. Rien d'autre.`,
      }]
    })

    let text = message.content[0].text.trim()
      .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim()

    const slide = JSON.parse(text)

    // Fetch Pexels image
    if (slide.pexelsKeyword && process.env.PEXELS_API_KEY) {
      try {
        const res  = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(slide.pexelsKeyword)}&per_page=1`, {
          headers: { Authorization: process.env.PEXELS_API_KEY }
        })
        const data = await res.json()
        slide.pexelsUrl = data.photos?.[0]?.src?.large || ''
      } catch {
        slide.pexelsUrl = ''
      }
    }

    delete slide.pexelsKeyword

    return NextResponse.json({ slide })

  } catch (error) {
    console.error('Add slide error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}