import { NextResponse } from 'next/server'

export async function GET() {
  const key = process.env.HF_API_KEY
  
  // Test the exact working URL from curl
  const res = await fetch('https://router.huggingface.co/fal-ai/fal-ai/flux/schnell', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: 'a cat',
      image_size: { width: 512, height: 512 },
      num_inference_steps: 4,
      num_images: 1,
    }),
  })

  const text = await res.text()

  return NextResponse.json({
    key_exists: !!key,
    key_prefix: key?.slice(0, 8),
    key_length: key?.length,
    hf_status: res.status,
    hf_response: text.slice(0, 300),
  })
}