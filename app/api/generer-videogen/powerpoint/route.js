import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── Pexels helper ────────────────────────────────────────────
async function fetchPexelsImage(query) {
  if (!process.env.PEXELS_API_KEY) return null
  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=3&orientation=landscape`,
      { headers: { Authorization: process.env.PEXELS_API_KEY } }
    )
    const data = await res.json()
    const photo = data.photos?.[Math.floor(Math.random() * (data.photos?.length || 1))]
    return photo?.src?.large2x || photo?.src?.large || null
  } catch {
    return null
  }
}

// ── System prompt ────────────────────────────────────────────
const SYSTEM_PROMPT = `You are an elite presentation designer and storyteller. You create stunning, well-structured slide decks.

Return ONLY valid JSON, no markdown, no backticks, no explanation.

Schema:
{
  "title": "Deck title",
  "description": "One-line deck summary",
  "theme": "obsidian",
  "totalSlides": 10,
  "slides": [
    {
      "type": "cover",
      "title": "Main headline",
      "subtitle": "Supporting text",
      "badge": "Optional pill label e.g. Q3 2025",
      "presenter": "Name (optional)",
      "date": "Date string (optional)",
      "pexelsKeywords": "cinematic background keyword for Pexels e.g. 'dark luxury office bokeh'",
      "accent": "#hex color (optional override)"
    },
    {
      "type": "agenda",
      "title": "Today's Agenda",
      "sectionTag": "Overview",
      "bullets": ["Item 1", "Item 2", "Item 3"],
      "pexelsKeywords": "minimal dark abstract texture"
    },
    {
      "type": "section",
      "title": "Section Title",
      "subtitle": "Brief description",
      "sectionNumber": "01",
      "pexelsKeywords": "cinematic wide landscape"
    },
    {
      "type": "bullets",
      "title": "Key Points",
      "sectionTag": "Strategy",
      "bullets": ["Point one with detail", "Point two with detail", "Point three"],
      "pexelsKeywords": "professional dark workspace"
    },
    {
      "type": "stats",
      "title": "By The Numbers",
      "stats": [
        { "value": "42%", "label": "Growth YoY" },
        { "value": "$2.4M", "label": "Revenue" },
        { "value": "10k+", "label": "Users" }
      ],
      "pexelsKeywords": "data visualization technology dark"
    },
    {
      "type": "quote",
      "title": "Quote text",
      "quote": "Full quote text",
      "author": "Author Name",
      "pexelsKeywords": "inspiring dark minimal"
    },
    {
      "type": "comparison",
      "title": "Before vs After",
      "columns": [
        { "label": "Before", "items": ["Issue 1", "Issue 2"] },
        { "label": "After", "items": ["Solution 1", "Solution 2"] }
      ],
      "pexelsKeywords": "contrast transformation"
    },
    {
      "type": "timeline",
      "title": "Our Journey",
      "timeline": [
        { "date": "Q1 2024", "label": "Founded" },
        { "date": "Q3 2024", "label": "First customer" }
      ],
      "pexelsKeywords": "road journey path"
    },
    {
      "type": "content",
      "title": "Topic",
      "subtitle": "Optional subtitle",
      "sectionTag": "Details",
      "bullets": ["Point 1", "Point 2"],
      "pexelsKeywords": "relevant keyword"
    },
    {
      "type": "cta",
      "title": "Strong CTA headline",
      "subtitle": "Supporting message",
      "cta": "Button text",
      "sectionTag": "Next Step",
      "pexelsKeywords": "inspiring call to action dark"
    }
  ]
}

Rules:
- ALWAYS start with a "cover" slide
- ALWAYS end with a "cta" slide  
- Vary slide types for visual rhythm — don't repeat the same type back to back
- pexelsKeywords must be 3-6 words, cinematic and specific, in English
- Make content genuinely useful, not generic filler
- Adapt tone and content to the topic's industry and audience
- For stats slides, use realistic plausible numbers aligned to the topic
- Bullets should be complete sentences with actual value, not vague platitudes`

// ── Route handler ────────────────────────────────────────────
export async function POST(req) {
  try {
    const { topic, context, theme, slideCount, layout } = await req.json()

    if (!topic?.trim()) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 })
    }

    const themeDescriptions = {
      obsidian:  'Dark luxury aesthetic with gold accents (#c9a84c). Professional, premium.',
      aurora:    'Deep space dark with purple neon gradients (#7c3aed). Innovative, tech.',
      editorial: 'Clean white background (#fafaf8) with dark navy accents (#1a1a2e). Magazine-style.',
      crimson:   'Dramatic near-black (#0d0507) with red (#dc2626). Bold, urgent.',
      arctic:    'Deep navy (#020b18) with sky blue (#0ea5e9). Corporate, trustworthy.',
      forest:    'Deep dark green (#030c06) with emerald (#16a34a). Sustainable, natural.',
    }

    const userPrompt = `Create a ${slideCount}-slide presentation deck for the following:

TOPIC: ${topic}
${context ? `ADDITIONAL CONTEXT: ${context}` : ''}
THEME: ${theme} — ${themeDescriptions[theme] || ''}
LAYOUT: ${layout}

Generate exactly ${slideCount} slides. Make the content genuinely insightful and specific to the topic.
Every slide must have a "pexelsKeywords" field with 3-6 cinematic English keywords.
Return ONLY the JSON object.`

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const raw = message.content[0]?.text || ''

    // Clean and parse JSON
    let deckData
    try {
      const cleaned = raw
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim()
      deckData = JSON.parse(cleaned)
    } catch {
      // Try to extract JSON from the response
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('Failed to parse AI response as JSON')
      deckData = JSON.parse(jsonMatch[0])
    }

    // Fetch Pexels backgrounds in parallel (max concurrency: 4)
    const slides = deckData.slides || []
    const batchSize = 4

    for (let i = 0; i < slides.length; i += batchSize) {
      const batch = slides.slice(i, i + batchSize)
      const urls = await Promise.all(
        batch.map(slide => fetchPexelsImage(slide.pexelsKeywords || topic))
      )
      urls.forEach((url, j) => {
        if (url) slides[i + j].pexelsUrl = url
      })
    }

    return NextResponse.json({
      ...deckData,
      slides,
      theme: theme || deckData.theme,
      layout,
      generatedAt: new Date().toISOString(),
    })

  } catch (err) {
    console.error('[PowerPoint API Error]', err)
    return NextResponse.json(
      { error: err.message || 'Failed to generate presentation' },
      { status: 500 }
    )
  }
}