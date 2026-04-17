import { NextResponse } from 'next/server'

const HF_API_KEY = process.env.HF_API_KEY

// Confirmed working from inferenceProviderMapping
const ENDPOINTS = [
  {
    url: 'https://router.huggingface.co/fal-ai/fal-ai/flux/schnell',
    label: 'fal-ai',
    body: (prompt, w, h) => ({
      prompt,
      image_size: { width: w, height: h },
      num_inference_steps: 4,
      num_images: 1,
    }),
    parseResponse: async (res) => {
      const json = await res.json()
      const imageUrl = json?.images?.[0]?.url
      if (!imageUrl) throw new Error('Pas d\'URL image dans la réponse fal-ai')
      const imgRes = await fetch(imageUrl)
      const blob = await imgRes.blob()
      const buffer = Buffer.from(await blob.arrayBuffer())
      return `data:${blob.type || 'image/jpeg'};base64,${buffer.toString('base64')}`
    }
  },
  {
    url: 'https://router.huggingface.co/nscale/v1/images/generations',
    label: 'nscale',
    body: (prompt, w, h) => ({
      model: 'black-forest-labs/FLUX.1-schnell',
      prompt,
      n: 1,
      size: `${w}x${h}`,
      response_format: 'b64_json',
    }),
    parseResponse: async (res) => {
      const json = await res.json()
      const b64 = json?.data?.[0]?.b64_json
      if (!b64) throw new Error('Pas de b64_json dans la réponse nscale')
      return `data:image/png;base64,${b64}`
    }
  },
  {
    url: 'https://router.huggingface.co/together/v1/images/generations',
    label: 'together',
    body: (prompt, w, h) => ({
      model: 'black-forest-labs/FLUX.1-schnell',
      prompt,
      n: 1,
      width: w,
      height: h,
      response_format: 'b64_json',
    }),
    parseResponse: async (res) => {
      const json = await res.json()
      const b64 = json?.data?.[0]?.b64_json
      if (!b64) throw new Error('Pas de b64_json dans la réponse together')
      return `data:image/png;base64,${b64}`
    }
  },
]

async function generateOne({ prompt, style, width, height }) {
  const fullPrompt = `${prompt}, ${style}, high quality, detailed, professional`
  let lastError = null

  for (const endpoint of ENDPOINTS) {
    try {
      console.log(`Trying: ${endpoint.label}`)

      const res = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${HF_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(endpoint.body(fullPrompt, width, height)),
      })

      console.log(`[${endpoint.label}] status:`, res.status)

      if (res.status === 401 || res.status === 403) {
        throw new Error('Token invalide ou permission manquante')
      }
      if (res.status === 402) {
        throw new Error('Crédits épuisés — passez à HuggingFace PRO')
      }
      if (res.status === 404 || res.status === 422) {
        lastError = new Error(`${endpoint.label} non disponible`)
        continue
      }
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        let msg = `Erreur HTTP ${res.status}`
        try { msg = JSON.parse(text)?.error || msg } catch {}
        lastError = new Error(msg)
        continue
      }

      const imageData = await endpoint.parseResponse(res)
      console.log(`[${endpoint.label}] succès`)
      return imageData

    } catch (err) {
      if (err.message.includes('Token') || err.message.includes('Crédits')) throw err
      console.error(`[${endpoint.label}] erreur:`, err.message)
      lastError = err
      continue
    }
  }

  throw lastError || new Error('Tous les endpoints ont échoué')
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

    const [w, h] = size.split('x').map(n => Math.min(parseInt(n) || 512, 1024))
    const safeCount = Math.min(Math.max(parseInt(count) || 1, 1), 4)

    const results = await Promise.allSettled(
      Array.from({ length: safeCount }, () =>
        generateOne({ prompt: prompt.trim(), style, width: w, height: h })
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