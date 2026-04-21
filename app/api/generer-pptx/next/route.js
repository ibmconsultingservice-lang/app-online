import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const PEXELS_API_KEY = process.env.PEXELS_API_KEY

// Fetch a Pexels image for a given keyword
async function fetchPexelsImage(keyword) {
  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(keyword)}&per_page=1&orientation=landscape`,
      { headers: { Authorization: PEXELS_API_KEY } }
    )
    const data = await res.json()
    return data?.photos?.[0]?.src?.large2x || null
  } catch {
    return null
  }
}

export async function POST(req) {
  try {
    const { prompt, existingSlides = [] } = await req.json()

    if (!prompt?.trim()) {
      return Response.json({ error: 'Prompt manquant' }, { status: 400 })
    }

    // Build context from existing slides so AI generates something coherent
    const existingTitles = existingSlides.map((s, i) => `Slide ${i + 1}: ${s.title}`).join('\n')

    const systemPrompt = `Tu es un expert en création de présentations professionnelles PowerPoint.
Tu dois générer UNE SEULE slide cohérente avec le reste de la présentation.
Tu réponds UNIQUEMENT en JSON valide, sans markdown, sans explication.

Format de réponse STRICT (un objet JSON unique) :
{
  "title": "Titre court et percutant",
  "content": ["Point clé 1", "Point clé 2", "Point clé 3"],
  "imageKeyword": "mot-clé en anglais pour chercher une image Pexels"
}

Règles :
- title : max 8 mots
- content : exactement 3 points, chacun max 20 mots
- imageKeyword : 1 à 3 mots en anglais, descriptif et visuel
- La slide doit être complémentaire aux slides existantes, pas une répétition`

    const userMessage = existingTitles
      ? `Présentation existante :\n${existingTitles}\n\nNouvelle slide à générer : ${prompt}`
      : `Nouvelle slide à générer : ${prompt}`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })

    const raw = response.content[0].text.trim()

    // Strip any accidental markdown fences
    const clean = raw.replace(/```json|```/g, '').trim()
    const slide = JSON.parse(clean)

    // Fetch the Pexels image
    const imageUrl = await fetchPexelsImage(slide.imageKeyword)
    slide.imageUrl = imageUrl || ''

    return Response.json(slide)
  } catch (err) {
    console.error('[generer-pptx/next]', err)
    return Response.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}