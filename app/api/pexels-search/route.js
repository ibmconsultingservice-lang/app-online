import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const q        = searchParams.get('q') || ''
  const per_page = searchParams.get('per_page') || '6'

  try {
    const res  = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=${per_page}`,
      { headers: { Authorization: process.env.PEXELS_API_KEY || '' } }
    )
    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ photos: [] }, { status: 500 })
  }
}