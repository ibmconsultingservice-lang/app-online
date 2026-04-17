import { NextResponse } from 'next/server'

const HF_API_KEY = process.env.HF_API_KEY

const MODELS = [
  'stabilityai/sdxl-turbo',
  'Lykon/dreamshaper-8',
  'Yntec/RealisticVisionV51',
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
            'x-wait-for-model': 'true',
          },
          body: JSON.stringify({
            inputs: fullPrompt,
            parameters: {
              width: Math.min(width, 512),
              height: Math.min(height, 512),
              num_inference_steps: 20,
              guidance_scale: 7.5,
            },
          }),
        }
      )

      console.log(`[${model}] status:`, res.status)

      if (res.status === 404 || res.status === 403) {
        lastError = new Error(`Modèle ${model} non disponible`)
        continue
      }

      if (res.status === 503) {
        const json = await res.json().catch(() => ({}))
        const wait = json.estimated_time ? Math.ceil(json.estimated_time) : 20
        lastError = new Error(`Modèle en chargement, réessayez dans ~${wait}s`)
        continue  // try next model instead of throwing
      }

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        let errMsg = `Erreur HTTP ${res.status}`
        try { errMsg = JSON.parse(text)?.error || errMsg } catch {}
        lastError = new Error(errMsg)
        continue
      }

      const contentType = res.headers.get('content-type') || ''
      if (!contentType.includes('image')) {
        const text = await res.text()
        console.error(`[${model}] non-image response:`, text.slice(0, 200))
        lastError = new Error(`Réponse invalide du modèle`)
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

      console.log(`[${model}] success, size: ${buffer.length} bytes`)
      return `data:${mimeType};base64,${base64}`

    } catch (err) {
      console.error(`[${model}] exception:`, err.message)
      lastError = err
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

    // Cap at 512x512 — larger sizes require Pro/paid tier
    const [widthStr, heightStr] = size.split('x')
    const width = Math.min(parseInt(widthStr) || 512, 512)
    const height = Math.min(parseInt(heightStr) || 512, 512)
    const safeCount = Math.min(Math.max(parseInt(count) || 1, 1), 2) // cap at 2 for free tier

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