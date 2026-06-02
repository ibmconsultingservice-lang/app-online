import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const getOutcome = (v, r, i, o) => {
  if (!v)                return { tier: 0, label: 'Désavantage compétitif',         short: 'Désavantage',  icon: '↓' }
  if (v && !r)           return { tier: 1, label: 'Parité compétitive',             short: 'Parité',       icon: '→' }
  if (v && r && !i)      return { tier: 2, label: 'Avantage compétitif temporaire', short: 'Temporaire',   icon: '↗' }
  if (v && r && i && !o) return { tier: 3, label: 'Avantage non exploité',          short: 'Non exploité', icon: '◐' }
  return                        { tier: 4, label: 'Avantage concurrentiel durable', short: 'Durable',      icon: '★' }
}

const CATEGORY_LABELS = {
  physical: 'Physique', financial: 'Financier', human: 'Humain',
  technology: 'Technologique', reputation: 'Réputation',
  relational: 'Relationnel', knowledge: 'Connaissance', other: 'Autre',
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { description, projectName, projectTag } = body

    if (!description?.trim()) {
      return Response.json({ error: 'Description requise' }, { status: 400 })
    }

    const contextLines = [
      projectName && `Entreprise / Projet : ${projectName}`,
      projectTag  && `Secteur : ${projectTag}`,
    ].filter(Boolean).join('\n')

    const prompt = `Tu es un expert en stratégie d'entreprise, spécialiste du framework VRIO (Barney, 1991).

${contextLines ? `## CONTEXTE\n${contextLines}\n` : ''}

## DESCRIPTION FOURNIE :
${description}

---

À partir de cette description, identifie et évalue les ressources et capacités stratégiques clés selon le framework VRIO.

Génère entre 6 et 10 ressources pertinentes, couvrant différentes catégories.

Réponds UNIQUEMENT en JSON valide :

{
  "analysisName": "Nom court et pertinent (ex: 'Ressources Stratégiques 2025')",
  "context": "Résumé du contexte stratégique en 1-2 phrases",
  "resources": [
    {
      "name": "Nom précis et court de la ressource",
      "description": "Description de la ressource et de son rôle stratégique (1-2 phrases)",
      "category": "physical|financial|human|technology|reputation|relational|knowledge|other",
      "valuable": true,
      "rare": true,
      "inimitable": false,
      "organized": true,
      "notes": "Justification de l'évaluation VRIO et contexte concurrentiel (1-2 phrases)",
      "strength": 4
    }
  ],
  "synthese": "Paragraphe de 4-5 phrases sur la position concurrentielle globale basée sur ce portefeuille VRIO : forces, vulnérabilités, cohérence, perspective concurrentielle.",
  "ressources_analyse": [
    {
      "nom": "Nom exact de la ressource",
      "tier": 4,
      "analyse": "Analyse de 2 phrases spécifiques sur cette ressource",
      "action": "Action concrète prioritaire (max 12 mots)"
    }
  ],
  "avantages_cles": [
    "Description d'un avantage concurrentiel durable identifié #1",
    "Avantage #2 (si pertinent)"
  ],
  "vulnerabilites": [
    "Vulnérabilité stratégique à adresser #1",
    "Vulnérabilité #2 (si pertinent)"
  ],
  "priorites": [
    "Recommandation stratégique #1 concrète et mesurable",
    "Recommandation #2",
    "Recommandation #3",
    "Recommandation #4",
    "Recommandation #5"
  ],
  "conclusion": "Verdict stratégique d'une phrase sur la solidité de l'avantage concurrentiel."
}

RÈGLES IMPÉRATIVES :
- valuable  : true/false — la ressource crée-t-elle de la valeur face à la concurrence ?
- rare      : true/false — peu de concurrents possèdent cette ressource ?
- inimitable: true/false — difficile/coûteux à reproduire pour les concurrents ?
- organized : true/false — l'entreprise est-elle organisée pour l'exploiter pleinement ?
- strength  : entier 1-5 (1=très faible, 5=très forte)
- Varier les niveaux VRIO : ne pas tout mettre en Tier 4, refléter la réalité du contexte
- Couvrir au moins 3 catégories différentes
- Les ressources Tier 0-1 sont importantes : elles révèlent les vrais gaps stratégiques
- Si la description est vague, inférer des ressources typiques du secteur
- category : exactement l'une des valeurs: physical, financial, human, technology, reputation, relational, knowledge, other`

    const response = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
    })

    const rawText = response.content.filter(b => b.type === 'text').map(b => b.text).join('')

    let result
    try {
      const m = rawText.match(/\{[\s\S]*\}/)
      if (!m) throw new Error('No JSON')
      result = JSON.parse(m[0])

      const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

      result.resources = (result.resources || []).map(r => {
        const v = r.valuable, ra = r.rare, i = r.inimitable, o = r.organized
        const outcome = getOutcome(v, ra, i, o)
        return {
          ...r,
          id:       uid(),
          valuable:   typeof v  === 'boolean' ? v  : null,
          rare:       typeof ra === 'boolean' ? ra : null,
          inimitable: typeof i  === 'boolean' ? i  : null,
          organized:  typeof o  === 'boolean' ? o  : null,
          strength:   Math.min(5, Math.max(1, parseInt(r.strength) || 3)),
          category:   ['physical','financial','human','technology','reputation','relational','knowledge','other'].includes(r.category) ? r.category : 'other',
          outcome,
        }
      })

    } catch (e) {
      return Response.json({ error: 'Erreur de génération — veuillez réessayer.' }, { status: 500 })
    }

    return Response.json({ success: true, result })

  } catch (err) {
    console.error('VRIO Auto error:', err)
    return Response.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}