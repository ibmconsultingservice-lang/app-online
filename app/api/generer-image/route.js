import { NextResponse } from 'next/server'

const HF_API_KEY = process.env.HF_API_KEY

// New HF Inference Providers router — replaces old api-inference.huggingface.co
const ROUTER_URL = 'https://router.huggingface.co'

const MODELS = [
  { id: 'black-forest-labs/FLUX.1-schnell', steps: 4,  guidance: 0.0 },
  { id: 'black-forest-labs/FLUX.1-dev',     steps: 25, guidance: 3.5 },
  { id: 'stabilityai/stable-diffusion-xl-base-1.0', steps: 30, guidance: 7.5 },
]

async function generateOne({ prompt, style, width, height }) {
  const fullPrompt = `${prompt}, ${style}, high quality, detailed, professional`
  let lastError = null

  for (const model of MODELS) {
    try {
      const res = await fetch(
        `${ROUTER_URL}/models/${model.id}`,
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
              width:  Math.min(width,  1024),
              height: Math.min(height, 1024),
              num_inference_steps: model.steps,
              guidance_scale: model.guidance,
            },
          }),
        }
      )

      console.log(`[${model.id}] status:`, res.status)

      if (res.status === 404 || res.status === 422) {
        lastError = new Error(`Modèle ${model.id} non disponible`)
        continue
      }

      if (res.status === 401 || res.status === 403) {
        throw new Error('Token invalide ou permission "Make calls to Inference Providers" manquante')
      }

      if (res.status === 402) {
        throw new Error('Crédits mensuels épuisés — passez à HuggingFace PRO')
      }

      if (res.status === 503) {
        // Model loading, try next
        lastError = new Error(`Modèle ${model.id} en chargement, réessayez`)
        continue
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
        console.error(`[${model.id}] non-image:`, text.slice(0, 300))
        lastError = new Error('Réponse non-image reçue')
        continue
      }

      const blob = await res.blob()
      if (!blob || blob.size === 0) {
        lastError = new Error('Image vide reçue')
        continue
      }

      const buffer = Buffer.from(await blob.arrayBuffer())
      console.log(`[${model.id}] succès — ${buffer.length} bytes`)
      return `data:${blob.type || 'image/png'};base64,${buffer.toString('base64')}`

    } catch (err) {
      // Hard errors (auth, credits) — don't try next model
      if (
        err.message.includes('permission') ||
        err.message.includes('Token invalide') ||
        err.message.includes('Crédits')
      ) throw err

      console.error(`[${model.id}] erreur:`, err.message)
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

    const [widthStr, heightStr] = size.split('x')
    const width  = parseInt(widthStr) || 512
    const height = parseInt(heightStr) || 512
    const safeCount = Math.min(Math.max(parseInt(count) || 1, 1), 4)

    const results = await Promise.allSettled(
      Array.from({ length: safeCount }, () =>
        generateOne({ prompt: prompt.trim(), style, width, height })
      )
    )

    const images = results.filter(r => r.status === 'fulfilled').map(r => ({ url: r.value, prompt: prompt.trim() }))
    const errors = results.filter(r => r.status === 'rejected').map(r => r.reason?.message)

    if (images.length === 0) {
      return NextResponse.json({ error: errors[0] || 'Génération échouée' }, { status: 500 })
    }

    return NextResponse.json({ images, errors: errors.length ? errors : undefined })

  } catch (err) {
    console.error('[generer-image]', err)
    return NextResponse.json({ error: err.message || 'Erreur interne' }, { status: 500 })
  }
}