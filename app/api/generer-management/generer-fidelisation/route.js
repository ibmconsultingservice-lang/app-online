import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const STAGES = {
  acquisition: { label: 'Acquisition', icon: '🎯', desc: 'Attirer des visiteurs/prospects' },
  activation:  { label: 'Activation',  icon: '⚡', desc: 'Premier pas réussi — Aha! moment' },
  retention:   { label: 'Rétention',   icon: '🔄', desc: 'Faire revenir les utilisateurs' },
  revenue:     { label: 'Revenue',     icon: '💰', desc: 'Monétiser les utilisateurs actifs' },
  referral:    { label: 'Referral',    icon: '📣', desc: 'Transformer les clients en ambassadeurs' },
}

const HEALTH_LABELS = { critical: 'Critique', weak: 'Fragile', average: 'Moyen', good: 'Bon', excellent: 'Excellent' }
const TREND_LABELS  = { up: '↗ Hausse', down: '↘ Baisse', stable: '→ Stable' }

export async function POST(request) {
  try {
    const body = await request.json()
    const {
      aarrr,
      clv_cac,
      companyName,
      sector,
      businessModel,
      northStarMetric,
      projectName,
    } = body

    if (!aarrr) {
      return Response.json({ error: 'Données AARRR manquantes' }, { status: 400 })
    }

    // ── Build enriched context for the prompt ──────────────────────────────
    const contextLines = [
      projectName  && `Session : ${projectName}`,
      companyName  && `Société : ${companyName}`,
      sector       && `Secteur : ${sector}`,
      businessModel && `Modèle : ${businessModel}`,
    ].filter(Boolean).join('\n')

    const aarrBlock = Object.entries(STAGES).map(([key, meta]) => {
      const s = aarrr[key] || {}
      const metrics = (s.metrics || []).map(m =>
        `  · ${m.name} : ${m.value} (${TREND_LABELS[m.trend] || '→'})${m.benchmark ? ` — Benchmark : ${m.benchmark}` : ''}`
      ).join('\n')
      return `
### ${meta.icon} ${meta.label} — Score : ${s.score || 5}/10 — Santé : ${HEALTH_LABELS[s.health] || 'Moyen'}
${meta.desc}
${metrics ? `Métriques :\n${metrics}` : 'Aucune métrique renseignée.'}
${s.strengths?.length   ? `Points forts : ${s.strengths.join(' · ')}`   : ''}
${s.weaknesses?.length  ? `Points faibles : ${s.weaknesses.join(' · ')}` : ''}
${s.actions?.length     ? `Actions planifiées : ${s.actions.join(' · ')}` : ''}
${key === 'acquisition' && s.mainChannels?.length  ? `Canaux : ${s.mainChannels.join(', ')}` : ''}
${key === 'acquisition' && s.budget                ? `Budget : ${s.budget}` : ''}
${key === 'activation'  && s.ahamoment             ? `Aha! moment : ${s.ahamoment}` : ''}
${key === 'retention'   && s.retentionLoops?.length ? `Boucles de rétention : ${s.retentionLoops.join(', ')}` : ''}
${key === 'revenue'     && s.pricingModel           ? `Pricing : ${s.pricingModel}` : ''}
${key === 'referral'    && s.referralProgram        ? `Programme : ${s.referralProgram}` : ''}`
    }).join('\n')

    const cac = clv_cac?.cac || {}
    const clv = clv_cac?.clv || {}
    const ratio = clv_cac?.ratio || {}
    const clvCalc = clv.arpu_monthly > 0 ? Math.round(clv.arpu_monthly * (clv.avg_lifespan_months || 12) * (clv.gross_margin_pct || 70) / 100) : clv.value || 0
    const ratioVal = cac.value > 0 ? parseFloat((clvCalc / cac.value).toFixed(1)) : ratio.value || 0

    const clvCacBlock = `
### 💰 Économie unitaire — CLV/CAC
- CAC total : ${cac.value || 0}${cac.currency || '€'} (Marketing ${cac.breakdown?.marketing || 0}€ · Sales ${cac.breakdown?.sales || 0}€ · Onboarding ${cac.breakdown?.onboarding || 0}€)
- Tendance CAC : ${TREND_LABELS[cac.trend] || '→ Stable'} — ${cac.comment || ''}
- CLV calculée : ${clvCalc}${clv.currency || '€'} = ${clv.arpu_monthly || 0}€/m × ${clv.avg_lifespan_months || 12}m × ${clv.gross_margin_pct || 70}% marge
- ARPU mensuel : ${clv.arpu_monthly || 0}€
- Durée de vie moyenne : ${clv.avg_lifespan_months || 12} mois
- Marge brute : ${clv.gross_margin_pct || 70}%
- Tendance CLV : ${TREND_LABELS[clv.trend] || '→ Stable'} — ${clv.comment || ''}
- **Ratio CLV/CAC : ${ratioVal}:1** → ${ratio.label || (ratioVal >= 3 ? 'Sain' : ratioVal >= 2 ? 'Fragile' : 'Critique')}
- Payback period : ${clv_cac?.payback_period_months || 0} mois`

    const nsmBlock = northStarMetric?.metric ? `
### ⭐ North Star Metric
- Métrique : ${northStarMetric.metric}
- Actuel : ${northStarMetric.current} → Cible : ${northStarMetric.target}
- Pourquoi : ${northStarMetric.why}` : ''

    // Average score for readiness
    const scores = Object.values(aarrr).map(s => s.score || 5)
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length
    const growthScore = Math.round(
      avgScore * 5 +
      (ratioVal >= 5 ? 25 : ratioVal >= 3 ? 18 : ratioVal >= 2 ? 10 : 3) +
      (northStarMetric?.metric ? 5 : 0)
    )

    // ── Prompt ────────────────────────────────────────────────────────────────
    const prompt = `Tu es un expert Growth Marketing senior — coach des meilleures startups de la French Tech, spécialisé dans les frameworks AARRR, l'économie unitaire SaaS, et l'optimisation du ratio CLV/CAC.

${contextLines ? `## CONTEXTE\n${contextLines}\n` : ''}

## DONNÉES AARRR ACTUELLES
${aarrBlock}

${clvCacBlock}

${nsmBlock}

### Données de synthèse :
- Score AARRR moyen : ${avgScore.toFixed(1)}/10
- Score Growth estimé : ${growthScore}/100
- Ratio CLV/CAC : ${ratioVal}:1 — ${ratioVal >= 3 ? '✅ Sain' : ratioVal >= 2 ? '⚠ Fragile' : '🚨 Critique'}
- Étapes les plus faibles : ${Object.entries(aarrr).filter(([,v]) => (v.score||5) < 5).map(([k]) => STAGES[k]?.label || k).join(', ') || 'Aucune critique identifiée'}
- Étapes les plus fortes : ${Object.entries(aarrr).filter(([,v]) => (v.score||5) >= 7).map(([k]) => STAGES[k]?.label || k).join(', ') || 'Aucune excellente identifiée'}

---

Génère une analyse Growth complète, stratégique et immédiatement actionnable.
Réponds UNIQUEMENT en JSON valide avec cette structure exacte :

{
  "growth_score": ${Math.min(100, Math.max(1, growthScore))},
  "growth_label": "Débutant | En construction | Moteur allumé | Fusée en orbite | Hypercroissance",

  "executive_summary": "Paragraphe de 4-5 phrases : état réel du moteur de croissance, le ratio CLV/CAC et ce qu'il implique concrètement, le bottleneck qui coûte le plus cher, et la priorité absolue. Sois direct, chiffré, sans langue de bois.",

  "funnel_analysis": {
    "funnel_efficiency": "Diagnostic global du funnel : où la valeur se crée et où elle se perd, avec % estimés si possible.",
    "bottleneck": {
      "stage": "nom_du_stage_clé",
      "reason": "Pourquoi ce stage est le principal frein à la croissance — conséquences chiffrées si possible",
      "estimated_revenue_impact": "Impact revenue estimé si résolu (ex: +30% MRR)"
    },
    "stages": {
      "acquisition":  { "assessment": "Diagnostic 2-3 phrases spécifique au contexte", "priority": "high|medium|low", "quick_win": "Action rapide (<2 semaines) pour améliorer ce stage" },
      "activation":   { "assessment": "...", "priority": "...", "quick_win": "..." },
      "retention":    { "assessment": "...", "priority": "...", "quick_win": "..." },
      "revenue":      { "assessment": "...", "priority": "...", "quick_win": "..." },
      "referral":     { "assessment": "...", "priority": "...", "quick_win": "..." }
    }
  },

  "clv_cac_analysis": {
    "ratio_assessment": "Analyse approfondie 3-4 phrases du ratio actuel — que signifie-t-il pour la viabilité économique ? Quand sera-t-il rentable ? Quel ratio est l'objectif réaliste à 6 mois ?",
    "unit_economics_health": "Excellent|Bon|Acceptable|Fragile|Critique",
    "cac_breakdown_analysis": "Analyse du breakdown CAC — quels postes sont surdimensionnés et pourquoi",
    "clv_sensitivity": "Si le churn baisse de X%, la CLV augmente de Y% — type de calcul de sensibilité",
    "improvement_scenarios": [
      {
        "lever": "Levier d'amélioration (ex: réduire le churn de 2% à 1.5%)",
        "clv_impact": "Nouvelle CLV estimée",
        "ratio_new": "Nouveau ratio CLV/CAC estimé",
        "difficulty": "Facile|Moyen|Difficile",
        "timeframe": "Délai estimé"
      }
    ],
    "cac_reduction_tips": [
      "Conseil précis pour réduire le CAC #1",
      "Conseil #2",
      "Conseil #3"
    ],
    "clv_increase_tips": [
      "Conseil précis pour augmenter la CLV #1",
      "Conseil #2",
      "Conseil #3"
    ]
  },

  "north_star_recommendation": {
    "metric": "North Star Metric recommandée ou confirmée",
    "current": "Valeur actuelle",
    "90day_target": "Cible réaliste à 90 jours",
    "why": "Pourquoi cette métrique capture la valeur créée ET prédit la croissance future"
  },

  "growth_opportunities": [
    {
      "stage": "nom_du_stage",
      "title": "Titre court de l'opportunité",
      "description": "Description 2 phrases — pourquoi, comment, impact attendu",
      "potential_impact": "Impact estimé (ex: +15% rétention, +25% MRR)",
      "effort": "low|medium|high",
      "timeframe": "Délai (ex: 2-3 semaines)"
    }
  ],

  "experiment_backlog": [
    {
      "stage": "nom_du_stage",
      "hypothesis": "Si nous faisons X, alors Y se produira, parce que Z",
      "test_type": "A/B test|Campagne pilote|Feature flag|Survey|Interview",
      "metric_to_move": "Métrique cible de l'expérience",
      "duration_days": 14,
      "effort": "low|medium|high"
    }
  ],

  "retention_deep_dive": {
    "churn_analysis": "Analyse approfondie des causes probables de churn dans ce contexte",
    "churn_drivers": ["Cause de churn #1", "Cause #2", "Cause #3"],
    "retention_loops": ["Boucle de rétention à construire #1", "Boucle #2"],
    "reactivation_strategy": "Stratégie de réactivation des utilisateurs dormants",
    "ideal_retention_curve": "Description de la courbe de rétention idéale pour ce business"
  },

  "90day_roadmap": [
    {
      "month": 1,
      "focus": "Thème principal du mois",
      "actions": ["Action concrète #1", "Action #2", "Action #3", "Action #4"],
      "kpi_target": "KPI principal à atteindre ce mois"
    },
    {
      "month": 2,
      "focus": "...",
      "actions": [],
      "kpi_target": "..."
    },
    {
      "month": 3,
      "focus": "...",
      "actions": [],
      "kpi_target": "..."
    }
  ],

  "risks": [
    {
      "risk": "Risque Growth identifié",
      "severity": "Critique|Élevé|Modéré|Faible",
      "probability": "Élevée|Modérée|Faible",
      "mitigation": "Mesure de mitigation concrète"
    }
  ],

  "conclusion": "2-3 phrases percutantes : verdict final sur la viabilité du moteur de croissance actuel, la priorité absolue des 30 prochains jours, et la vision à 6 mois si les bons leviers sont actionnés."
}

RÈGLES IMPÉRATIVES :
1. growth_score entre 1 et 100 — calculé objectivement sur les données
2. growth_label UNIQUEMENT parmi : "Débutant", "En construction", "Moteur allumé", "Fusée en orbite", "Hypercroissance"
3. priority dans stages : UNIQUEMENT "high", "medium" ou "low"
4. effort dans experiment_backlog et growth_opportunities : UNIQUEMENT "low", "medium" ou "high"
5. duration_days : entier entre 7 et 90
6. Le bottleneck doit être l'étape avec le score le plus faible ET/OU le plus grand impact sur le revenue
7. Si le ratio CLV/CAC < 2, c'est une urgence absolue — le mettre en évidence dans CHAQUE section pertinente
8. Les expériences doivent avoir une hypothèse réelle (format "Si... alors... parce que...")
9. La roadmap 90j doit être cohérente : mois 1 = urgences/quick wins, mois 2 = optimisation, mois 3 = scale
10. Les recommandations CLV/CAC doivent être spécifiques au secteur et au business model fourni
11. Identifier les synergies entre stages (ex: une bonne rétention permet de réduire le CAC via le referral)
12. Si des métriques spécifiques sont renseignées, les utiliser dans l'analyse — ne pas généraliser`

    // ── Call Claude ──────────────────────────────────────────────────────────
    const response = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    })

    const rawText = response.content.filter(b => b.type === 'text').map(b => b.text).join('')

    let result
    try {
      const match = rawText.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('Pas de JSON')
      result = JSON.parse(match[0])
    } catch {
      // Fallback
      result = {
        growth_score: Math.min(100, Math.max(1, growthScore)),
        growth_label: growthScore >= 80 ? 'Fusée en orbite' : growthScore >= 60 ? 'Moteur allumé' : growthScore >= 40 ? 'En construction' : 'Débutant',
        executive_summary: rawText.slice(0, 600),
        funnel_analysis: {
          funnel_efficiency: 'Analyse du funnel nécessite une revue des données.',
          bottleneck: { stage: 'retention', reason: 'La rétention est généralement le bottleneck principal.', estimated_revenue_impact: 'À calculer' },
          stages: Object.fromEntries(Object.keys(STAGES).map(k => [k, { assessment: `${STAGES[k].label} : analyse en cours.`, priority: 'medium', quick_win: 'Définir une action rapide.' }])),
        },
        clv_cac_analysis: {
          ratio_assessment: `Ratio actuel de ${ratioVal}:1 — ${ratioVal >= 3 ? 'sain' : 'nécessite attention'}.`,
          unit_economics_health: ratioVal >= 3 ? 'Bon' : ratioVal >= 2 ? 'Acceptable' : 'Critique',
          improvement_scenarios: [],
          cac_reduction_tips: ['Optimiser les canaux d\'acquisition', 'Améliorer le taux de conversion', 'Automatiser l\'onboarding'],
          clv_increase_tips: ['Réduire le churn', 'Upsell et cross-sell', 'Améliorer l\'engagement produit'],
        },
        north_star_recommendation: { metric: northStarMetric?.metric || 'MRR ou DAU', current: northStarMetric?.current || '?', '90day_target': northStarMetric?.target || '?', why: 'Cette métrique capture la valeur créée pour les clients.' },
        growth_opportunities: [],
        experiment_backlog: [],
        retention_deep_dive: { churn_analysis: 'Analyse du churn à approfondir.', churn_drivers: [], retention_loops: [], reactivation_strategy: '', ideal_retention_curve: '' },
        '90day_roadmap': [
          { month: 1, focus: 'Stabilisation', actions: ['Audit du funnel', 'Quick wins rétention', 'Optimisation CAC'], kpi_target: 'Réduire le churn de 20%' },
          { month: 2, focus: 'Optimisation', actions: ['Tests A/B activation', 'Programme rétention', 'Upsell'], kpi_target: 'Améliorer ratio CLV/CAC' },
          { month: 3, focus: 'Scale', actions: ['Accélérer acquisition', 'Lancer referral', 'Automatisation'], kpi_target: 'Croissance MRR de 20%' },
        ],
        risks: [],
        conclusion: 'Concentrez-vous sur la rétention et l\'amélioration du ratio CLV/CAC pour construire un moteur de croissance durable.',
      }
    }

    // ── Sanitize critical fields ──────────────────────────────────────────────
    const VALID_LABELS = ['Débutant', 'En construction', 'Moteur allumé', 'Fusée en orbite', 'Hypercroissance']
    if (!VALID_LABELS.includes(result.growth_label)) {
      result.growth_label = result.growth_score >= 80 ? 'Fusée en orbite' : result.growth_score >= 60 ? 'Moteur allumé' : result.growth_score >= 40 ? 'En construction' : 'Débutant'
    }
    result.growth_score = Math.min(100, Math.max(1, Math.round(Number(result.growth_score) || growthScore)))

    // Sanitize stage priorities
    if (result.funnel_analysis?.stages) {
      for (const stKey of Object.keys(STAGES)) {
        const st = result.funnel_analysis.stages[stKey]
        if (st && !['high','medium','low'].includes(st.priority)) st.priority = 'medium'
      }
    }

    // Sanitize experiment efforts
    if (result.experiment_backlog) {
      result.experiment_backlog = result.experiment_backlog.map(e => ({
        ...e,
        effort:       ['low','medium','high'].includes(e.effort) ? e.effort : 'medium',
        duration_days: Math.min(90, Math.max(7, Math.round(Number(e.duration_days) || 14))),
        stage:         Object.keys(STAGES).includes(e.stage) ? e.stage : 'retention',
      }))
    }

    // Sanitize growth opportunities
    if (result.growth_opportunities) {
      result.growth_opportunities = result.growth_opportunities.map(o => ({
        ...o,
        effort: ['low','medium','high'].includes(o.effort) ? o.effort : 'medium',
        stage:  Object.keys(STAGES).includes(o.stage) ? o.stage : 'retention',
      }))
    }

    return Response.json({ success: true, result })

  } catch (err) {
    console.error('Growth analyze error:', err)
    return Response.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}