import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

// ── Activity metadata ─────────────────────────────────────────────────────────
export const ACTIVITIES_META = {
  // Primary activities
  inbound:    { label: 'Logistique interne',      type: 'primary', icon: '↓', description: 'Réception, stockage et distribution des intrants' },
  operations: { label: 'Production / Opérations', type: 'primary', icon: '⚙', description: 'Transformation des intrants en produits/services finis' },
  outbound:   { label: 'Logistique externe',       type: 'primary', icon: '↑', description: 'Collecte, stockage et distribution aux clients' },
  marketing:  { label: 'Marketing & Ventes',       type: 'primary', icon: '◎', description: 'Moyens pour que les clients puissent acheter le produit' },
  service:    { label: 'Services après-vente',     type: 'primary', icon: '✦', description: 'Maintien ou amélioration de la valeur du produit' },
  // Support activities
  infra:      { label: 'Infrastructure',            type: 'support', icon: '⬡', description: 'Direction générale, finance, juridique, qualité' },
  hrm:        { label: 'Gestion des RH',            type: 'support', icon: '◉', description: 'Recrutement, formation, rémunération, motivation' },
  tech:       { label: 'Développement techno.',     type: 'support', icon: '⌬', description: 'R&D, innovation, amélioration des procédés' },
  procurement:{ label: 'Approvisionnement',         type: 'support', icon: '⊕', description: 'Achats de ressources utilisées dans la chaîne' },
}

const STATUS_LABELS = {
  strength:    'Force',
  neutral:     'Neutre',
  weakness:    'Faiblesse',
  opportunity: 'Opportunité',
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { analysisName, context, activities, projectName, projectTag } = body

    if (!activities || Object.keys(activities).length === 0) {
      return Response.json({ error: 'Aucune activité fournie' }, { status: 400 })
    }

    // ── Build enriched list ──
    const enriched = Object.entries(activities).map(([key, act]) => ({
      key,
      label:       ACTIVITIES_META[key]?.label       || key,
      type:        ACTIVITIES_META[key]?.type        || 'primary',
      description: ACTIVITIES_META[key]?.description || '',
      cost:        act.cost       || 0,
      value:       act.value      || 0,
      status:      act.status     || 'neutral',
      statusLabel: STATUS_LABELS[act.status] || 'Neutre',
      notes:       act.notes      || '',
      tasks:       act.tasks      || [],
    }))

    const primary = enriched.filter(a => a.type === 'primary')
    const support = enriched.filter(a => a.type === 'support')

    const totalCost  = enriched.reduce((s, a) => s + (a.cost  || 0), 0)
    const totalValue = enriched.reduce((s, a) => s + (a.value || 0), 0)
    const margin     = totalValue - totalCost
    const marginPct  = totalValue > 0 ? ((margin / totalValue) * 100).toFixed(1) : '—'

    const strengths    = enriched.filter(a => a.status === 'strength').map(a => a.label)
    const weaknesses   = enriched.filter(a => a.status === 'weakness').map(a => a.label)
    const opportunities = enriched.filter(a => a.status === 'opportunity').map(a => a.label)

    const contextLines = [
      projectName && `Entreprise / Projet : ${projectName}`,
      projectTag  && `Secteur : ${projectTag}`,
      context     && `Contexte : ${context}`,
    ].filter(Boolean).join('\n')

    const prompt = `Tu es un consultant senior en stratégie d'entreprise, expert de la Chaîne de Valeur de Michael Porter.

${contextLines ? `## CONTEXTE\n${contextLines}\n` : ''}

## ANALYSE : ${analysisName}

### Activités PRINCIPALES :
${primary.map(a => `
**${a.label}**
- Coût estimé : ${a.cost > 0 ? a.cost.toLocaleString() + ' k€' : 'Non renseigné'}
- Valeur créée : ${a.value > 0 ? a.value.toLocaleString() + ' k€' : 'Non renseignée'}
- Statut : ${a.statusLabel}
${a.tasks?.length ? `- Tâches clés : ${a.tasks.join(', ')}` : ''}
${a.notes ? `- Notes : ${a.notes}` : ''}
`).join('')}

### Activités DE SOUTIEN :
${support.map(a => `
**${a.label}**
- Coût estimé : ${a.cost > 0 ? a.cost.toLocaleString() + ' k€' : 'Non renseigné'}
- Valeur créée : ${a.value > 0 ? a.value.toLocaleString() + ' k€' : 'Non renseignée'}
- Statut : ${a.statusLabel}
${a.notes ? `- Notes : ${a.notes}` : ''}
`).join('')}

### Résumé financier :
- Coût total : ${totalCost.toLocaleString()} k€
- Valeur totale : ${totalValue.toLocaleString()} k€
- Marge estimée : ${margin.toLocaleString()} k€ (${marginPct}%)
- Forces identifiées : ${strengths.join(', ') || 'Aucune'}
- Faiblesses identifiées : ${weaknesses.join(', ') || 'Aucune'}
- Opportunités : ${opportunities.join(', ') || 'Aucune'}

---

Génère une analyse stratégique de la Chaîne de Valeur approfondie. Réponds UNIQUEMENT en JSON valide :

{
  "synthese": "3-5 phrases sur la configuration de la chaîne de valeur, où se concentre la création de valeur, les inefficacités majeures et le positionnement concurrentiel global.",

  "activites": [
    {
      "key": "clé exacte de l'activité (inbound|operations|outbound|marketing|service|infra|hrm|tech|procurement)",
      "diagnostic": "2-3 phrases : analyse spécifique de cette activité — est-elle source d'avantage concurrentiel ou de perte de valeur ? Quels leviers actionner concrètement ?",
      "action": "Action prioritaire courte (max 10 mots)",
      "impact": "high|medium|low"
    }
  ],

  "createurs_valeur": [
    "Activité ou pratique qui crée le plus de valeur distinctive #1",
    "Créateur de valeur #2",
    "Créateur de valeur #3 si pertinent"
  ],

  "destructeurs_valeur": [
    "Activité ou coût qui détruit de la valeur ou est sous-performante #1",
    "Destructeur #2",
    "Destructeur #3 si pertinent"
  ],

  "optimisations": [
    {
      "titre": "Titre court de l'optimisation",
      "description": "Description de l'optimisation : quelle activité, comment, gain potentiel estimé.",
      "priorite": "haute|moyenne|faible",
      "activites_concernees": ["key1", "key2"]
    }
  ],

  "avantage_concurrentiel": "Phrase synthétique sur la source principale d'avantage concurrentiel (ou son absence) dans cette chaîne de valeur.",

  "conclusion": "Phrase de conclusion stratégique mémorable sur la trajectoire recommandée."
}

RÈGLES :
- Analyse chaque activité en fonction de son ratio valeur/coût si fourni
- Identifie les liens (linkages) entre activités qui créent ou détruisent de la valeur
- Distingue les activités à fort avantage concurrentiel de celles commoditisées
- Si des coûts semblent disproportionnés par rapport à la valeur créée, signale-le explicitement
- Propose des optimisations réalistes et actionnables, pas des généralités`

    const response = await client.messages.create({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 2500,
      messages: [{ role: 'user', content: prompt }],
    })

    const rawText = response.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('')

    let result
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('Pas de JSON')
      result = JSON.parse(jsonMatch[0])
    } catch {
      result = {
        synthese: rawText.slice(0, 500),
        activites: enriched.map(a => ({
          key: a.key,
          diagnostic: `${a.label} présente un statut ${a.statusLabel}. ${a.description}`,
          action: a.status === 'weakness' ? 'Améliorer les processus' : 'Maintenir et optimiser',
          impact: a.status === 'weakness' ? 'high' : 'medium',
        })),
        createurs_valeur: strengths.slice(0, 3),
        destructeurs_valeur: weaknesses.slice(0, 3),
        optimisations: [],
        avantage_concurrentiel: 'Analyse nécessitant des données complémentaires.',
        conclusion: 'Un rééquilibrage de la chaîne de valeur est recommandé.',
      }
    }

    return Response.json({
      success: true,
      result,
      stats: { totalCost, totalValue, margin, marginPct },
    })

  } catch (err) {
    console.error('CVP API error:', err)
    return Response.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}