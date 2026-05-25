// app/api/fabula-quiz/route.js
// Generates a fresh quiz question for the given topic using Claude.

import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(req) {
  try {
    const { topic } = await req.json()

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `Generate ONE fun multiple-choice quiz question about: ${topic}.

Rules:
- Make it interesting and slightly surprising — not too easy, not too hard
- 4 answer options (A B C D)
- Only one correct answer
- Add a short "fun fact" explanation (1-2 sentences)
- Vary difficulty: easy / medium / hard

Respond ONLY with valid JSON, no markdown, no extra text:
{
  "q": "Question text here?",
  "opts": ["Option A", "Option B", "Option C", "Option D"],
  "ans": 2,
  "exp": "Short explanation with a fun fact.",
  "difficulty": "medium"
}`
      }]
    })

    const raw = message.content[0]?.text?.trim() || ''
    const clean = raw.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    // Validate
    if (!parsed.q || !Array.isArray(parsed.opts) || parsed.opts.length !== 4 || typeof parsed.ans !== 'number') {
      throw new Error('Invalid question format')
    }

    return Response.json(parsed)
  } catch (err) {
    // Fallback so the game never breaks
    const fallbacks = [
      { q: 'What is the only mammal capable of true flight?', opts: ['Flying squirrel', 'Sugar glider', 'Bat', 'Draco lizard'], ans: 2, exp: 'Bats are the only mammals with wings for powered flight. There are over 1,400 species!', difficulty: 'easy' },
      { q: 'Which ancient wonder was located in Alexandria, Egypt?', opts: ['The Colossus of Rhodes', 'The Lighthouse of Alexandria', 'The Hanging Gardens', 'The Temple of Artemis'], ans: 1, exp: 'The Lighthouse of Alexandria stood ~137m tall and guided sailors for centuries.', difficulty: 'medium' },
      { q: 'How long does it take light to travel from the Sun to Earth?', opts: ['8 seconds', '8 minutes', '8 hours', '8 days'], ans: 1, exp: 'Sunlight takes about 8 minutes and 20 seconds to reach Earth — 150 million km away!', difficulty: 'medium' },
    ]
    return Response.json(fallbacks[Math.floor(Math.random() * fallbacks.length)])
  }
}
