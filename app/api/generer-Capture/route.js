import { NextResponse } from 'next/server'

const POLLINATIONS_KEY = process.env.POLLINATIONS_KEY
const HF_API_KEY = process.env.HF_API_KEY
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

async function fileToBase64(file) {
  const buffer = Buffer.from(await file.arrayBuffer())
  return buffer.toString('base64')
}

// ── STEP 1: Claude vision describes the image precisely ──
async function describeImage(imageBase64, mimeType) {
  if (!ANTHROPIC_API_KEY) return null

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mimeType, data: imageBase64 },
            },
            {
              type: 'text',
              text: `Describe this person/subject in ONE detailed paragraph for an AI image generator. Include:
- Physical appearance (gender, age, skin tone, hair, facial features)
- Clothing and style
- Pose and expression
- Any distinctive details
Be very specific and precise. Start directly with the description, no preamble.`,
            },
          ],
        }],
      }),
      signal: AbortSignal.timeout(30000),
    })

    if (!res.ok) return null
    const data = await res.json()
    return data?.content?.[0]?.text || null
  } catch {
    return null
  }
}

// ── PROVIDER 1: Pollinations kontext (true img2img via POST) ──
async function tryPollinationsKontext({ imageBase64, mimeType, transformPrompt }, attempt = 1) {
  const headers = { 'Content-Type': 'application/json' }
  if (POLLINATIONS_KEY) headers['Authorization'] = `Bearer ${POLLINATIONS_KEY}`

  // kontext accepts image as base64 in POST body
  const res = await fetch('https://image.pollinations.ai/prompt/' + encodeURIComponent(transformPrompt), {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: 'kontext',
      image: `data:${mimeType};base64,${imageBase64}`,
      nologo: true,
      private: true,
      seed: Math.floor(Math.random() * 999999),
    }),
    signal: AbortSignal.timeout(120000),
  })

  console.log(`[Pollinations kontext POST attempt ${attempt}] status: ${res.status}`)

  if (res.status === 429) {
    if (attempt >= 3) throw new Error('RATE_LIMIT')
    await sleep(attempt * 10000)
    return tryPollinationsKontext({ imageBase64, mimeType, transformPrompt }, attempt + 1)
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Pollinations kontext HTTP ${res.status}: ${text.slice(0, 100)}`)
  }

  const blob = await res.blob()
  if (!blob || blob.size === 0) throw new Error('Image vide reçue')

  const buffer = Buffer.from(await blob.arrayBuffer())
  return `data:${blob.type || 'image/jpeg'};base64,${buffer.toString('base64')}`
}

// ── PROVIDER 2: HuggingFace fal-ai with image + Claude description ──
async function tryHuggingFaceWithDescription({ imageBase64, mimeType, transformPrompt, subjectDescription }) {
  if (!HF_API_KEY) throw new Error('HF_API_KEY non configuré')

  // Combine subject description with transformation
  const finalPrompt = subjectDescription
    ? `${subjectDescription}, ${transformPrompt}, high quality, photorealistic, detailed`
    : `${transformPrompt}, high quality, photorealistic, detailed`

  console.log(`[HF] final prompt: ${finalPrompt.slice(0, 120)}...`)

  // Try fal-ai flux-kontext (image-to-image)
  const res = await fetch('https://router.huggingface.co/fal-ai/fal-ai/flux-kontext/schnell', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${HF_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: transformPrompt,
      image_url: `data:${mimeType};base64,${imageBase64}`,
      num_inference_steps: 4,
      num_images: 1,
    }),
    signal: AbortSignal.timeout(90000),
  })

  console.log(`[HF flux-kontext] status: ${res.status}`)

  if (res.status === 404) {
    // flux-kontext not available, fall back to flux-schnell with description
    return tryHuggingFaceFluxWithDesc({ finalPrompt })
  }

  if (res.status === 402) throw new Error('HF crédits épuisés')
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HF HTTP ${res.status}: ${text.slice(0, 100)}`)
  }

  const json = await res.json()
  const imageUrl = json?.images?.[0]?.url
  if (!imageUrl) throw new Error('Pas d\'URL image HF')

  const imgRes = await fetch(imageUrl)
  const blob = await imgRes.blob()
  const buffer = Buffer.from(await blob.arrayBuffer())
  return `data:${blob.type || 'image/jpeg'};base64,${buffer.toString('base64')}`
}

async function tryHuggingFaceFluxWithDesc({ finalPrompt }) {
  const res = await fetch('https://router.huggingface.co/fal-ai/fal-ai/flux/schnell', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${HF_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: finalPrompt,
      image_size: { width: 1024, height: 1024 },
      num_inference_steps: 4,
      num_images: 1,
      enable_safety_checker: false,
    }),
    signal: AbortSignal.timeout(60000),
  })

  if (!res.ok) throw new Error(`HF flux HTTP ${res.status}`)

  const json = await res.json()
  const imageUrl = json?.images?.[0]?.url
  if (!imageUrl) throw new Error('Pas d\'URL image')

  const imgRes = await fetch(imageUrl)
  const blob = await imgRes.blob()
  const buffer = Buffer.from(await blob.arrayBuffer())
  return `data:${blob.type || 'image/jpeg'};base64,${buffer.toString('base64')}`
}

// ── Build transform prompt ──
function buildPrompt(mode, artStyle, bgPrompt, subjectDescription) {
  const subject = subjectDescription
    ? `This exact person: ${subjectDescription.slice(0, 200)}`
    : 'the subject in the image'

  switch (mode) {
    case 'art':
      return `${subject}, transformed into ${artStyle}, masterpiece quality, vivid colors, dramatic lighting, keep facial features and likeness`
    case 'professional':
      return `${subject}, professional corporate headshot, ${bgPrompt || 'clean neutral gray background, studio lighting'}, LinkedIn quality photo, sharp focus, formal attire, confident pose`
    case 'remove-bg':
      return `${subject}, isolated on pure white background, no background elements, product photography cutout style, sharp clean edges`
    case 'custom-bg':
      return `${subject}, same pose and appearance, background replaced with: ${bgPrompt || 'scenic landscape'}, seamless professional composite, natural lighting`
    default:
      return `${subject}, high quality professional transformation`
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

    console.log(`[generer-Capture] mode: ${mode}, analyzing image with Claude...`)

    // Step 1: Get precise description from Claude vision
    const subjectDescription = await describeImage(imageBase64, mimeType)
    console.log(`[Claude description]: ${subjectDescription?.slice(0, 100)}...`)

    // Step 2: Build prompt combining description + transformation
    const transformPrompt = buildPrompt(mode, artStyle, bgPrompt, subjectDescription)
    console.log(`[Transform prompt]: ${transformPrompt.slice(0, 120)}...`)

    // Step 3: Try providers in order
    const providers = [
      {
        name: 'Pollinations kontext (img2img)',
        fn: () => tryPollinationsKontext({ imageBase64, mimeType, transformPrompt }),
      },
      {
        name: 'HuggingFace flux-kontext + description',
        fn: () => tryHuggingFaceWithDescription({ imageBase64, mimeType, transformPrompt, subjectDescription }),
      },
    ]

    let lastError = null

    for (const provider of providers) {
      try {
        console.log(`Trying: ${provider.name}`)
        const imageUrl = await provider.fn()
        console.log(`✓ Success: ${provider.name}`)
        return NextResponse.json({
          imageUrl,
          provider: provider.name,
          description: subjectDescription?.slice(0, 100),
        })
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