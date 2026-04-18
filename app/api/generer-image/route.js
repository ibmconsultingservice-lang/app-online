import { NextResponse } from 'next/server'

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

async function generateOne({ prompt, style, width, height }, attempt = 1) {
  const fullPrompt = `${prompt}, ${style}, high quality, detailed, professional`
  const encodedPrompt = encodeURIComponent(fullPrompt)
  const seed = Math.floor(Math.random() * 999999)

  const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&nologo=true&model=flux&seed=${seed}`

  const res = await fetch(url, { method: 'GET' })

  if (res.status === 429) {
    if (attempt >= 4) throw new Error('Trop de requêtes, réessayez dans quelques secondes')
    const wait = attempt * 3000 // 3s, 6s, 9s
    console.log(`429 — attente ${wait}ms avant retry ${attempt}`)
    await sleep(wait)
    return generateOne({ prompt, style, width, height }, attempt + 1)
  }

  if (!res.ok) throw new Error(`Erreur génération: ${res.status}`)

  const blob = await res.blob()
  if (!blob || blob.size === 0) throw new Error('Image vide reçue')

  const buffer = Buffer.from(await blob.arrayBuffer())
  return `data:${blob.type || 'image/jpeg'};base64,${buffer.toString('base64')}`
}

export async function POST(req) {
  try {
    const { prompt, style = 'photorealistic', size = '512x512', count = 1 } = await req.json()

    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'Prompt manquant' }, { status: 400 })
    }

    const [w, h] = size.split('x').map(n => Math.min(parseInt(n) || 512, 1024))
    const safeCount = Math.min(Math.max(parseInt(count) || 1, 1), 4)

    // Sequential instead of parallel — avoids hammering the free API
    const images = []
    const errors = []

    for (let i = 0; i < safeCount; i++) {
      try {
        if (i > 0) await sleep(2000) // 2s gap between each image
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