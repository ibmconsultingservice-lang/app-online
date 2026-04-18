import { NextResponse } from 'next/server'

const POLLINATIONS_KEY = process.env.POLLINATIONS_KEY
const HF_API_KEY = process.env.HF_API_KEY
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

// ── PROVIDER 1: Pollinations (free, no hard limits with sk_) ──
async function tryPollinations({ fullPrompt, width, height }, attempt = 1) {
  const encodedPrompt = encodeURIComponent(fullPrompt)
  const seed = Math.floor(Math.random() * 999999)

  const params = new URLSearchParams({
    width: String(Math.min(width, 1024)),
    height: String(Math.min(height, 1024)),
    nologo: 'true',
    model: 'flux',
    seed: String(seed),
    private: 'true',
  })

  const headers = {}
  if (POLLINATIONS_KEY) headers['Authorization'] = `Bearer ${POLLINATIONS_KEY}`

  const res = await fetch(
    `https://image.pollinations.ai/prompt/${encodedPrompt}?${params}`,
    { method: 'GET', headers, signal: AbortSignal.timeout(60000) }
  )

  console.log(`[Pollinations attempt ${attempt}] status: ${res.status}`)

  if (res.status === 429) {
    if (attempt >= 4) throw new Error('RATE_LIMIT')
    await sleep(attempt * 8000) // 8s, 16s, 24s
    return tryPollinations({ fullPrompt, width, height }, attempt + 1)
  }

  if (!res.ok) throw new Error(`Pollinations HTTP ${res.status}`)

  const blob = await res.blob()
  if (!blob || blob.size === 0) throw new Error('Image vide reçue')

  const buffer = Buffer.from(await blob.arrayBuffer())
  return `data:${blob.type || 'image/jpeg'};base64,${buffer.toString('base64')}`
}

// ── PROVIDER 2: HuggingFace fal-ai (confirmed working) ──
async function tryHuggingFace({ fullPrompt, width, height }) {
  if (!HF_API_KEY) throw new Error('HF_API_KEY non configuré')

  const res = await fetch(
    'https://router.huggingface.co/fal-ai/fal-ai/flux/schnell',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${HF_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: fullPrompt,
        image_size: {
          width: Math.min(width, 1024),
          height: Math.min(height, 1024),
        },
        num_inference_steps: 4,
        num_images: 1,
        enable_safety_checker: false,
      }),
      signal: AbortSignal.timeout(60000),
    }
  )

  console.log(`[HuggingFace] status: ${res.status}`)

  if (res.status === 401 || res.status === 403) throw new Error('HF token invalide')
  if (res.status === 402) throw new Error('HF crédits épuisés')
  if (res.status === 429) throw new Error('RATE_LIMIT')
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    let msg = `HF HTTP ${res.status}`
    try { msg = JSON.parse(text)?.error || msg } catch {}
    throw new Error(msg)
  }

  const json = await res.json()
  const imageUrl = json?.images?.[0]?.url
  if (!imageUrl) throw new Error('Pas d\'URL image HF')

  const imgRes = await fetch(imageUrl)
  const blob = await imgRes.blob()
  const buffer = Buffer.from(await blob.arrayBuffer())
  return `data:${blob.type || 'image/jpeg'};base64,${buffer.toString('base64')}`
}

// ── PROVIDER 3: Pollinations turbo model (different endpoint) ──
async function tryPollinationsTurbo({ fullPrompt, width, height }) {
  const encodedPrompt = encodeURIComponent(fullPrompt)
  const seed = Math.floor(Math.random() * 999999)

  const params = new URLSearchParams({
    width: String(Math.min(width, 1024)),
    height: String(Math.min(height, 1024)),
    nologo: 'true',
    model: 'turbo', // different model = different queue
    seed: String(seed),
  })

  const headers = {}
  if (POLLINATIONS_KEY) headers['Authorization'] = `Bearer ${POLLINATIONS_KEY}`

  const res = await fetch(
    `https://image.pollinations.ai/prompt/${encodedPrompt}?${params}`,
    { method: 'GET', headers, signal: AbortSignal.timeout(60000) }
  )

  console.log(`[Pollinations Turbo] status: ${res.status}`)

  if (!res.ok) throw new Error(`Pollinations Turbo HTTP ${res.status}`)

  const blob = await res.blob()
  if (!blob || blob.size === 0) throw new Error('Image vide')

  const buffer = Buffer.from(await blob.arrayBuffer())
  return `data:${blob.type || 'image/jpeg'};base64,${buffer.toString('base64')}`
}

// ── MAIN: try providers in order, fallback on failure ──
async function generateOne({ prompt, style, width, height }) {
  const fullPrompt = `${prompt}, ${style}, high quality, detailed, professional`

  const providers = [
    { name: 'Pollinations Flux',  fn: () => tryPollinations({ fullPrompt, width, height }) },
    { name: 'HuggingFace fal-ai', fn: () => tryHuggingFace({ fullPrompt, width, height }) },
    { name: 'Pollinations Turbo', fn: () => tryPollinationsTurbo({ fullPrompt, width, height }) },
  ]

  let lastError = null

  for (const provider of providers) {
    try {
      console.log(`Trying provider: ${provider.name}`)
      const result = await provider.fn()
      console.log(`✓ Success: ${provider.name}`)
      return result
    } catch (err) {
      console.error(`✗ ${provider.name} failed: ${err.message}`)
      lastError = err

      // Wait 5-10s before trying next provider
      await sleep(5000 + Math.random() * 5000)
      continue
    }
  }

  throw lastError || new Error('Tous les services de génération sont indisponibles')
}

export async function POST(req) {
  try {
    const { prompt, style = 'photorealistic', size = '512x512', count = 1 } = await req.json()

    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'Prompt manquant' }, { status: 400 })
    }

    const [w, h] = size.split('x').map(n => Math.min(parseInt(n) || 512, 1024))
    const safeCount = Math.min(Math.max(parseInt(count) || 1, 1), 4)

    const images = []
    const errors = []

    for (let i = 0; i < safeCount; i++) {
      try {
        if (i > 0) await sleep(7000) // 7s between each image
        const url = await generateOne({ prompt: prompt.trim(), style, width: w, height: h })
        images.push({ url, prompt: prompt.trim() })
      } catch (err) {
        errors.push(err.message)
      }
    }

    if (images.length === 0) {
      return NextResponse.json({ error: errors[0] || 'Génération échouée' }, { status: 500 })
    }

    return NextResponse.json({ images, errors: errors.length ? errors : undefined })

  } catch (err) {
    console.error('[generer-image]', err)
    return NextResponse.json({ error: err.message || 'Erreur interne' }, { status: 500 })
  }
}