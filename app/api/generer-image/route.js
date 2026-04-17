import { NextResponse } from 'next/server'

const HF_API_KEY = process.env.HF_API_KEY

// Model fallback chain: try SDXL first, fall back to SD 2.1
const MODELS = [
  'stabilityai/stable-diffusion-xl-base-1.0',
  'stabilityai/stable-diffusion-2-1',
  'runwayml/stable-diffusion-v1-5',
]

async function generateOne({ prompt, style, width, height }) {
  const fullPrompt = `${prompt}, ${style}, high quality, detailed, professional`
  const negativePrompt = 'blurry, low quality, watermark, text, distorted, ugly, bad anatomy'

  let lastError = null

  for (const model of MODELS) {
    try {
      const res = await fetch(
        `https://api-inference.huggingface.co/models/${model}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${HF_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: fullPrompt,
            parameters: {
              negative_prompt: negativePrompt,
              width,
              height,
              num_inference_steps: 30,
              guidance_scale: 7.5,
            },
          }),
        }
      )

      // Model loading — HF returns 503 with estimated_time
      if (res.status === 503) {
        const json = await res.json().catch(() => ({}))
        const wait = json.estimated_time ? Math.ceil(json.estimated_time) : 30
        throw new Error(`Modèle en cours de chargement, réessayez dans ~${wait}s`)
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Erreur HTTP ${res.status}`)
      }

      const blob = await res.blob()
      const buffer = Buffer.from(await blob.arrayBuffer())
      const base64 = buffer.toString('base64')
      const mimeType = blob.type || 'image/png'

      return `data:${mimeType};base64,${base64}`

    } catch (err) {
      lastError = err
      // Only try next model if it's not a loading error
      if (err.message.includes('chargement')) throw err
      continue
    }
  }

  throw lastError || new Error('Tous les modèles ont échoué')
}

export async function POST(req) {
  console.log('HF_API_KEY exists:', !!process.env.HF_API_KEY)
  console.log('First 5 chars:', process.env.HF_API_KEY?.slice(0, 5))
  try {
    const { prompt, style = 'photorealistic', size = '512x512', count = 1 } = await req.json()

    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'Prompt manquant' }, { status: 400 })
    }

    if (!HF_API_KEY) {
      return NextResponse.json({ error: 'Clé API HuggingFace non configurée' }, { status: 500 })
    }

    const [widthStr, heightStr] = size.split('x')
    const width = parseInt(widthStr) || 512
    const height = parseInt(heightStr) || 512
    const safeCount = Math.min(Math.max(parseInt(count) || 1, 1), 4)

    // Generate in parallel
    const results = await Promise.allSettled(
      Array.from({ length: safeCount }, () =>
        generateOne({ prompt: prompt.trim(), style, width, height })
      )
    )

    const images = results
      .filter(r => r.status === 'fulfilled')
      .map(r => ({ url: r.value, prompt: prompt.trim() }))

    const errors = results
      .filter(r => r.status === 'rejected')
      .map(r => r.reason?.message)

    if (images.length === 0) {
      return NextResponse.json({ error: errors[0] || 'Génération échouée' }, { status: 500 })
    }

    return NextResponse.json({ images, errors: errors.length ? errors : undefined })

  } catch (err) {
    console.error('[generer-image]', err)
    return NextResponse.json({ error: err.message || 'Erreur interne' }, { status: 500 })
  }
}