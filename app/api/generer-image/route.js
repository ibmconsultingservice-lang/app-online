import { NextResponse } from 'next/server'

const HF_API_KEY = process.env.HF_API_KEY

// Updated models using the new HF Inference API format
const MODELS = [
  'black-forest-labs/FLUX.1-schnell',  // Best free model, very fast
  'stabilityai/stable-diffusion-3-medium-diffusers',
  'stabilityai/stable-diffusion-xl-base-1.0',
]

async function generateOne({ prompt, style, width, height }) {
  const fullPrompt = `${prompt}, ${style}, high quality, detailed, professional`

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
            'x-wait-for-model': 'true',  // Wait instead of 503
          },
          body: JSON.stringify({
            inputs: fullPrompt,
            parameters: {
              width,
              height,
              num_inference_steps: 4,   // FLUX.1-schnell works best with 4
              guidance_scale: 0.0,      // FLUX schnell uses 0
            },
          }),
        }
      )

      if (res.status === 404) {
        // Model not available, try next
        lastError = new Error(`Modèle ${model} non disponible`)
        continue
      }

      if (res.status === 503) {
        const json = await res.json().catch(() => ({}))
        const wait = json.estimated_time ? Math.ceil(json.estimated_time) : 30
        throw new Error(`Modèle en cours de chargement, réessayez dans ~${wait}s`)
      }

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        let errMsg = `Erreur HTTP ${res.status}`
        try { errMsg = JSON.parse(text)?.error || errMsg } catch {}
        lastError = new Error(errMsg)
        continue
      }

      const blob = await res.blob()
      if (!blob || blob.size === 0) {
        lastError = new Error('Image vide reçue')
        continue
      }

      const buffer = Buffer.from(await blob.arrayBuffer())
      const base64 = buffer.toString('base64')
      const mimeType = blob.type || 'image/jpeg'

      return `data:${mimeType};base64,${base64}`

    } catch (err) {
      lastError = err
      if (err.message.includes('chargement')) throw err
      continue
    }
  }

  throw lastError || new Error('Tous les modèles ont échoué')
}

export async function POST(req) {
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