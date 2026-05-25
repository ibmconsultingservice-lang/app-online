import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client    = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const PEXELS_KEY = process.env.PEXELS_API_KEY

// ─────────────────────────────────────────────────────────────
// Pexels helpers
// ─────────────────────────────────────────────────────────────
async function fetchPexelsPhoto(query) {
  try {
    const res  = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&orientation=portrait&per_page=6&size=large`,
      { headers: { Authorization: PEXELS_KEY } }
    )
    const data = await res.json()
    const photos = data.photos || []
    if (!photos.length) return null
    const pick = photos[Math.floor(Math.random() * Math.min(photos.length, 5))]
    return { url: pick.src.large2x || pick.src.large, type: 'photo' }
  } catch { return null }
}

async function fetchPexelsVideo(query, orientation = 'portrait') {
  try {
    const res  = await fetch(
      `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&orientation=${orientation}&per_page=5`,
      { headers: { Authorization: PEXELS_KEY } }
    )
    const data = await res.json()
    const videos = data.videos || []
    if (!videos.length) return null
    const pick = videos[Math.floor(Math.random() * Math.min(videos.length, 4))]
    const file = pick.video_files?.find(f => f.quality === 'hd') || pick.video_files?.[0]
    if (!file) return null
    return { url: file.link, type: 'video' }
  } catch { return null }
}

async function fetchSceneMedia(keywords, sceneType, format) {
  const orientation = format === 'story' ? 'portrait' : 'landscape'
  const query       = keywords.join(' ')

  // Opening and closing scenes → try video first for impact
  if (sceneType === 'opening' || sceneType === 'closing' || sceneType === 'hero') {
    const video = await fetchPexelsVideo(query, orientation)
    if (video) return video
  }
  // All others → photo (faster, consistent)
  const photo = await fetchPexelsPhoto(query)
  return photo
}

// ─────────────────────────────────────────────────────────────
// Motion model personalities — injected into the Claude prompt
// ─────────────────────────────────────────────────────────────
const MOTION_PERSONAS = {
  cinematic: {
    label:      'Cinematic',
    sceneStyle: 'Slow cinematic zoom, depth-of-field bokeh blur on edges, letterbox bars (top/bottom black bands), film grain overlay, cross-dissolve transitions at exactly 12 frames, subtle vignette',
    textStyle:  'Large serif display font, white with soft drop shadow, fade-up word by word',
    pexelsMood: 'cinematic moody atmospheric',
    colors:     ['#0a0a0f', '#1a0a2e', '#c9a84c'],
    accent:     '#c9a84c',
  },
  editorial: {
    label:      'Editorial',
    sceneStyle: 'Magazine split-screen, bold geometric reveals, ink-stroke wipe transitions, sharp contrast, graphic overlays, typographic compositions',
    textStyle:  'Bold condensed uppercase sans-serif, high contrast, horizontal slide-in',
    pexelsMood: 'editorial fashion minimal clean',
    colors:     ['#0f0f0f', '#1a1a1a', '#e8e0d0'],
    accent:     '#e8e0d0',
  },
  neon: {
    label:      'Neon Dream',
    sceneStyle: 'Glitch artifact every 8 frames, chromatic aberration (RGB split), horizontal scan lines, neon light leak, CRT flicker on text, color channel shift',
    textStyle:  'Monospace or futuristic font, cyan/magenta neon glow, flicker effect',
    pexelsMood: 'neon night city cyberpunk dark',
    colors:     ['#000510', '#0d001a', '#00f5ff'],
    accent:     '#00f5ff',
  },
  organic: {
    label:      'Organic',
    sceneStyle: 'Soft particle bokeh float, botanical leaf overlay at low opacity, warm golden-hour color grade, slow breathing parallax, gentle watercolor transition',
    textStyle:  'Handwritten or organic serif, warm white, soft fade with slight blur',
    pexelsMood: 'nature botanical golden hour warm',
    colors:     ['#0a0c07', '#1a1f10', '#8fba47'],
    accent:     '#8fba47',
  },
  luxury: {
    label:      'Luxury',
    sceneStyle: 'Gold foil particle reveal, marble texture overlay, ultra-slow dissolve (20 frames), glass morphism panels, subtle shimmer sweep left-to-right every scene',
    textStyle:  'Thin elegant serif, gold or champagne color, character-by-character reveal',
    pexelsMood: 'luxury elegant marble gold dark premium',
    colors:     ['#05040a', '#0d0a18', '#b8972e'],
    accent:     '#b8972e',
  },
  kinetic: {
    label:      'Kinetic',
    sceneStyle: 'Fast cut every 30 frames, camera shake on beat, bold color flash frame between cuts, zoom-in impact, speed lines, high-contrast punch zoom',
    textStyle:  'Heavy condensed italic, white or hot red, slam-in with bounce easing',
    pexelsMood: 'dynamic energy action sport powerful',
    colors:     ['#020202', '#0a0012', '#ff2d55'],
    accent:     '#ff2d55',
  },
}

// Scene type → number of frames at 30fps
const SCENE_FRAMES = {
  opening:    90,  // 3s
  hero:       90,  // 3s
  moment:     60,  // 2s
  text:       60,  // 2s
  transition: 45,  // 1.5s
  closing:   105,  // 3.5s
}

// ─────────────────────────────────────────────────────────────
// POST /api/storymotion
// ─────────────────────────────────────────────────────────────
export async function POST(request) {
  try {
    const { photos, description, motionModel, format, duration } = await request.json()

    if (!photos?.length) {
      return NextResponse.json({ error: 'At least one photo is required' }, { status: 400 })
    }

    // ── Step 1: Build vision content blocks (all photos) ─────
    const imageBlocks = photos.map(p => ({
      type:   'image',
      source: { type: 'base64', media_type: p.mime || 'image/jpeg', data: p.base64 },
    }))

    // ── Step 2: Determine motion model ───────────────────────
    // If auto → Claude decides. Otherwise use the provided one.
    const needsAutoSelect = motionModel === 'auto'

    const modelList = Object.entries(MOTION_PERSONAS)
      .map(([id, p]) => `- ${id}: ${p.label} — ${p.sceneStyle.split(',')[0]}`)
      .join('\n')

    const persona       = MOTION_PERSONAS[motionModel] || null
    const totalFrames   = duration * 30
    const orientation   = format === 'story' ? 'portrait (9:16)' : 'landscape (16:9)'

    // ── Step 3: Claude generates the full story script ────────
    const message = await client.messages.create({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: `You are a world-class motion design director and storyteller specialising in social media video stories.
You analyse photos and craft cinematic story scripts optimised for ${orientation} format.
You write JSON only — no markdown, no backticks, no preamble. Pure valid JSON.`,
      messages: [{
        role:    'user',
        content: [
          ...imageBlocks,
          {
            type: 'text',
            text: `Analyse these ${photos.length} photo(s) and create a stunning ${duration}-second ${orientation} video story.

Description / context: "${description || 'Create a compelling visual story from these photos'}"

${needsAutoSelect
  ? `MOTION MODEL: Choose the BEST fitting model from this list based on what you see in the photos and the description:
${modelList}
Include your "modelReason" explaining why you chose it.`
  : `MOTION MODEL: Use "${motionModel}" — ${MOTION_PERSONAS[motionModel]?.sceneStyle || ''}`
}

${persona ? `
Style guide for ${persona.label}:
- Scene visual style: ${persona.sceneStyle}
- Text style: ${persona.textStyle}
- Pexels background mood: ${persona.pexelsMood}
- Accent color: ${persona.accent}
` : ''}

Generate this EXACT JSON structure (no deviation):
{
  "title": "Story title (4-6 words, evocative)",
  "logline": "One sentence that captures the emotional journey",
  "motionModel": "${needsAutoSelect ? 'chosen_model_id' : motionModel}",
  "modelReason": "Why this motion model fits (1-2 sentences)",
  "accentColor": "${persona?.accent || '#a78bfa'}",
  "totalFrames": ${totalFrames},
  "fps": 30,
  "format": "${format}",
  "scenes": [
    {
      "type": "opening",
      "title": "Opening hook text (short, punchy)",
      "subtitle": "Optional secondary line",
      "motion": "${needsAutoSelect ? 'chosen_model_id' : motionModel}",
      "photoIndex": 0,
      "durationFrames": 90,
      "accent": "#hexcolor",
      "textPosition": "bottom-left | center | top-center",
      "overlay": "dark | luxury | warm | neon | none",
      "pexelsKeywords": ["cinematic keyword 1", "mood keyword 2", "atmosphere keyword 3"]
    }
  ]
}

SCENE TYPES and their durations (at 30fps):
- opening    → 90 frames (3s)  — hook, first impression
- hero       → 90 frames (3s)  — main product/subject reveal
- moment     → 60 frames (2s)  — emotional detail or action beat
- text       → 60 frames (2s)  — key message, quote or stat
- transition → 45 frames (1.5s)— motion bridge between acts
- closing    → 105 frames (3.5s)— CTA, brand, emotional payoff

RULES:
- Total durationFrames of all scenes MUST sum to exactly ${totalFrames}
- First scene MUST be type "opening"
- Last scene MUST be type "closing"
- photoIndex refers to which uploaded photo to show (0-${photos.length - 1})
- Distribute photos across scenes — don't use the same photo twice in a row
- pexelsKeywords describe the AMBIENT BACKGROUND behind the photo, not the photo itself
- Keywords must return stunning Pexels results: be specific with mood/lighting (e.g. "golden bokeh particles dark luxury" not just "particles")
- For ${format === 'story' ? 'vertical 9:16' : 'horizontal 16:9'} format, ensure keywords reflect ${format === 'story' ? 'portrait' : 'landscape'} orientation
- Copy must feel human, specific to THESE photos, not generic
- Create ${Math.floor(duration / 3)} to ${Math.ceil(duration / 2)} scenes total
- accent colors should be consistent with the motion model palette and feel premium`
          }
        ]
      }]
    })

    // ── Step 4: Parse Claude's response ───────────────────────
    let text = message.content
      .filter(b => b.type === 'text').map(b => b.text).join('').trim()
      .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim()

    const script = JSON.parse(text)

    // Resolve chosen model if auto
    const resolvedModel = script.motionModel || motionModel
    const resolvedPersona = MOTION_PERSONAS[resolvedModel] || MOTION_PERSONAS.cinematic

    // ── Step 5: Fetch Pexels media for all scenes in parallel ─
    const scenesWithMedia = await Promise.all(
      script.scenes.map(async (scene) => {
        const keywords = [
          ...(scene.pexelsKeywords || [resolvedPersona.pexelsMood]),
          resolvedPersona.pexelsMood,
        ]
        const media = await fetchSceneMedia(keywords, scene.type, format)
        return {
          ...scene,
          pexelsUrl:  media?.url  || null,
          pexelsType: media?.type || 'photo',
        }
      })
    )

    // ── Step 6: Return enriched script ───────────────────────
    return NextResponse.json({
      ...script,
      motionModel:   resolvedModel,
      accentColor:   script.accentColor || resolvedPersona.accent,
      palette:       resolvedPersona.colors,
      scenes:        scenesWithMedia,
    })

  } catch (error) {
    console.error('StoryMotion error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
