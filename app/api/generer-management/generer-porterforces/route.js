import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

// ── Force metadata ────────────────────────────────────────────────────────────
const FORCES = {
  rivalry: {
    label: 'Rivalité entre concurrents',
    key: 'rivalry',
    description: "Intensité de la compétition entre les acteurs déjà présents sur le marché.",
  },
  newEntrants: {
    label: 'Menace de nouveaux entrants',
    key: 'newEntrants',
    description: "Facilité avec laquelle de nouveaux concurrents peuvent pénétrer le marché.",
  },
  substitutes: {
    label: 'Menace des produits substituts',
    key: 'substitutes',
    description: "Risque que des produits/services alternatifs détournent vos clients.",
  },
  suppliers: {
    label: 'Pouvoir de négociation des fournisseurs',
    key: 'suppliers',
    description: "Capacité des fournisseurs à imposer leurs conditions (prix, délais, qualité).",
  },
  buyers: {
    label: 'Pouvoir de négociation des clients',
    key: 'buyers',
    description: "Capacité des acheteurs à faire pression sur les prix et conditions.",
  },
}

const INTENSITY_LABELS = {
  1: 'Très faible',
  2: 'Faible',
  3: 'Modérée',
  4: 'Élevée',
  5: 'Très élevée',
}

// ── Score helpers ─────────────────────────────────────────────────────────────
const scoreToLabel = (score) => INTENSITY_LABELS[Math.round(score)] || 'Modérée'

const getAttractivenessLevel = (avg) => {
  if (avg <= 1.8) return { label: 'Très attractive', color: 'green' }
  if (avg <= 2.6) return { label: 'Attractive',      color: 'teal' }
  if (avg <= 3.4) return { label: 'Neutre',           color: 'yellow' }
  if (avg <= 4.2) return { label: 'Peu attractive',   color: 'orange' }
  return              { label: 'Non attractive',   color: 'red' }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { analysisName, context, forces, projectName, projectTag } = body

    if (!forces || Object.keys(forces).length === 0) {
      return Response.json({ error: 'Aucune force évaluée' }, { status: 400 })
    }

    // ── Compute global attractiveness ──
    const scores    = Object.values(forces).map(f => f.score || 3)
    const avgScore  = scores.reduce((a, b) => a + b, 0) / scores.length
    const attracts  = getAttractivenessLevel(avgScore)

    // ── Build enriched forces for the prompt ──
    const enrichedForces = Object.entries(forces).map(([key, f]) => ({
      key,
      label:      FORCES[key]?.label       || key,
      description: FORCES[key]?.description || '',
      score:       f.score || 3,
      scoreLabel:  scoreToLabel(f.score || 3),
      factors:     f.factors || [],
      notes:       f.notes   || '',
    }))

    const contextLines = [
      projectName && `Entreprise / Projet : ${projectName}`,
      projectTag  && `Secteur : ${projectTag}`,
      context     && `Contexte de l'analyse : ${context}`,
    ].filter(Boolean).join('\n')

    // ── Prompt ──────────────────────────────────────────────────────────────
    const prompt = `Tu es un consultant en stratégie d'entreprise senior, expert du modèle des 5 Forces de Michael Porter.

${contextLines ? `## CONTEXTE\n${contextLines}\n` : ''}

## ANALYSE : ${analysisName}

### Score global d'attractivité : ${avgScore.toFixed(1)}/5 → ${attracts.label}

### Évaluation des 5 forces :

${enrichedForces.map((f, i) => `
**${i + 1}. ${f.label}** — Intensité : ${f.scoreLabel} (${f.score}/5)
${f.description}
${f.factors?.length ? `Facteurs identifiés :\n${f.factors.map(x => `  • ${x}`).join('\n')}` : ''}
${f.notes ? `Notes : ${f.notes}` : ''}
`).join('')}

---

Génère une analyse stratégique Porter approfondie et personnalisée. Réponds UNIQUEMENT en JSON valide avec cette structure exacte :

{
  "synthese": "Paragraphe de 3-5 phrases sur l'attractivité globale du marché, les forces dominantes, les risques et opportunités clés. Sois précis et actionnable, pas générique.",

  "forces": [
    {
      "key": "rivalry|newEntrants|substitutes|suppliers|buyers",
      "analyse": "Analyse spécifique de 2-3 phrases : pourquoi cette force a ce niveau d'intensité, ce que cela implique concrètement pour l'entreprise.",
      "action": "Action stratégique courte et concrète (max 10 mots)"
    }
  ],

  "opportunites": [
    "Opportunité stratégique #1 concrète et actionnable",
    "Opportunité stratégique #2",
    "Opportunité stratégique #3 (si pertinent)"
  ],

  "menaces": [
    "Menace prioritaire #1 à surveiller",
    "Menace #2",
    "Menace #3 (si pertinent)"
  ],

  "recommandations": [
    "Recommandation stratégique #1 prioritaire et mesurable",
    "Recommandation #2",
    "Recommandation #3",
    "Recommandation #4 (si pertinent)",
    "Recommandation #5 (si pertinent)"
  ],

  "conclusion": "Phrase de conclusion stratégique percutante sur le positionnement recommandé face à ces 5 forces."
}

RÈGLES IMPÉRATIVES :
- Chaque analyse de force doit être spécifique au contexte fourni, pas copiée de la théorie générique
- Tiens compte des facteurs identifiés par l'utilisateur pour chaque force
- Les forces à haute intensité (4-5) doivent avoir des actions défensives/d'atténuation
- Les forces à faible intensité (1-2) doivent avoir des actions pour exploiter cet avantage
- Identifie les interactions et synergies entre forces (ex: un fort pouvoir fournisseur peut aggraver la rivalité)
- Si le contexte sectoriel est fourni, adapte ton analyse à ce secteur précis
- Conclus avec un positionnement stratégique clair adapté au profil des 5 forces`

    // ── Call Claude ──────────────────────────────────────────────────────────
    const response = await client.messages.create({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })

    // ── Parse response ───────────────────────────────────────────────────────
    const rawText = response.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('')

    let result
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('Pas de JSON dans la réponse')
      result = JSON.parse(jsonMatch[0])
    } catch {
      // Fallback
      result = {
        synthese: rawText.slice(0, 600),
        forces: enrichedForces.map(f => ({
          key:     f.key,
          analyse: `La force "${f.label}" présente une intensité ${f.scoreLabel}. ${f.description}`,
          action:  f.score >= 4 ? 'Mettre en place des barrières défensives' : 'Capitaliser sur cet avantage concurrentiel',
        })),
        opportunites: ['Renforcer les barrières à l\'entrée', 'Diversifier le portefeuille fournisseurs'],
        menaces:      ['Surveiller les nouveaux entrants', 'Anticiper les produits substituts'],
        recommandations: ['Développer une stratégie de différenciation', 'Construire des avantages concurrentiels durables'],
        conclusion: 'Une stratégie de positionnement claire est essentielle pour naviguer dans cet environnement concurrentiel.',
      }
    }

    return Response.json({ success: true, result, avgScore, attractiveness: attracts })

  } catch (err) {
    console.error('Porter API error:', err)
    return Response.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}