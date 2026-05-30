import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

function parseJSON(text) {
  // 1. Direct parse
  try { return JSON.parse(text.trim()) } catch {}
  // 2. Strip markdown fences
  const stripped = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()
  try { return JSON.parse(stripped) } catch {}
  // 3. Extract first JSON object
  const match = text.match(/\{[\s\S]*\}/)
  if (match) try { return JSON.parse(match[0]) } catch {}
  return null
}

const VALID_P_KEYS = ['product', 'price', 'place', 'promotion', 'people', 'process', 'physical']
const VALID_STATUSES = ['actif', 'planifié', 'en-cours', 'à-améliorer']

export async function POST(request) {
  try {
    const body         = await request.json()
    const projectDesc  = body.projectDesc  || ''
    const myCompany    = body.myCompany    || ''
    const sector       = body.sector       || ''
    const region       = body.region       || ''
    const activityType = body.activityType || ''
    const targetMarket = body.targetMarket || ''
    const objectives   = body.objectives   || ''
    const projectName  = body.projectName  || ''
    const projectTag   = body.projectTag   || ''

    if (!projectDesc.trim()) {
      return Response.json({ error: 'Description du projet requise' }, { status: 400 })
    }

    const contextLines = [
      myCompany    ? `Notre entreprise : ${myCompany}`         : null,
      sector       ? `Secteur : ${sector}`                     : null,
      activityType ? `Type d'activité : ${activityType}`       : null,
      region       ? `Région / Marché : ${region}`             : null,
      targetMarket ? `Marché cible : ${targetMarket}`          : null,
      objectives   ? `Objectifs : ${objectives}`               : null,
      projectName  ? `Nom du projet : ${projectName}`          : null,
      projectTag   ? `Tag : ${projectTag}`                     : null,
    ].filter(Boolean).join('\n')

    const systemPrompt = `Tu es un expert en marketing stratégique et en analyse du mix marketing 7P.
Tu génères des analyses 7P précises, concrètes et adaptées au secteur.
Tu réponds UNIQUEMENT en JSON valide, sans balises markdown, sans texte avant ou après.`

    const userPrompt = `Analyse ce projet et génère un Mix Marketing 7P complet.

## PROJET
${projectDesc}

${contextLines ? `## CONTEXTE\n${contextLines}` : ''}

---

Génère entre 2 et 4 éléments par P (7 P au total = entre 14 et 28 éléments).
Chaque élément doit être concret, actionnable et adapté au secteur.

Retourne UNIQUEMENT ce JSON :
{
  "items": [
    {
      "p_key": "product",
      "title": "Titre court et percutant",
      "description": "Description en 1-2 phrases : état actuel, spécificités, enjeux",
      "score": 3,
      "status": "actif",
      "notes": "Remarque optionnelle ou point d'attention"
    }
  ]
}

Valeurs autorisées pour p_key : product, price, place, promotion, people, process, physical
Valeurs autorisées pour score : 1 (très faible) à 5 (excellent)
Valeurs autorisées pour status : actif, planifié, en-cours, à-améliorer

Définitions des 7P pour guider ta génération :
- product : Offre, caractéristiques, qualité, gamme, marque, packaging
- price : Stratégie tarifaire, positionnement prix, remises, valeur perçue
- place : Canaux de distribution, accessibilité, couverture géographique, logistique
- promotion : Communication, publicité, marketing digital, relations presse, SEO/SEA
- people : Équipe, compétences clés, culture, expérience client, service
- process : Procédures internes, automatisation, parcours client, délais, efficacité
- physical : Preuves physiques, environnement, témoignages, certifications, interface

Adapte les scores à la réalité du projet décrit. Sois critique et précis.`

    const response = await client.messages.create({
      model:   'claude-sonnet-4-20250514',
      max_tokens: 3000,
      system:  systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const rawText = response.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('')

    const result = parseJSON(rawText)

    if (!result) {
      console.error('generer-7p-generate: parse fail. Raw:', rawText.slice(0, 500))
      return Response.json({ error: 'Réponse IA invalide — impossible de parser le JSON' }, { status: 500 })
    }

    if (!Array.isArray(result.items) || result.items.length === 0) {
      console.error('generer-7p-generate: no items. Result:', JSON.stringify(result).slice(0, 300))
      return Response.json({ error: "Aucun élément généré par l'IA" }, { status: 500 })
    }

    // Normalize items
    let idCounter = 1
    result.items = result.items
      .filter(item => item && VALID_P_KEYS.includes(item.p_key))
      .map(item => ({
        id:          `gen-${Date.now()}-${idCounter++}`,
        p_key:       item.p_key,
        title:       String(item.title       || '').trim() || 'Élément sans titre',
        description: String(item.description || '').trim(),
        score:       Math.min(5, Math.max(1, parseInt(item.score) || 3)),
        status:      VALID_STATUSES.includes(item.status) ? item.status : 'actif',
        notes:       String(item.notes || '').trim(),
      }))

    if (result.items.length === 0) {
      return Response.json({ error: "Aucun élément valide généré" }, { status: 500 })
    }

    return Response.json({ success: true, result })

  } catch (err) {
    console.error('generer-7p-generate error:', err)
    return Response.json({ error: err.message || 'Erreur serveur interne' }, { status: 500 })
  }
}