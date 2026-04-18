import { NextResponse } from 'next/server'

const POLLINATIONS_KEY = process.env.POLLINATIONS_KEY
const HF_API_KEY = process.env.HF_API_KEY
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

// Convert file to base64
async function fileToBase64(file) {
  const buffer = Buffer.from(await file.arrayBuffer())
  return buffer.toString('base64')
}

// ── PROVIDER 1: Pollinations image-to-image ──
async function tryPollinationsImg2Img({ imageBase64, mimeType, transformPrompt }, attempt = 1) {
  const encodedPrompt = encodeURIComponent(transformPrompt)
  const seed = Math.floor(Math.random() * 999999)

  const params = new URLSearchParams({
    model: 'kontext',  // Pollinations kontext = image-to-image FLUX model
    nologo: 'true',
    seed: String(seed),
    private: 'true',
    image: `data:${mimeType};base64,${imageBase64}`,
  })

  const headers = {}
  if (POLLINATIONS_KEY) headers['Authorization'] = `Bearer ${POLLINATIONS_KEY}`

  const res = await fetch(
    `https://image.pollinations.ai/prompt/${encodedPrompt}?${params}`,
    { method: 'GET', headers, signal: AbortSignal.timeout(90000) }
  )

  console.log(`[Pollinations kontext attempt ${attempt}] status: ${res.status}`)

  if (res.status === 429) {
    if (attempt >= 4) throw new Error('RATE_LIMIT')
    await sleep(attempt * 8000)
    return tryPollinationsImg2Img({ imageBase64, mimeType, transformPrompt }, attempt + 1)
  }

  if (!res.ok) throw new Error(`Pollinations HTTP ${res.status}`)

  const blob = await res.blob()
  if (!blob || blob.size === 0) throw new Error('Image vide reçue')

  const buffer = Buffer.from(await blob.arrayBuffer())
  return `data:${blob.type || 'image/jpeg'};base64,${buffer.toString('base64')}`
}

// ── PROVIDER 2: HuggingFace via Claude vision — describe + regenerate ──
async function tryHuggingFaceRegen({ imageBase64, mimeType, transformPrompt, width, height }) {
  if (!HF_API_KEY) throw new Error('HF_API_KEY non configuré')

  // Step 1: Use Claude to describe the image content
  const visionRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY || '',
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mimeType, data: imageBase64 },
          },
          {
            type: 'text',
            text: 'Describe this image in detail in one paragraph focusing on the subject, pose, lighting, and key visual elements. Be concise and precise.',
          },
        ],
      }],
    }),
  })

  let imageDescription = 'a person in the image'
  if (visionRes.ok) {
    const visionData = await visionRes.json()
    imageDescription = visionData?.content?.[0]?.text || imageDescription
  }

  // Step 2: Generate new image with HF using description + transformation
  const finalPrompt = `${imageDescription}, ${transformPrompt}, high quality, detailed, professional`

  const hfRes = await fetch('https://router.huggingface.co/fal-ai/fal-ai/flux/schnell', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${HF_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: finalPrompt,
      image_size: { width: Math.min(width, 1024), height: Math.min(height, 1024) },
      num_inference_steps: 4,
      num_images: 1,
      enable_safety_checker: false,
    }),
    signal: AbortSignal.timeout(60000),
  })

  console.log(`[HuggingFace regen] status: ${hfRes.status}`)

  if (hfRes.status === 402) throw new Error('HF crédits épuisés')
  if (!hfRes.ok) {
    const text = await hfRes.text().catch(() => '')
    throw new Error(`HF HTTP ${hfRes.status}: ${text.slice(0, 100)}`)
  }

  const json = await hfRes.json()
  const imageUrl = json?.images?.[0]?.url
  if (!imageUrl) throw new Error('Pas d\'URL image HF')

  const imgRes = await fetch(imageUrl)
  const blob = await imgRes.blob()
  const buffer = Buffer.from(await blob.arrayBuffer())
  return `data:${blob.type || 'image/jpeg'};base64,${buffer.toString('base64')}`
}

// ── PROVIDER 3: Pollinations turbo with prompt only (fallback) ──
async function tryPollinationsFallback({ transformPrompt, width, height }) {
  const encodedPrompt = encodeURIComponent(transformPrompt)
  const seed = Math.floor(Math.random() * 999999)

  const params = new URLSearchParams({
    width: String(Math.min(width, 1024)),
    height: String(Math.min(height, 1024)),
    nologo: 'true',
    model: 'turbo',
    seed: String(seed),
  })

  const headers = {}
  if (POLLINATIONS_KEY) headers['Authorization'] = `Bearer ${POLLINATIONS_KEY}`

  const res = await fetch(
    `https://image.pollinations.ai/prompt/${encodedPrompt}?${params}`,
    { method: 'GET', headers, signal: AbortSignal.timeout(60000) }
  )

  if (!res.ok) throw new Error(`Pollinations turbo HTTP ${res.status}`)

  const blob = await res.blob()
  if (!blob || blob.size === 0) throw new Error('Image vide')

  const buffer = Buffer.from(await blob.arrayBuffer())
  return `data:${blob.type || 'image/jpeg'};base64,${buffer.toString('base64')}`
}

// ── Build transform prompt based on mode ──
function buildPrompt(mode, artStyle, bgPrompt) {
  switch (mode) {
    case 'art':
      return `transform into ${artStyle}, artistic masterpiece, vivid colors, dramatic lighting`
    case 'professional':
      return `professional corporate headshot, ${bgPrompt || 'clean neutral background, studio lighting'}, LinkedIn profile photo quality, sharp focus`
    case 'remove-bg':
      return `subject isolated on pure white background, no background, clean cutout, product photography style`
    case 'custom-bg':
      return `same subject and pose, background replaced with: ${bgPrompt || 'beautiful scenic landscape'}, seamless composite, professional photography`
    default:
      return 'high quality professional transformation'
  }
}

export async function POST(req) {
  try {
    const formData = await req.formData()
    const imageFile = formData.get('image')
    const mode = formData.get('mode') || 'art'
    const artStyle = formData.get('artStyle') || 'oil painting'
    const bgPrompt = formData.get('bgPrompt') || ''

    if (!imageFile) {
      return NextResponse.json({ error: 'Image manquante' }, { status: 400 })
    }

    const mimeType = imageFile.type || 'image/jpeg'
    const imageBase64 = await fileToBase64(imageFile)
    const transformPrompt = buildPrompt(mode, artStyle, bgPrompt)

    // Estimate dimensions
    const width = 1024
    const height = 1024

    console.log(`[generer-Capture] mode: ${mode}, prompt: ${transformPrompt.slice(0, 80)}`)

    const providers = [
      {
        name: 'Pollinations kontext (img2img)',
        fn: () => tryPollinationsImg2Img({ imageBase64, mimeType, transformPrompt }),
      },
      {
        name: 'HuggingFace + Claude vision',
        fn: () => tryHuggingFaceRegen({ imageBase64, mimeType, transformPrompt, width, height }),
      },
      {
        name: 'Pollinations turbo (prompt only)',
        fn: () => tryPollinationsFallback({ transformPrompt, width, height }),
      },
    ]

    let lastError = null

    for (const provider of providers) {
      try {
        console.log(`Trying: ${provider.name}`)
        const imageUrl = await provider.fn()
        console.log(`✓ Success: ${provider.name}`)
        return NextResponse.json({ imageUrl, provider: provider.name })
      } catch (err) {
        console.error(`✗ ${provider.name} failed: ${err.message}`)
        lastError = err
        await sleep(5000 + Math.random() * 5000)
        continue
      }
    }

    return NextResponse.json(
      { error: lastError?.message || 'Tous les services sont indisponibles' },
      { status: 500 }
    )

  } catch (err) {
    console.error('[generer-Capture]', err)
    return NextResponse.json({ error: err.message || 'Erreur interne' }, { status: 500 })
  }
}