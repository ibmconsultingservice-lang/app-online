export async function POST(request) {
  try {
    const formData = await request.formData()
    const image = formData.get('image')

    if (!image) {
      return Response.json({ error: 'No image provided' }, { status: 400 })
    }

    // Convert image to buffer once — reused across all providers
    const imageBuffer = Buffer.from(await image.arrayBuffer())
    const mimeType = image.type || 'image/jpeg'

    // ── PROVIDER 1: Your Railway Python API ──
    const PYTHON_API_URL = process.env.PYTHON_API_URL || 'https://removebg-api-production.up.railway.app'
    try {
      const proxyForm = new FormData()
      proxyForm.append('image', new Blob([imageBuffer], { type: mimeType }), image.name || 'image.jpg')

      const res = await fetch(`${PYTHON_API_URL}/remove-bg`, {
        method: 'POST',
        body: proxyForm,
        signal: AbortSignal.timeout(25000),
      })

      if (res.ok) {
        const buffer = await res.arrayBuffer()
        console.log('[removebg] ✓ Python API success')
        return new Response(buffer, {
          headers: { 'Content-Type': 'image/png' },
        })
      }
      console.log(`[removebg] Python API returned ${res.status} — trying HF fallback`)
    } catch (err) {
      console.log(`[removebg] Python API unreachable (${err.message}) — trying HF fallback`)
    }

    // ── PROVIDER 2: HuggingFace RMBG-2.0 ──
    const HF_API_KEY = process.env.HF_API_KEY
    if (HF_API_KEY) {
      try {
        const res = await fetch(
          'https://router.huggingface.co/hf-inference/models/briaai/RMBG-2.0',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${HF_API_KEY}`,
              'Content-Type': mimeType,
              'x-wait-for-model': 'true',
            },
            body: imageBuffer,
            signal: AbortSignal.timeout(45000),
          }
        )

        if (res.ok) {
          const buffer = await res.arrayBuffer()
          // HF returns a mask PNG — composite it onto transparent background
          const resultPng = await compositeWithMask(imageBuffer, mimeType, Buffer.from(buffer))
          console.log('[removebg] ✓ HF RMBG-2.0 success')
          return new Response(resultPng, {
            headers: { 'Content-Type': 'image/png' },
          })
        }
        console.log(`[removebg] HF RMBG-2.0 returned ${res.status} — trying RMBG-1.4`)
      } catch (err) {
        console.log(`[removebg] HF RMBG-2.0 failed (${err.message}) — trying RMBG-1.4`)
      }

      // ── PROVIDER 3: HuggingFace RMBG-1.4 fallback ──
      try {
        const res = await fetch(
          'https://router.huggingface.co/hf-inference/models/briaai/RMBG-1.4',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${HF_API_KEY}`,
              'Content-Type': mimeType,
              'x-wait-for-model': 'true',
            },
            body: imageBuffer,
            signal: AbortSignal.timeout(45000),
          }
        )

        if (res.ok) {
          const buffer = await res.arrayBuffer()
          const resultPng = await compositeWithMask(imageBuffer, mimeType, Buffer.from(buffer))
          console.log('[removebg] ✓ HF RMBG-1.4 success')
          return new Response(resultPng, {
            headers: { 'Content-Type': 'image/png' },
          })
        }
        console.log(`[removebg] HF RMBG-1.4 returned ${res.status}`)
      } catch (err) {
        console.log(`[removebg] HF RMBG-1.4 failed: ${err.message}`)
      }
    } else {
      console.log('[removebg] HF_API_KEY not set — skipping HF providers')
    }

    // ── All providers failed ──
    return Response.json(
      { error: 'Service de suppression de fond temporairement indisponible. Réessayez dans quelques instants.' },
      { status: 503 }
    )

  } catch (err) {
    console.error('[removebg] Unexpected error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// ── Composite original image with alpha mask from HF ──
// HF RMBG returns a grayscale mask PNG — we apply it as alpha channel
async function compositeWithMask(originalBuffer, mimeType, maskBuffer) {
  try {
    const sharp = (await import('sharp')).default

    // Get original image as raw RGBA
    const original = sharp(originalBuffer)
    const { width, height } = await original.metadata()

    // Resize mask to match original dimensions and extract as raw grayscale
    const maskRaw = await sharp(maskBuffer)
      .resize(width, height)
      .greyscale()
      .raw()
      .toBuffer()

    // Get original as raw RGBA
    const originalRaw = await original
      .ensureAlpha()
      .raw()
      .toBuffer()

    // Apply mask as alpha channel
    const result = Buffer.alloc(width * height * 4)
    for (let i = 0; i < width * height; i++) {
      result[i * 4]     = originalRaw[i * 4]     // R
      result[i * 4 + 1] = originalRaw[i * 4 + 1] // G
      result[i * 4 + 2] = originalRaw[i * 4 + 2] // B
      result[i * 4 + 3] = maskRaw[i]              // A from mask
    }

    return await sharp(result, {
      raw: { width, height, channels: 4 },
    })
      .png()
      .toBuffer()

  } catch (sharpErr) {
    // sharp not available — return mask directly (still useful)
    console.log('[removebg] sharp not available, returning mask as-is:', sharpErr.message)
    return maskBuffer
  }
}