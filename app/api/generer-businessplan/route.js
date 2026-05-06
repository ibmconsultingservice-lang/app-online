// app/api/generer-businessplan/route.js
import { NextResponse } from 'next/server'

// ─── System prompt ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Tu es un expert en création de business plans professionnels.
L'utilisateur te donne une description de son projet.
Tu dois générer un business plan structuré et complet en JSON.

RÈGLES STRICTES :
1. Réponds UNIQUEMENT avec un objet JSON valide, sans balises markdown, sans texte avant ou après.
2. La structure doit être exactement :
{
  "sections": [
    {
      "id": 1,
      "title": "Résumé Exécutif",
      "blocks": [
        { "id": 101, "type": "text", "content": "Texte de présentation..." },
        {
          "id": 102,
          "type": "table",
          "content": {
            "headers": ["Indicateur", "Valeur"],
            "rows": [
              ["Investissement initial", "XX XXX €"],
              ["CA prévisionnel An 1", "XX XXX €"]
            ]
          }
        }
      ]
    }
  ]
}

3. Génère entre 6 et 9 sections couvrant :
   - Résumé Exécutif (avec tableau des chiffres clés)
   - Présentation de l'entreprise
   - Analyse de marché (avec tableau des segments cibles)
   - Offre de produits / services
   - Stratégie commerciale & marketing
   - Structure organisationnelle
   - Plan financier (avec tableau de projection sur 3 ans)
   - Analyse des risques (avec tableau risques/mitigation)
   - Conclusion & Perspectives

4. Chaque section doit avoir au minimum 1 bloc texte et 1 bloc tableau si pertinent.
5. Les textes doivent être rédigés en français, professionnels, denses et concrets.
6. Utilise des données réalistes et chiffrées basées sur le secteur décrit.
7. Les IDs doivent être des entiers uniques (sections : 1,2,3... ; blocs : 101,102,201,202...).
8. N'invente pas de noms propres, reste générique sauf si l'utilisateur en mentionne.`

// ─── POST handler ─────────────────────────────────────────────────────────────
export async function POST(req) {
  try {
    const body = await req.json()
    const { prompt } = body

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 10) {
      return NextResponse.json(
        { error: 'Prompt invalide ou trop court (minimum 10 caractères).' },
        { status: 400 }
      )
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      console.error('[generer-businessplan] ANTHROPIC_API_KEY manquante.')
      return NextResponse.json(
        { error: 'Configuration serveur incorrecte.' },
        { status: 500 }
      )
    }

    // ── Appel API Anthropic ────────────────────────────────────────────────
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 8000,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Génère un business plan complet pour le projet suivant :\n\n${prompt.trim()}`,
          },
        ],
      }),
    })

    if (!anthropicRes.ok) {
      const errBody = await anthropicRes.text()
      console.error('[generer-businessplan] Erreur Anthropic:', anthropicRes.status, errBody)
      return NextResponse.json(
        { error: `Erreur API Anthropic (${anthropicRes.status}).` },
        { status: 502 }
      )
    }

    const anthropicData = await anthropicRes.json()

    // ── Extraction du texte ────────────────────────────────────────────────
    const rawText = anthropicData.content
      ?.filter(c => c.type === 'text')
      .map(c => c.text)
      .join('') ?? ''

    if (!rawText) {
      console.error('[generer-businessplan] Réponse vide de l\'API.')
      return NextResponse.json(
        { error: 'Réponse vide reçue de l\'IA.' },
        { status: 500 }
      )
    }

    // ── Parse JSON (nettoie les fences markdown si présentes) ─────────────
    let parsed
    try {
      const clean = rawText
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```\s*$/i, '')
        .trim()
      parsed = JSON.parse(clean)
    } catch (parseErr) {
      console.error('[generer-businessplan] Erreur JSON parse:', parseErr)
      console.error('[generer-businessplan] Texte brut reçu:', rawText.slice(0, 500))
      return NextResponse.json(
        { error: 'Réponse IA invalide — format JSON incorrect.' },
        { status: 500 }
      )
    }

    // ── Validation de la structure ─────────────────────────────────────────
    if (!Array.isArray(parsed.sections) || parsed.sections.length === 0) {
      return NextResponse.json(
        { error: 'Structure de business plan invalide reçue de l\'IA.' },
        { status: 500 }
      )
    }

    // ── Sanitisation & enforcement des types ──────────────────────────────
    const sections = parsed.sections.map((section, si) => ({
      id: typeof section.id === 'number' ? section.id : si + 1,
      title: String(section.title ?? `Section ${si + 1}`),
      blocks: (Array.isArray(section.blocks) ? section.blocks : []).map((block, bi) => {
        const baseId = typeof block.id === 'number' ? block.id : (si + 1) * 100 + bi + 1

        if (block.type === 'table') {
          const headers = Array.isArray(block.content?.headers)
            ? block.content.headers.map(String)
            : ['Colonne A', 'Colonne B']

          const rows = Array.isArray(block.content?.rows)
            ? block.content.rows.map(row =>
                Array.isArray(row) ? row.map(String) : headers.map(() => '-')
              )
            : [['-', '-']]

          return { id: baseId, type: 'table', content: { headers, rows } }
        }

        return {
          id: baseId,
          type: 'text',
          content: String(
            typeof block.content === 'string'
              ? block.content
              : JSON.stringify(block.content)
          ),
        }
      }),
    }))

    return NextResponse.json({ sections }, { status: 200 })

  } catch (err) {
    console.error('[generer-businessplan] Erreur inattendue:', err)
    return NextResponse.json(
      { error: 'Erreur interne du serveur.' },
      { status: 500 }
    )
  }
}

// ─── Bloquer les requêtes GET ─────────────────────────────────────────────────
export function GET() {
  return NextResponse.json(
    { error: 'Méthode non autorisée. Utilisez POST.' },
    { status: 405 }
  )
}