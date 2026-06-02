import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

function parseJSON(text) {
  try { return JSON.parse(text.trim()) } catch {}
  const stripped = text.replace(/^```(?:json)?\s*/im, '').replace(/```\s*$/im, '').trim()
  try { return JSON.parse(stripped) } catch {}
  const match = text.match(/\{[\s\S]*\}/)
  if (match) try { return JSON.parse(match[0]) } catch {}
  return null
}

const JOURNEY_STAGES = ['awareness', 'consideration', 'decision', 'purchase', 'retention', 'advocacy']

function normalizePersona(raw) {
  if (!raw || typeof raw !== 'object') return {
    name: '', age: '', gender: '', job: '', location: '', income: '', education: '',
    avatar: '👤', goals: [], frustrations: [], motivations: [], buyingBehavior: '',
    preferredChannels: [], techSavviness: 3, quote: '', bio: '',
  }
  return {
    name:              String(raw.name              || '').trim(),
    age:               String(raw.age               || '').trim(),
    gender:            String(raw.gender            || '').trim(),
    job:               String(raw.job               || '').trim(),
    location:          String(raw.location          || '').trim(),
    income:            String(raw.income            || '').trim(),
    education:         String(raw.education         || '').trim(),
    avatar:            String(raw.avatar            || '👤').trim(),
    bio:               String(raw.bio               || '').trim(),
    quote:             String(raw.quote             || '').trim(),
    buyingBehavior:    String(raw.buyingBehavior    || '').trim(),
    techSavviness:     Math.min(5, Math.max(1, parseInt(raw.techSavviness) || 3)),
    goals:             Array.isArray(raw.goals)             ? raw.goals.map(String)             : [],
    frustrations:      Array.isArray(raw.frustrations)      ? raw.frustrations.map(String)      : [],
    motivations:       Array.isArray(raw.motivations)       ? raw.motivations.map(String)       : [],
    preferredChannels: Array.isArray(raw.preferredChannels) ? raw.preferredChannels.map(String) : [],
  }
}

function normalizeEmpathy(raw) {
  if (!raw || typeof raw !== 'object') return {
    thinks: [], feels: [], sees: [], hears: [], says: [], does: [], pains: [], gains: [],
  }
  const fields = ['thinks', 'feels', 'sees', 'hears', 'says', 'does', 'pains', 'gains']
  const result = {}
  for (const f of fields) {
    result[f] = Array.isArray(raw[f]) ? raw[f].map(String).filter(Boolean) : []
  }
  return result
}

function normalizeJourneyMap(raw) {
  const fallback = JOURNEY_STAGES.map(id => ({
    stageId: id, touchpoints: [], customerActions: [],
    emotions: 3, painPoints: [], opportunities: [], channels: [],
  }))
  if (!Array.isArray(raw) || raw.length === 0) return fallback

  return JOURNEY_STAGES.map((stageId, i) => {
    const stage = raw.find(s => s.stageId === stageId) || raw[i] || {}
    return {
      stageId,
      touchpoints:     Array.isArray(stage.touchpoints)     ? stage.touchpoints.map(String)     : [],
      customerActions: Array.isArray(stage.customerActions) ? stage.customerActions.map(String) : [],
      emotions:        Math.min(5, Math.max(1, parseInt(stage.emotions) || 3)),
      painPoints:      Array.isArray(stage.painPoints)      ? stage.painPoints.map(String)      : [],
      opportunities:   Array.isArray(stage.opportunities)   ? stage.opportunities.map(String)   : [],
      channels:        Array.isArray(stage.channels)        ? stage.channels.map(String)        : [],
    }
  })
}

export async function POST(request) {
  try {
    const body        = await request.json()
    const projectDesc = String(body.projectDesc  || '').trim()
    const projectName = String(body.projectName  || '').trim()
    const projectTag  = String(body.projectTag   || '').trim()

    if (!projectDesc) {
      return Response.json({ error: 'Description du projet requise' }, { status: 400 })
    }

    const meta = [
      projectName ? `Projet : ${projectName}` : null,
      projectTag  ? `Tag : ${projectTag}`      : null,
    ].filter(Boolean).join('\n')

    const systemPrompt = `Tu es un expert en marketing client, UX research et stratégie d'expérience client.
Tu génères des Buyer Personas, Empathy Maps et Customer Journey Maps précis et actionnables.
Tu réponds UNIQUEMENT en JSON valide, sans balises markdown, sans texte avant ou après.`

    const userPrompt = `Génère un profil client complet (Buyer Persona + Empathy Map + Customer Journey Map) pour ce projet :

${meta ? `## META\n${meta}\n\n` : ''}## CONTEXTE PRODUIT / PROJET
${projectDesc}

---

Retourne UNIQUEMENT ce JSON (sans texte, sans backticks) :

{
  "persona": {
    "name": "Prénom Nom réaliste et mémorable",
    "age": "35",
    "gender": "Femme",
    "job": "Directrice de Projet Digital",
    "location": "Lyon, France",
    "income": "58 000€/an",
    "education": "Master Management",
    "avatar": "👩‍💼",
    "bio": "Description narrative du quotidien et contexte de vie en 2-3 phrases.",
    "quote": "Citation authentique qui résume sa problématique principale.",
    "buyingBehavior": "Description de son processus de décision d'achat en 2 phrases.",
    "techSavviness": 4,
    "goals": [
      "Objectif concret 1",
      "Objectif concret 2",
      "Objectif concret 3"
    ],
    "frustrations": [
      "Frustration réelle 1",
      "Frustration réelle 2",
      "Frustration réelle 3"
    ],
    "motivations": [
      "Motivation profonde 1",
      "Motivation profonde 2",
      "Motivation profonde 3"
    ],
    "preferredChannels": ["LinkedIn", "Email professionnel", "Podcast"]
  },

  "empathyMap": {
    "thinks": [
      "Pensée ou préoccupation intérieure 1",
      "Pensée ou préoccupation intérieure 2",
      "Pensée ou préoccupation intérieure 3"
    ],
    "feels": [
      "Émotion ressentie profondément 1",
      "Émotion ressentie profondément 2"
    ],
    "sees": [
      "Ce qu'elle voit dans son environnement 1",
      "Ce qu'elle voit dans son environnement 2",
      "Ce qu'elle voit dans son environnement 3"
    ],
    "hears": [
      "Ce qu'elle entend de son entourage / des médias 1",
      "Ce qu'elle entend 2",
      "Ce qu'elle entend 3"
    ],
    "says": [
      "Ce qu'elle dit ouvertement 1",
      "Ce qu'elle dit ouvertement 2"
    ],
    "does": [
      "Comportement observable 1",
      "Comportement observable 2",
      "Comportement observable 3"
    ],
    "pains": [
      "Douleur / peur / frustration profonde 1",
      "Douleur profonde 2",
      "Douleur profonde 3"
    ],
    "gains": [
      "Gain / désir / bénéfice recherché 1",
      "Gain recherché 2",
      "Gain recherché 3"
    ]
  },

  "journeyMap": [
    {
      "stageId": "awareness",
      "touchpoints": ["Touchpoint 1 de la prise de conscience", "Touchpoint 2"],
      "customerActions": ["Action client 1 à cette étape", "Action client 2"],
      "emotions": 3,
      "painPoints": ["Point de friction 1", "Point de friction 2"],
      "opportunities": ["Opportunité 1 à saisir", "Opportunité 2"],
      "channels": ["Canal 1", "Canal 2"]
    },
    {
      "stageId": "consideration",
      "touchpoints": ["Touchpoint considération 1"],
      "customerActions": ["Compare les solutions", "Consulte des avis"],
      "emotions": 3,
      "painPoints": ["Trop d'informations à traiter"],
      "opportunities": ["Comparatif clair", "Témoignages clients"],
      "channels": ["Site web", "YouTube"]
    },
    {
      "stageId": "decision",
      "touchpoints": ["Page pricing", "Démo produit"],
      "customerActions": ["Demande une démo", "Consulte l'équipe"],
      "emotions": 4,
      "painPoints": ["Peur de faire le mauvais choix"],
      "opportunities": ["Essai gratuit", "Garantie satisfait"],
      "channels": ["Email", "Téléphone"]
    },
    {
      "stageId": "purchase",
      "touchpoints": ["Processus d'achat en ligne", "Email de confirmation"],
      "customerActions": ["Finalise l'achat", "Crée son compte"],
      "emotions": 4,
      "painPoints": ["Processus trop long"],
      "opportunities": ["Onboarding fluide", "Support immédiat"],
      "channels": ["Site web", "Email"]
    },
    {
      "stageId": "retention",
      "touchpoints": ["Newsletter", "Support client", "Webinaires"],
      "customerActions": ["Utilise le produit régulièrement", "Contacte le support"],
      "emotions": 4,
      "painPoints": ["Manque d'accompagnement"],
      "opportunities": ["Programme de fidélité", "Formations"],
      "channels": ["Email", "Application", "Chat"]
    },
    {
      "stageId": "advocacy",
      "touchpoints": ["Programme de parrainage", "Réseaux sociaux"],
      "customerActions": ["Recommande à ses contacts", "Laisse un avis"],
      "emotions": 5,
      "painPoints": ["Pas d'incentive à recommander"],
      "opportunities": ["Ambassadeur de marque", "Témoignage vidéo"],
      "channels": ["LinkedIn", "Bouche-à-oreille"]
    }
  ]
}

RÈGLES :
- Le persona doit être une vraie personne fictive cohérente, pas un archétype générique
- "techSavviness" : entier de 1 à 5
- "emotions" dans le journeyMap : entier de 1 (très frustré) à 5 (enchanté)
- Tous les tableaux doivent avoir 2 à 4 éléments pertinents et spécifiques au contexte
- Adapte TOUT précisément au secteur, au produit et à la cible décrits
- Le "quote" doit sonner authentique et refléter la vraie douleur principale
- Les journeyMap stageIds doivent être exactement : awareness, consideration, decision, purchase, retention, advocacy`

    const response = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 4000,
      system:     systemPrompt,
      messages:   [{ role: 'user', content: userPrompt }],
    })

    const rawText = response.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('')

    const parsed = parseJSON(rawText)

    if (!parsed) {
      console.error('generer-buyer-persona: parse fail. Raw:', rawText.slice(0, 500))
      return Response.json({ error: 'Réponse IA invalide — impossible de parser le JSON' }, { status: 500 })
    }

    if (!parsed.persona && !parsed.empathyMap && !parsed.journeyMap) {
      console.error('generer-buyer-persona: structure vide. Parsed:', JSON.stringify(parsed).slice(0, 300))
      return Response.json({ error: 'Structure incomplète dans la réponse IA' }, { status: 500 })
    }

    const result = {
      persona:    normalizePersona(parsed.persona),
      empathyMap: normalizeEmpathy(parsed.empathyMap),
      journeyMap: normalizeJourneyMap(parsed.journeyMap),
    }

    return Response.json({ success: true, result })

  } catch (err) {
    console.error('generer-buyer-persona error:', err)
    return Response.json({ error: err.message || 'Erreur serveur interne' }, { status: 500 })
  }
}