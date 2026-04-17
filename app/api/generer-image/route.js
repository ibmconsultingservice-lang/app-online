import { NextResponse } from 'next/server'

const HF_API_KEY = process.env.HF_API_KEY

// Confirmed from model page: FLUX.1-schnell uses Nscale provider
const ENDPOINTS = [
  {
    url: 'https://router.huggingface.co/nscale/v1/images/generations',
    model: 'black-forest-labs/FLUX.1-schnell',
    label: 'FLUX.1-schnell (nscale)',
  },
  {
    url: 'https://router.huggingface.co/fal-ai/v1/images/generations',
    model: 'black-forest-labs/FLUX.1-schnell',
    label: 'FLUX.1-schnell (fal-ai)',
  },
  {
    url: 'https://router.huggingface.co/replicate/v1/images/generations',
    model: 'black-forest-labs/FLUX.1-schnell',
    label: 'FLUX.1-schnell (replicate)',
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
        body: JSON.stringify({
          model: endpoint.model,
          prompt: fullPrompt,
          n: 1,
          size: `${Math.min(width, 1024)}x${Math.min(height, 1024)}`,
          response_format: 'b64_json', // get base64 directly
        }),
      })

      console.log(`[${endpoint.label}] status:`, res.status)

      if (res.status === 401 || res.status === 403) {
        throw new Error('Token invalide — vérifiez la permission "Make calls to Inference Providers"')
      }
      if (res.status === 402) {
        throw new Error('Crédits épuisés — passez à HuggingFace PRO ($9/mois)')
      }
      if (res.status === 404 || res.status === 422) {
        lastError = new Error(`${endpoint.label} non disponible`)
        continue
      }
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        let msg = `Erreur HTTP ${res.status}`
        try { msg = JSON.parse(text)?.error?.message || JSON.parse(text)?.error || msg } catch {}
        lastError = new Error(msg)
        continue
      }

      const json = await res.json()
      console.log(`[${endpoint.label}] response keys:`, Object.keys(json))

      // OpenAI-compatible response format
      const item = json?.data?.[0]
      if (!item) {
        lastError = new Error('Réponse vide du serveur')
        continue
      }

      // b64_json format
      if (item.b64_json) {
        return `data:image/png;base64,${item.b64_json}`
      }

      // URL format — fetch and convert
      if (item.url) {
        const imgRes = await fetch(item.url)
        const blob = await imgRes.blob()
        const buffer = Buffer.from(await blob.arrayBuffer())
        return `data:${blob.type || 'image/png'};base64,${buffer.toString('base64')}`
      }

      lastError = new Error('Format de réponse inconnu')
      continue

    } catch (err) {
      if (err.message.includes('Token') || err.message.includes('Crédits')) throw err
      console.error(`[${endpoint.label}] exception:`, err.message)
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