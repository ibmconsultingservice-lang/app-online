import { NextResponse } from 'next/server'

async function generateOne({ prompt, style, width, height }) {
  const fullPrompt = `${prompt}, ${style}, high quality, detailed, professional`
  const encodedPrompt = encodeURIComponent(fullPrompt)
  
  const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&nologo=true&model=flux&seed=${Math.floor(Math.random() * 999999)}`

  const res = await fetch(url, { method: 'GET' })

  if (!res.ok) {
    throw new Error(`Erreur génération: ${res.status}`)
  }

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