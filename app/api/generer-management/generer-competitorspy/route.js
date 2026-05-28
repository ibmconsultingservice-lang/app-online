import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

// ── Constants ─────────────────────────────────────────────────────────────────
const CATEGORY_META = {
  pricing: {
    label: 'Stratégie tarifaire',
    key: 'pricing',
    description: 'Analyse des prix, offres et positionnement tarifaire.',
  },
  product: {
    label: 'Produit & Fonctionnalités',
    key: 'product',
    description: "Évolutions produit, nouvelles features, roadmap observable.",
  },
  marketing: {
    label: 'Marketing & Communication',
    key: 'marketing',
    description: 'Campagnes, messages clés, canaux, contenu publié.',
  },
  social: {
    label: 'Réseaux sociaux',
    key: 'social',
    description: 'Activité, engagement, tonalité, tendances détectées.',
  },
  hiring: {
    label: 'Recrutement & Signaux RH',
    key: 'hiring',
    description: "Offres d'emploi, signaux de croissance ou restructuration.",
  },
  reputation: {
    label: 'Réputation & Avis',
    key: 'reputation',
    description: 'Sentiment clients, avis publics, NPS estimé, controverses.',
  },
}

// ── Score helpers ─────────────────────────────────────────────────────────────
const getThreatLevel = (score) => {
  if (score >= 4.5) return { label: 'Critique',  color: 'red'    }
  if (score >= 3.5) return { label: 'Élevée',    color: 'orange' }
  if (score >= 2.5) return { label: 'Modérée',   color: 'yellow' }
  if (score >= 1.5) return { label: 'Faible',    color: 'teal'   }
  return                    { label: 'Minimale', color: 'green'  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const {
      reportName,
      projectName,
      projectTag,
      myCompany,
      competitors,   // [{ name, url, notes }]
      watchCategories, // string[] of CATEGORY_META keys
      period,        // "weekly" | "monthly" | "quarterly"
      context,
    } = body

    if (!competitors || competitors.length === 0) {
      return Response.json({ error: 'Aucun concurrent renseigné' }, { status: 400 })
    }

    // ── Build enriched data ──
    const enrichedCompetitors = competitors.map((c) => ({
      ...c,
      categories: watchCategories || Object.keys(CATEGORY_META),
    }))

    const contextLines = [
      projectName  && `Entreprise / Projet : ${projectName}`,
      projectTag   && `Secteur : ${projectTag}`,
      myCompany    && `Notre société : ${myCompany}`,
      context      && `Contexte de la veille : ${context}`,
      period       && `Période couverte : ${period === 'weekly' ? 'Hebdomadaire' : period === 'monthly' ? 'Mensuelle' : 'Trimestrielle'}`,
    ].filter(Boolean).join('\n')

    const categoriesDetails = (watchCategories || Object.keys(CATEGORY_META))
      .map((k) => {
        const m = CATEGORY_META[k]
        return `- ${m.label} : ${m.description}`
      })
      .join('\n')

    const competitorsList = enrichedCompetitors
      .map((c, i) => `${i + 1}. ${c.name}${c.url ? ` (${c.url})` : ''}${c.notes ? ` — Notes : ${c.notes}` : ''}`)
      .join('\n')

    // ── Prompt ───────────────────────────────────────────────────────────────
    const prompt = `Tu es un analyste stratégique senior spécialisé en veille concurrentielle et intelligence économique.

${contextLines ? `## CONTEXTE\n${contextLines}\n` : ''}

## RAPPORT : ${reportName}

### Concurrents à analyser :
${competitorsList}

### Axes de surveillance demandés :
${categoriesDetails}

---

Génère un rapport de veille concurrentielle complet, actionnable et stratégiquement pertinent.
Réponds UNIQUEMENT en JSON valide avec cette structure exacte :

{
  "executive_summary": "Résumé exécutif en 3-5 phrases : les mouvements les plus significatifs de la période, ce que cela implique pour notre position, et l'urgence stratégique globale.",

  "threat_score": 3.2,

  "competitors": [
    {
      "name": "Nom du concurrent",
      "threat_score": 3.5,
      "status": "En accélération | Stable | En recul | Pivot stratégique",
      "headline": "Mouvement majeur observé en une phrase percutante",
      "categories": {
        "pricing": {
          "signal": "Signal observé ou 'Pas de changement notable'",
          "impact": "faible | modéré | fort | critique",
          "trend": "hausse | baisse | stable | incertain"
        },
        "product": { "signal": "...", "impact": "...", "trend": "..." },
        "marketing": { "signal": "...", "impact": "...", "trend": "..." },
        "social": { "signal": "...", "impact": "...", "trend": "..." },
        "hiring": { "signal": "...", "impact": "...", "trend": "..." },
        "reputation": { "signal": "...", "impact": "...", "trend": "..." }
      },
      "strengths": ["Force #1 identifiée", "Force #2"],
      "weaknesses": ["Faiblesse #1 exploitable", "Faiblesse #2"],
      "next_move": "Prochain mouvement probable dans 30-90 jours"
    }
  ],

  "market_signals": [
    {
      "type": "opportunite | menace | tendance | rupture",
      "title": "Titre court du signal",
      "description": "Description en 1-2 phrases du signal détecté et de son importance",
      "urgency": "immédiate | 30j | 90j | long-terme"
    }
  ],

  "competitive_matrix": {
    "leader": "Nom du concurrent le plus menaçant",
    "challenger": "Concurrent en montée rapide",
    "vulnerable": "Concurrent le plus vulnérable",
    "wild_card": "Concurrent imprévisible à surveiller"
  },

  "action_plan": [
    {
      "priority": 1,
      "action": "Action concrète et mesurable",
      "rationale": "Pourquoi maintenant, basé sur les signaux",
      "timeline": "Cette semaine | Ce mois | Ce trimestre",
      "owner": "Marketing | Produit | Commercial | Direction | Tech"
    }
  ],

  "watch_next": "Ce qu'il faut absolument surveiller sur la prochaine période — en 2-3 phrases concrètes."
}

RÈGLES IMPÉRATIVES :
- Les signaux doivent être spécifiques, plausibles et basés sur des indicateurs observables (pas de généralités)
- threat_score entre 1.0 et 5.0 (1 = aucune menace, 5 = menace existentielle)
- Identifie des VRAIES faiblesses exploitables, pas des banalités
- next_move doit être une prédiction audacieuse mais justifiée
- L'action_plan doit être classé par priorité réelle et immédiatement applicable
- Adapte ton analyse au secteur/marché fourni dans le contexte
- Si plusieurs concurrents, identifie les dynamiques entre eux (alliances, conflits de positionnement)`

    // ── Call Claude ───────────────────────────────────────────────────────────
    const response = await client.messages.create({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
    })

    // ── Parse ─────────────────────────────────────────────────────────────────
    const rawText = response.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')

    let result
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('Pas de JSON dans la réponse')
      result = JSON.parse(jsonMatch[0])
    } catch {
      result = {
        executive_summary: rawText.slice(0, 600),
        threat_score: 3.0,
        competitors: competitors.map((c) => ({
          name: c.name,
          threat_score: 3.0,
          status: 'Stable',
          headline: 'Analyse en cours de traitement.',
          categories: {},
          strengths: [],
          weaknesses: [],
          next_move: 'Données insuffisantes pour une prédiction fiable.',
        })),
        market_signals: [],
        competitive_matrix: {},
        action_plan: [],
        watch_next: 'Relancez une analyse avec plus de contexte.',
      }
    }

    const threat = getThreatLevel(result.threat_score || 3)

    return Response.json({ success: true, result, threatLevel: threat })

  } catch (err) {
    console.error('CompetitorSpy API error:', err)
    return Response.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}
