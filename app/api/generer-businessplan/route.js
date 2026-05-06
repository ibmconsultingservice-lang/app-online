import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request) {
  try {
    const { prompt } = await request.json()

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: `Tu es un expert en création de business plans professionnels adaptés au marché africain.
Tu génères des plans d'affaires structurés, complets et convaincants pour des investisseurs et des banques.
Réponds UNIQUEMENT avec un JSON valide, sans markdown, sans backticks, sans commentaires.
Les blocs de type "table" permettent de présenter des données chiffrées, des comparaisons ou des projections de manière claire.`,

      messages: [{
        role: 'user',
        content: `Génère un business plan complet et professionnel pour : "${prompt}"

Réponds avec ce JSON exact (sans aucun texte avant ou après) :
{
  "sections": [
    {
      "id": 1,
      "title": "Résumé Exécutif",
      "blocks": [
        { "id": 11, "type": "text", "content": "Paragraphe de présentation détaillé..." },
        {
          "id": 12,
          "type": "table",
          "content": {
            "headers": ["Indicateur", "Valeur"],
            "rows": [
              ["Investissement initial", "X €"],
              ["CA prévisionnel An 1", "X €"],
              ["Seuil de rentabilité", "Mois X"],
              ["ROI sur 3 ans", "X %"]
            ]
          }
        }
      ]
    }
  ]
}

Règles :
- Chaque bloc "text" doit contenir un paragraphe complet et détaillé (3-5 phrases minimum).
- Utilise des blocs "table" pour toutes les données chiffrées, projections ou comparaisons.
- Inclus exactement ces 8 sections dans cet ordre :
  1. Résumé Exécutif (texte + table indicateurs clés)
  2. Description de l'Entreprise (texte mission/vision + texte valeurs)
  3. Analyse du Marché (texte analyse + table taille du marché + table clientèle cible + table concurrence)
  4. Produits & Services (texte par pôle d'activité)
  5. Stratégie Marketing (texte + table canaux de distribution)
  6. Organisation & Management (texte équipe + table rôles + table plan recrutement)
  7. Plan Financier (table investissements + table financement + table charges mensuelles)
  8. Projections sur 3 ans (table CA par activité + table résultats nets + texte perspectives)

Adapte tous les chiffres, le marché et les exemples au contexte spécifique de l'entreprise décrite.`,
      }],
    })

    // Strip any accidental markdown fences
    let text = message.content[0].text.trim()
    text = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim()

    const data = JSON.parse(text)

    // Ensure every table block has valid content shape
    data.sections = data.sections.map(section => ({
      ...section,
      blocks: section.blocks.map(block => {
        if (block.type === 'table') {
          const content = block.content || {}
          return {
            ...block,
            content: {
              headers: Array.isArray(content.headers) ? content.headers : ['Colonne A', 'Colonne B'],
              rows: Array.isArray(content.rows) ? content.rows : [['-', '-']],
            },
          }
        }
        return block
      }),
    }))

    return NextResponse.json(data)

  } catch (error) {
    console.error('BusinessPlan API error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}