import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const getOutcome = (v, r, i, o) => {
  if (!v)                return { tier: 0, label: 'Désavantage compétitif',         short: 'Désavantage'  }
  if (v && !r)           return { tier: 1, label: 'Parité compétitive',             short: 'Parité'       }
  if (v && r && !i)      return { tier: 2, label: 'Avantage compétitif temporaire', short: 'Temporaire'   }
  if (v && r && i && !o) return { tier: 3, label: 'Avantage non exploité',          short: 'Non exploité' }
  return                        { tier: 4, label: 'Avantage concurrentiel durable', short: 'Durable'      }
}

const CATEGORY_LABELS = {
  physical: 'Physique', financial: 'Financier', human: 'Humain',
  technology: 'Technologique', reputation: 'Réputation',
  relational: 'Relationnel', knowledge: 'Connaissance', other: 'Autre',
}

const TIER_STRATEGY = {
  4: 'Protéger et capitaliser — cœur de l\'avantage concurrentiel durable.',
  3: 'Développer les capacités organisationnelles pour exploiter pleinement.',
  2: 'Renforcer les barrières à l\'imitation avant que les concurrents rattrapent.',
  1: 'Chercher à différencier, ou accepter la parité comme condition d\'entrée.',
  0: 'Restructurer, externaliser ou éliminer — crée un handicap compétitif.',
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { analysisName, context, resources, projectName, projectTag } = body

    if (!resources?.length) {
      return Response.json({ error: 'Aucune ressource fournie' }, { status: 400 })
    }

    const enriched = resources.map(res => {
      const outcome  = getOutcome(res.valuable, res.rare, res.inimitable, res.organized)
      const answered = [res.valuable, res.rare, res.inimitable, res.organized].filter(x => x !== null).length
      const yesCount = [res.valuable, res.rare, res.inimitable, res.organized].filter(x => x === true).length
      return {
        ...res, outcome, answered, yesCount,
        completeness:  Math.round(answered / 4 * 100),
        categoryLabel: CATEGORY_LABELS[res.category] || res.category,
        defaultStrategy: TIER_STRATEGY[outcome.tier],
      }
    })

    const byTier = [0,1,2,3,4].map(t => ({
      tier: t, label: getOutcome(t>=1,t>=2,t>=3,t>=4).label,
      count: enriched.filter(r => r.outcome.tier === t).length,
      resources: enriched.filter(r => r.outcome.tier === t).map(r => r.name),
    }))

    const totalRes     = resources.length
    const durableCount = byTier.find(t=>t.tier===4)?.count || 0
    const incomplete   = enriched.filter(r => r.answered < 4).length
    const avgScore     = Math.round(enriched.reduce((s,r) => s + (r.yesCount/4)*100, 0) / totalRes)

    const contextLines = [
      projectName && `Entreprise : ${projectName}`,
      projectTag  && `Secteur : ${projectTag}`,
      context     && `Contexte : ${context}`,
    ].filter(Boolean).join('\n')

    const prompt = `Tu es un expert en stratégie d'entreprise, spécialiste du framework VRIO (Barney, 1991).

${contextLines ? `## CONTEXTE\n${contextLines}\n` : ''}

## ANALYSE VRIO : ${analysisName}

### Vue d'ensemble
- Total : ${totalRes} ressource(s)
- Score VRIO moyen : ${avgScore}%
- Avantages durables : ${durableCount}/${totalRes}
- Ressources incomplètes : ${incomplete}

### Répartition par niveau :
${byTier.filter(t=>t.count>0).map(t => `- ${t.label} (T${t.tier}) : ${t.count} — ${t.resources.join(', ')}`).join('\n')}

### Détail :
${enriched.map((res,i) => `
**${i+1}. ${res.name}** [${res.categoryLabel}]
- V:${res.valuable===null?'?':res.valuable?'✓':'✕'} R:${res.rare===null?'?':res.rare?'✓':'✕'} I:${res.inimitable===null?'?':res.inimitable?'✓':'✕'} O:${res.organized===null?'?':res.organized?'✓':'✕'}
- Résultat : ${res.outcome.label} (Tier ${res.outcome.tier})
${res.description ? `- Desc : ${res.description}` : ''}
${res.notes       ? `- Notes : ${res.notes}` : ''}
`).join('')}

---

Génère une analyse VRIO stratégique. Réponds UNIQUEMENT en JSON valide :

{
  "synthese": "4-6 phrases sur la position concurrentielle globale, solidité des avantages, gaps organisationnels, risques d'érosion. Sois direct et analytique.",

  "ressources": [
    {
      "nom": "nom exact",
      "tier": 4,
      "analyse": "2-3 phrases spécifiques sur cette ressource et sa dynamique concurrentielle.",
      "action": "Action concrète immédiate (max 12 mots)"
    }
  ],

  "avantages_cles": [
    "Avantage durable identifié et pourquoi il est défendable"
  ],

  "vulnerabilites": [
    "Vulnérabilité stratégique spécifique à adresser"
  ],

  "priorites": [
    "Recommandation #1 concrète et mesurable",
    "Recommandation #2",
    "Recommandation #3",
    "Recommandation #4",
    "Recommandation #5"
  ],

  "conclusion": "Verdict d'une phrase sur la solidité de l'avantage concurrentiel."
}

RÈGLES :
- Couvrir TOUTES les ressources dans ressources[]
- avantages_cles = Tier 3 et 4 uniquement
- vulnerabilites = Tier 0-1 ET Tier 3 avec O=false
- Ressources incomplètes = risque à signaler dans vulnérabilités
- Priorités ordonnées par impact décroissant
- Identifier les interdépendances entre ressources`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514', max_tokens: 2500,
      messages: [{ role: 'user', content: prompt }],
    })

    const rawText = response.content.filter(b => b.type === 'text').map(b => b.text).join('')

    let result
    try {
      const m = rawText.match(/\{[\s\S]*\}/)
      if (!m) throw new Error('No JSON')
      result = JSON.parse(m[0])
      if (!result.ressources || result.ressources.length !== enriched.length) {
        result.ressources = enriched.map((res,i) => ({
          nom:     res.name,
          tier:    res.outcome.tier,
          analyse: result.ressources?.[i]?.analyse || `${res.outcome.label}. ${res.defaultStrategy}`,
          action:  result.ressources?.[i]?.action  || TIER_STRATEGY[res.outcome.tier].split('—')[0].trim(),
        }))
      }
    } catch {
      const durableRes = enriched.filter(r => r.outcome.tier === 4)
      const weakRes    = enriched.filter(r => r.outcome.tier <= 1)
      result = {
        synthese: `Score VRIO de ${avgScore}% pour ${totalRes} ressource(s). ${durableCount} avantage(s) durable(s) identifié(s). ${incomplete > 0 ? `${incomplete} ressource(s) nécessitent une évaluation complète.` : ''}`,
        ressources: enriched.map(res => ({ nom: res.name, tier: res.outcome.tier, analyse: `${res.outcome.label}. ${res.defaultStrategy}`, action: TIER_STRATEGY[res.outcome.tier].split('—')[0].trim() })),
        avantages_cles: durableRes.map(r => `${r.name} — avantage durable à protéger`),
        vulnerabilites: weakRes.map(r => `${r.name} (${r.outcome.label}) — à restructurer`),
        priorites: ['Protéger les ressources à avantage durable','Développer l\'organisation sur les T3','Éliminer les désavantages compétitifs','Compléter les évaluations incomplètes','Identifier de nouvelles ressources stratégiques'],
        conclusion: `${durableCount >= totalRes/2 ? 'Position concurrentielle défendable' : 'Investissements stratégiques nécessaires pour renforcer le portefeuille'}.`,
      }
    }

    return Response.json({ success: true, result })

  } catch (err) {
    console.error('VRIO analyse error:', err)
    return Response.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}