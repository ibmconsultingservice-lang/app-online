import { NextResponse } from 'next/server'

const HF_API_KEY = process.env.HF_API_KEY

async function generateOne({ prompt, style, width, height }) {
  const fullPrompt = `${prompt}, ${style}, high quality, detailed, professional`

  const res = await fetch('https://router.huggingface.co/fal-ai/fal-ai/flux/schnell', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${HF_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: fullPrompt,
      image_size: { width, height },
      num_inference_steps: 4,
      num_images: 1,
      enable_safety_checker: false,
    }),
  })

  if (res.status === 401 || res.status === 403) {
    throw new Error('Token invalide ou permission manquante')
  }
  if (res.status === 402) {
    throw new Error('Crédits épuisés — passez à HuggingFace PRO')
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    let msg = `Erreur HTTP ${res.status}`
    try { msg = JSON.parse(text)?.error || msg } catch {}
    throw new Error(msg)
  }

  const json = await res.json()
  const imageUrl = json?.images?.[0]?.url
  if (!imageUrl) throw new Error('Pas d\'URL image dans la réponse')

  // Fetch image and convert to base64
  const imgRes = await fetch(imageUrl)
  const blob = await imgRes.blob()
  const buffer = Buffer.from(await blob.arrayBuffer())
  return `data:${blob.type || 'image/jpeg'};base64,${buffer.toString('base64')}`
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