import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const STAGES = ['acquisition', 'activation', 'retention', 'revenue', 'referral']

const VALID_HEALTH   = ['critical', 'weak', 'average', 'good', 'excellent']
const VALID_TREND    = ['up', 'down', 'stable']
const VALID_EFFORT   = ['low', 'medium', 'high']
const BUSINESS_MODELS = ['SaaS', 'E-commerce', 'Marketplace', 'Mobile App', 'Media', 'Services', 'D2C', 'B2B', 'Fintech', 'Other']

export async function POST(request) {
  try {
    const body = await request.json()
    const { description, projectName } = body

    if (!description || description.trim().length < 10) {
      return Response.json({ error: 'Description trop courte' }, { status: 400 })
    }

    const prompt = `Tu es un expert en Growth Marketing, spécialisé dans le framework AARRR (Pirate Metrics) et l'économie unitaire SaaS/Digital.

## CONTEXTE PROJET
${projectName ? `Projet : ${projectName}` : ''}

## DESCRIPTION DU BUSINESS
${description}

---

Analyse ce business et génère un tableau de bord Growth AARRR + CLV/CAC complet et réaliste.
Réponds UNIQUEMENT en JSON valide avec cette structure exacte :

{
  "companyName": "Nom de la société déduit (ou nom générique si absent)",
  "sector": "Secteur d'activité précis",
  "businessModel": "SaaS|E-commerce|Marketplace|Mobile App|Media|Services|D2C|B2B|Fintech|Other",
  "summary": "Résumé stratégique de 2-3 phrases sur l'état actuel et le potentiel de croissance. Précis et actionnable.",

  "northStarMetric": {
    "metric": "Métrique étoile polaire recommandée",
    "current": "Valeur actuelle estimée",
    "target": "Cible recommandée à 90 jours",
    "why": "Pourquoi cette métrique est centrale pour ce business"
  },

  "aarrr": {
    "acquisition": {
      "score": 6,
      "health": "average",
      "mainChannels": ["Canal 1", "Canal 2", "Canal 3"],
      "budget": "Estimation budget mensuel acquisition",
      "metrics": [
        { "name": "Nom métrique", "value": "Valeur estimée", "trend": "up|down|stable", "benchmark": "Benchmark sectoriel" }
      ],
      "strengths": ["Point fort 1", "Point fort 2"],
      "weaknesses": ["Point faible 1"],
      "actions": ["Action concrète 1", "Action concrète 2"]
    },
    "activation": {
      "score": 5,
      "health": "average",
      "ahamoment": "Description du moment Aha! pour ce produit",
      "onboardingSteps": ["Étape onboarding 1", "Étape 2"],
      "metrics": [
        { "name": "Taux d'activation", "value": "Estimation", "trend": "stable", "benchmark": "Benchmark" }
      ],
      "strengths": [],
      "weaknesses": [],
      "actions": []
    },
    "retention": {
      "score": 4,
      "health": "weak",
      "retentionLoops": ["Mécanisme de rétention 1", "Mécanisme 2"],
      "metrics": [
        { "name": "Churn mensuel", "value": "Estimation", "trend": "stable", "benchmark": "Benchmark" }
      ],
      "strengths": [],
      "weaknesses": [],
      "actions": []
    },
    "revenue": {
      "score": 6,
      "health": "average",
      "pricingModel": "Modèle de pricing déduit",
      "metrics": [
        { "name": "MRR", "value": "Estimation", "trend": "up", "benchmark": "Benchmark" },
        { "name": "ARPU", "value": "Estimation", "trend": "stable", "benchmark": "Benchmark" }
      ],
      "strengths": [],
      "weaknesses": [],
      "actions": []
    },
    "referral": {
      "score": 3,
      "health": "weak",
      "referralProgram": "Description programme parrainage existant ou recommandé",
      "metrics": [
        { "name": "Taux de référral", "value": "Estimation", "trend": "stable", "benchmark": "Benchmark" }
      ],
      "strengths": [],
      "weaknesses": [],
      "actions": []
    }
  },

  "clv_cac": {
    "cac": {
      "value": 0,
      "currency": "€",
      "breakdown": {
        "marketing": 0,
        "sales": 0,
        "onboarding": 0
      },
      "trend": "stable",
      "comment": "Commentaire sur le CAC et ses drivers"
    },
    "clv": {
      "value": 0,
      "currency": "€",
      "arpu_monthly": 0,
      "avg_lifespan_months": 12,
      "gross_margin_pct": 70,
      "formula_note": "Explication de la formule appliquée",
      "trend": "stable",
      "comment": "Commentaire sur la CLV et les leviers d'amélioration"
    },
    "ratio": {
      "value": 0,
      "health": "average",
      "label": "Sain (≥3:1) | Fragile (2-3:1) | Critique (<2:1) | Excellent (≥5:1)",
      "interpretation": "Interprétation stratégique du ratio pour ce business"
    },
    "payback_period_months": 0,
    "recommendations": [
      "Recommandation CLV/CAC #1",
      "Recommandation #2",
      "Recommandation #3"
    ]
  },

  "growthLevers": [
    {
      "stage": "acquisition|activation|retention|revenue|referral",
      "lever": "Description du levier de croissance",
      "effort": "low|medium|high",
      "impact": "low|medium|high",
      "timeframe": "Délai estimé (ex: 2-4 semaines)"
    }
  ],

  "quickWins": [
    "Quick win #1 — réalisable en moins de 2 semaines",
    "Quick win #2",
    "Quick win #3"
  ],

  "initialInsights": [
    "Insight clé #1 sur la santé growth de ce business",
    "Insight #2",
    "Insight #3"
  ]
}

RÈGLES IMPÉRATIVES :
1. score : entier entre 1 et 10, réaliste par rapport à la description
2. health : UNIQUEMENT "critical", "weak", "average", "good" ou "excellent"
3. trend : UNIQUEMENT "up", "down" ou "stable"
4. effort/impact : UNIQUEMENT "low", "medium" ou "high"
5. clv_cac.ratio.value : CLV / CAC arrondi à 1 décimale
6. clv_cac.clv.value = arpu_monthly × avg_lifespan_months × gross_margin_pct / 100 (arrondi)
7. payback_period_months = CAC / (ARPU mensuel × marge brute) arrondi entier
8. Chaque étape AARRR doit avoir 2-4 métriques pertinentes au secteur
9. Les scores doivent refléter la réalité décrite — si la description mentionne un fort churn, la rétention doit avoir un score faible (2-4)
10. Pour un SaaS, le churn mensuel sain est <2%, fragile 2-5%, critique >5%
11. growthLevers : 5-8 leviers priorisés par impact décroissant
12. Si des chiffres sont mentionnés dans la description, les utiliser directement
13. Toutes les valeurs monétaires en cohérence avec le secteur et la taille décrite`

    const response = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 3500,
      messages: [{ role: 'user', content: prompt }],
    })

    const rawText = response.content.filter(b => b.type === 'text').map(b => b.text).join('')

    let data
    try {
      const match = rawText.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('Pas de JSON')
      data = JSON.parse(match[0])
    } catch {
      return Response.json({ error: 'Impossible de parser la réponse IA — réessayez' }, { status: 500 })
    }

    // ── Sanitize ──────────────────────────────────────────────────────────────

    // business model
    if (!BUSINESS_MODELS.includes(data.businessModel)) data.businessModel = 'SaaS'

    // AARRR
    for (const stageKey of STAGES) {
      const s = data.aarrr?.[stageKey]
      if (!s) { data.aarrr[stageKey] = { score: 5, health: 'average', metrics: [], strengths: [], weaknesses: [], actions: [] }; continue }
      s.score  = Math.min(10, Math.max(1, Math.round(Number(s.score) || 5)))
      s.health = VALID_HEALTH.includes(s.health) ? s.health : 'average'
      s.metrics = (s.metrics || []).slice(0, 6).map(m => ({
        name:      String(m.name  || '').slice(0, 60),
        value:     String(m.value || '').slice(0, 40),
        trend:     VALID_TREND.includes(m.trend) ? m.trend : 'stable',
        benchmark: String(m.benchmark || '').slice(0, 60),
      }))
      s.strengths  = (s.strengths  || []).slice(0, 4).map(x => String(x).slice(0, 200))
      s.weaknesses = (s.weaknesses || []).slice(0, 4).map(x => String(x).slice(0, 200))
      s.actions    = (s.actions    || []).slice(0, 4).map(x => String(x).slice(0, 200))
    }

    // CLV/CAC
    const cac = data.clv_cac?.cac || {}
    const clv = data.clv_cac?.clv || {}
    const cacVal = Math.max(0, Math.round(Number(cac.value) || 0))
    const arpu   = Math.max(0, Math.round(Number(clv.arpu_monthly) || 0))
    const life   = Math.max(1, Math.round(Number(clv.avg_lifespan_months) || 12))
    const margin = Math.min(100, Math.max(0, Number(clv.gross_margin_pct) || 70))
    const clvCalc = Math.round(arpu * life * margin / 100)
    const ratioVal = cacVal > 0 ? parseFloat((clvCalc / cacVal).toFixed(1)) : 0
    const payback  = arpu > 0 ? Math.ceil(cacVal / (arpu * margin / 100)) : 0

    const ratioHealth = ratioVal >= 5 ? { health: 'excellent', label: 'Excellent (≥5:1)' }
      : ratioVal >= 3 ? { health: 'good',    label: 'Sain (≥3:1)' }
      : ratioVal >= 2 ? { health: 'average', label: 'Fragile (2-3:1)' }
      : ratioVal >= 1 ? { health: 'weak',    label: 'Critique (1-2:1)' }
      : { health: 'critical', label: 'Critique (<1:1)' }

    data.clv_cac = {
      cac: {
        value:     cacVal,
        currency:  cac.currency || '€',
        breakdown: {
          marketing:  Math.max(0, Math.round(Number(cac.breakdown?.marketing) || 0)),
          sales:      Math.max(0, Math.round(Number(cac.breakdown?.sales)     || 0)),
          onboarding: Math.max(0, Math.round(Number(cac.breakdown?.onboarding)|| 0)),
        },
        trend:   VALID_TREND.includes(cac.trend) ? cac.trend : 'stable',
        comment: String(cac.comment || '').slice(0, 400),
      },
      clv: {
        value:               clvCalc,
        currency:            clv.currency || '€',
        arpu_monthly:        arpu,
        avg_lifespan_months: life,
        gross_margin_pct:    margin,
        formula_note:        String(clv.formula_note || `CLV = ${arpu}€ × ${life}m × ${margin}% = ${clvCalc}€`).slice(0, 300),
        trend:               VALID_TREND.includes(clv.trend) ? clv.trend : 'stable',
        comment:             String(clv.comment || '').slice(0, 400),
      },
      ratio: {
        value:          ratioVal,
        health:         ratioHealth.health,
        label:          ratioHealth.label,
        interpretation: String(data.clv_cac?.ratio?.interpretation || '').slice(0, 400),
      },
      payback_period_months: payback,
      recommendations: (data.clv_cac?.recommendations || []).slice(0, 5).map(r => String(r).slice(0, 300)),
    }

    // Growth levers
    data.growthLevers = (data.growthLevers || []).slice(0, 8).map(l => ({
      stage:     STAGES.includes(l.stage) ? l.stage : 'acquisition',
      lever:     String(l.lever     || '').slice(0, 200),
      effort:    VALID_EFFORT.includes(l.effort) ? l.effort : 'medium',
      impact:    VALID_EFFORT.includes(l.impact) ? l.impact : 'medium',
      timeframe: String(l.timeframe || '').slice(0, 60),
    }))

    data.quickWins       = (data.quickWins       || []).slice(0, 5).map(w => String(w).slice(0, 300))
    data.initialInsights = (data.initialInsights || []).slice(0, 5).map(i => String(i).slice(0, 300))
    data.summary         = String(data.summary  || '').slice(0, 600)
    data.companyName     = String(data.companyName || '').slice(0, 100)
    data.sector          = String(data.sector   || '').slice(0, 100)

    // North star
    if (data.northStarMetric) {
      data.northStarMetric = {
        metric:  String(data.northStarMetric.metric  || '').slice(0, 100),
        current: String(data.northStarMetric.current || '').slice(0, 60),
        target:  String(data.northStarMetric.target  || '').slice(0, 60),
        why:     String(data.northStarMetric.why     || '').slice(0, 400),
      }
    }

    return Response.json({ success: true, data })

  } catch (err) {
    console.error('Growth generate error:', err)
    return Response.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}