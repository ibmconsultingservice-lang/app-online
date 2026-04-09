import Groq from 'groq-sdk'
import { NextResponse } from 'next/server'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

export async function POST(request) {
  try {
    const formData = await request.formData()
    const file = formData.get('audio')

    if (!file) {
      return NextResponse.json({ error: 'No audio file' }, { status: 400 })
    }

    const transcription = await groq.audio.transcriptions.create({
      file:     file,
      model:    'whisper-large-v3',
      language: 'fr',
    })

    return NextResponse.json({ text: transcription.text })

  } catch (error) {
    console.error('Groq error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}