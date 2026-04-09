import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request) {
  try {
    const { text } = await request.json()  // ← was: transcription

    if (!text) {
      return NextResponse.json({ error: 'No transcription provided' }, { status: 400 })
    }

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: `Tu es un expert en analyse de réunions et de discours.
Tu produis des résumés stratégiques structurés, clairs et actionnables.
Réponds toujours en français.CONSIGNE DE FORMAT : N'utilise jamais de texte en gras (**). 
Utilise uniquement des tirets (-), des puces (•) et des emojis pour structurer ta réponse.`,
      messages: [{
        role: 'user',
        content: `Analyse cette transcription et détermine d'abord si c'est une RÉUNION ou un autre type de contenu (discours, cours, podcast, etc.).

SI C'EST UNE RÉUNION, structure le résumé ainsi :

## 📌 Points focus de la réunion
(les sujets principaux abordés)

## ✅ Décisions entreprises
(ce qui a été décidé collectivement)

## ⚡ Actions à faire
(tâches concrètes à accomplir, avec responsables si mentionnés)

## 📅 Détails de la prochaine réunion
(date, lieu, ordre du jour prévu — si non mentionnés, indique "Non précisé")

---

SI CE N'EST PAS UNE RÉUNION, structure le résumé ainsi :

## 🔑 Éléments cruciaux
(les idées et points essentiels du contenu)

## 🪜 Étapes importantes
(la progression logique ou chronologique du contenu)

## ⚡ Actions à mener
(ce que l'auditeur devrait faire concrètement après avoir écouté)

## 🏁 Conclusion
(synthèse finale et message central du contenu)

---
TRANSCRIPTION :
${text}`  // ← was: ${transcription}
      }]
    })

    return NextResponse.json({ summary: message.content[0].text })

  } catch (error) {
    console.error('Summarize error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}