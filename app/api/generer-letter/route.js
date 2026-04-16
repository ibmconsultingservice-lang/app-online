import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(request) {
  try {
    const { prompt, letterType } = await request.json()

    if (!prompt || !prompt.trim()) {
      return Response.json({ error: 'Prompt manquant.' }, { status: 400 })
    }

    const typeLabels = {
      professional: 'professionnelle',
      motivation:   'de motivation',
      resignation:  'de démission',
      complaint:    'de réclamation',
      commercial:   'commerciale',
      administrative: 'administrative',
    }
    const typeLabel = typeLabels[letterType] || 'professionnelle'

    const systemPrompt = `Tu es un expert en rédaction de lettres professionnelles en français.
Tu dois générer une lettre ${typeLabel} complète et structurée basée sur la description de l'utilisateur.

IMPORTANT: Réponds UNIQUEMENT avec un objet JSON valide, sans markdown, sans backticks, sans texte avant ou après.

La structure JSON doit être exactement :
{
  "letter": {
    "senderName": "Nom et prénom de l'expéditeur (déduit du contexte ou générique)",
    "senderAddress": "Adresse de l'expéditeur (ex: 12 Rue des Almadies, Dakar, Sénégal)",
    "senderCityDate": "Ville, le [date du jour]",
    "recipientName": "Nom et titre du destinataire",
    "recipientAddress": "Adresse ou organisation du destinataire",
    "subject": "Objet : [objet clair et précis]",
    "salutation": "Formule d'appel appropriée (ex: Madame, Monsieur,)",
    "opening": "Paragraphe d'introduction (1-2 phrases, contextualise la lettre)",
    "body": "Corps principal de la lettre (2-4 paragraphes bien développés, séparés par des sauts de ligne \\n\\n)",
    "closing": "Formule de politesse complète et adaptée au type de lettre",
    "signature": "Prénom Nom de l'expéditeur"
  }
}

Règles importantes:
- Adapte le ton et le vocabulaire au type de lettre (${typeLabel})
- Le corps de la lettre doit être substantiel et bien argumenté
- Utilise des formules de politesse françaises professionnelles appropriées
- Si des informations manquent (nom, adresse...), utilise des placeholders réalistes entre crochets
- La date doit être au format français : ex "Dakar, le 16 avril 2026"`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Génère une lettre ${typeLabel} avec cette description : ${prompt}`
        }
      ]
    })

    const rawText = message.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('')

    // Strip any accidental markdown fences
    const clean = rawText
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/gi, '')
      .trim()

    let parsed
    try {
      parsed = JSON.parse(clean)
    } catch {
      console.error('JSON parse error. Raw response:', rawText)
      return Response.json({ error: 'Réponse IA invalide. Réessayez.' }, { status: 500 })
    }

    if (!parsed.letter) {
      return Response.json({ error: 'Structure de réponse incorrecte.' }, { status: 500 })
    }

    return Response.json({ letter: parsed.letter })

  } catch (err) {
    console.error('Letter generation error:', err)
    return Response.json({ error: 'Erreur interne du serveur.' }, { status: 500 })
  }
}