import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const PEXELS_KEY = process.env.PEXELS_API_KEY

// ── Pexels helpers ─────────────────────────────────────────────

async function fetchPexelsPhoto(query) {
  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&orientation=landscape&per_page=5&size=large`,
      { headers: { Authorization: PEXELS_KEY } }
    )
    const data = await res.json()
    const photos = data.photos || []
    if (!photos.length) return null
    const pick = photos[Math.floor(Math.random() * Math.min(photos.length, 5))]
    return { url: pick.src.large2x || pick.src.large, type: 'photo', photographer: pick.photographer }
  } catch { return null }
}

async function fetchPexelsVideo(query) {
  try {
    const res = await fetch(
      `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&orientation=landscape&per_page=5`,
      { headers: { Authorization: PEXELS_KEY } }
    )
    const data = await res.json()
    const videos = data.videos || []
    if (!videos.length) return null
    const pick = videos[Math.floor(Math.random() * Math.min(videos.length, 5))]
    const file = pick.video_files?.find(f => f.quality === 'hd' && f.width >= 1280) || pick.video_files?.[0]
    if (!file) return null
    return { url: file.link, type: 'video' }
  } catch { return null }
}

async function fetchSceneMedia(keywords, sceneType) {
  const query = keywords.join(' ')
  if (sceneType === 'title' || sceneType === 'cta') {
    const video = await fetchPexelsVideo(query)
    if (video) return video
  }
  return fetchPexelsPhoto(query)
}

// ─── Main route ───────────────────────────────────────────────

export async function POST(request) {
  try {
    const { imageBase64, imageMediaType, tone, accentColor, extraContext } = await request.json()

    if (!imageBase64) {
      return NextResponse.json({ error: 'Image manquante' }, { status: 400 })
    }

    const toneGuide = {
      luxury:    'ultra-premium, slow-burn elegance. Sensory, aspirational, exclusive. Think Chanel, Dior. Poetic.',
      bold:      'high-energy, punchy. Max 6 words per bullet. Numbers everywhere. Zero fluff.',
      editorial: 'magazine-quality, story-driven. Sophisticated. Focuses on craft and origin.',
      viral:     'scroll-stopping, conversational. FOMO-driven. First line must hook instantly.',
    }

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: `You are an elite marketing creative director and Pexels cinematography expert.
You analyze product images and craft stunning video scripts with cinematic Pexels background keywords.
Respond ONLY with valid JSON. No markdown, no backticks. Pure JSON only.`,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: imageMediaType || 'image/jpeg', data: imageBase64 }
          },
          {
            type: 'text',
            text: `Analyze this product image as a world-class creative director.

Tone: ${tone || 'luxury'} — ${toneGuide[tone] || toneGuide.luxury}
Brand accent color: ${accentColor || '#f59e0b'}
${extraContext ? `Context: ${extraContext}` : ''}

Generate a 6-scene cinematic marketing video script as this EXACT JSON (no deviation):

{
  "title": "Campaign title (4-5 words)",
  "description": "One-line campaign description",
  "productAnalysis": "2 sentences on what you see in the image",
  "accentColor": "${accentColor || '#f59e0b'}",
  "accentAlt": "#complementary_hex_color",
  "totalFrames": 540,
  "fps": 30,
  "scenes": [
    {
      "type": "title",
      "title": "Hook headline (5 words max)",
      "subtitle": "Secondary emotional line",
      "badge": "Category · 2 words",
      "brandLine": "Brand tagline or empty string",
      "accent": "#hexcolor",
      "titleSize": 88,
      "pexelsKeywords": ["cinematic keyword 1", "atmospheric keyword 2", "mood keyword 3"]
    },
    {
      "type": "bullets",
      "title": "Section headline",
      "sectionNumber": "01",
      "sectionTag": "Key Benefits",
      "bullets": ["Benefit 1 — specific and sensory", "Benefit 2 — concrete", "Benefit 3 — emotional"],
      "accent": "#hexcolor",
      "pexelsKeywords": ["thematic background 1", "mood background 2"]
    },
    {
      "type": "stats",
      "title": "By The Numbers",
      "stats": [
        { "value": "X+", "label": "Metric" },
        { "value": "Xk", "label": "Metric" },
        { "value": "X%", "label": "Metric" }
      ],
      "accent": "#hexcolor",
      "pexelsKeywords": ["abstract dark 1", "luxury minimal 2"]
    },
    {
      "type": "producthero",
      "title": "Product story headline",
      "subtitle": "Supporting emotional line",
      "sectionTag": "The Experience",
      "chips": ["Feature 1", "Feature 2", "Feature 3"],
      "accent": "#hexcolor",
      "pexelsKeywords": ["lifestyle keyword 1", "atmosphere keyword 2"]
    },
    {
      "type": "bullets",
      "title": "What Sets It Apart",
      "sectionNumber": "02",
      "sectionTag": "Differentiators",
      "bullets": ["Differentiator 1", "Differentiator 2", "Differentiator 3"],
      "accent": "#hexcolor",
      "pexelsKeywords": ["background keyword 1", "mood keyword 2"]
    },
    {
      "type": "cta",
      "title": "Final emotional statement (6 words max)",
      "subtitle": "Urgency or aspiration line",
      "cta": "Shop Now",
      "accent": "#hexcolor",
      "accentAlt": "#complementary_hex",
      "pexelsKeywords": ["cinematic closing 1", "dramatic atmospheric 2"]
    }
  ]
}

PEXELS KEYWORD RULES — critical for stunning visuals:
- Be CINEMATIC and SPECIFIC: "luxury perfume dark bokeh" not just "perfume"
- Think like a film location scout choosing backgrounds
- For beauty/fragrance → "floral bokeh dark luxury", "pink silk texture", "golden particles bokeh"  
- For fashion → "dark velvet fabric", "runway editorial dark", "silk movement luxury"
- For tech → "dark minimal blue glow", "abstract circuit bokeh", "neon dark futuristic"
- For food → "dark moody restaurant", "golden hour ingredients", "steam close-up dark"
- Keywords describe the BACKGROUND aesthetic, not the product itself
- Always include lighting mood: "golden", "dark", "moody", "cinematic", "bokeh"

Copy rules:
- SPECIFIC to this exact product — never generic placeholders
- Stats must be plausible for this product category
- Bullets max 8 words each
- First title scene must stop the scroll instantly`
          }
        ]
      }]
    })

    let text = message.content
      .filter(b => b.type === 'text').map(b => b.text).join('').trim()
      .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim()

    const script = JSON.parse(text)

    // Fetch Pexels media for all scenes in parallel
    const scenesWithMedia = await Promise.all(
      script.scenes.map(async (scene) => {
        const keywords = scene.pexelsKeywords || ['cinematic dark luxury']
        const media = await fetchSceneMedia(keywords, scene.type)
        return {
          ...scene,
          pexelsUrl: media?.url || null,
          pexelsType: media?.type || 'photo',
          pexelsCredit: media?.photographer || null,
        }
      })
    )

    return NextResponse.json({ ...script, scenes: scenesWithMedia })

  } catch (error) {
    console.error('VideoGen error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}