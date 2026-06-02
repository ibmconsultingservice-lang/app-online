import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

// ── Activity metadata ─────────────────────────────────────────────────────────
const ACTIVITIES_META = {
  inbound:     { label: 'Logistique interne',        type: 'primary',  icon: '↓', description: 'Réception, stockage et distribution des intrants' },
  operations:  { label: 'Production / Opérations',   type: 'primary',  icon: '⚙', description: 'Transformation des intrants en produits/services finis' },
  outbound:    { label: 'Logistique externe',         type: 'primary',  icon: '↑', description: 'Collecte, stockage et distribution aux clients' },
  marketing:   { label: 'Marketing & Ventes',         type: 'primary',  icon: '◎', description: 'Moyens pour que les clients puissent acheter le produit' },
  service:     { label: 'Services après-vente',       type: 'primary',  icon: '✦', description: 'Maintien ou amélioration de la valeur du produit' },
  infra:       { label: 'Infrastructure',              type: 'support', icon: '⬡', description: 'Direction générale, finance, juridique, qualité' },
  hrm:         { label: 'Gestion des RH',              type: 'support', icon: '◉', description: 'Recrutement, formation, rémunération, motivation' },
  tech:        { label: 'Développement technologique', type: 'support', icon: '⌬', description: 'R&D, innovation, amélioration des procédés' },
  procurement: { label: 'Approvisionnement',           type: 'support', icon: '⊕', description: 'Achats de ressources utilisées dans la chaîne' },
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

    // ── Enrich activities ──
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
      aiNotes:     act.aiNotes    || '',
      tasks:       act.tasks      || [],
    }))

    const primary = enriched.filter(a => a.type === 'primary')
    const support = enriched.filter(a => a.type === 'support')

    const totalCost   = enriched.reduce((s, a) => s + (a.cost  || 0), 0)
    const totalValue  = enriched.reduce((s, a) => s + (a.value || 0), 0)
    const margin      = totalValue - totalCost
    const marginPct   = totalValue > 0 ? ((margin / totalValue) * 100).toFixed(1) : null
    const strengths   = enriched.filter(a => a.status === 'strength').map(a => a.label)
    const weaknesses  = enriched.filter(a => a.status === 'weakness').map(a => a.label)
    const opps        = enriched.filter(a => a.status === 'opportunity').map(a => a.label)

    const contextLines = [
      projectName && `Entreprise / Projet : ${projectName}`,
      projectTag  && `Secteur : ${projectTag}`,
      context     && `Contexte : ${context}`,
    ].filter(Boolean).join('\n')

    // ── Prompt ──────────────────────────────────────────────────────────────
    const prompt = `Tu es un consultant senior en stratégie d'entreprise, expert de la Chaîne de Valeur de Michael Porter.

${contextLines ? `## CONTEXTE\n${contextLines}\n` : ''}

## ANALYSE : ${analysisName}

### ACTIVITÉS PRINCIPALES :
${primary.map(a => `
**${a.label}** [${a.statusLabel}]
- Description : ${a.description}
- Coût estimé : ${a.cost > 0 ? a.cost.toLocaleString() + ' k€' : 'Non renseigné'}
- Valeur créée : ${a.value > 0 ? a.value.toLocaleString() + ' k€' : 'Non renseignée'}
${a.tasks?.length ? `- Tâches actives : ${a.tasks.join(', ')}` : ''}
${a.notes ? `- Notes utilisateur : ${a.notes}` : ''}
${a.aiNotes ? `- Notes précédentes : ${a.aiNotes}` : ''}
`).join('')}

### ACTIVITÉS DE SOUTIEN :
${support.map(a => `
**${a.label}** [${a.statusLabel}]
- Coût estimé : ${a.cost > 0 ? a.cost.toLocaleString() + ' k€' : 'Non renseigné'}
- Valeur créée : ${a.value > 0 ? a.value.toLocaleString() + ' k€' : 'Non renseignée'}
${a.notes ? `- Notes : ${a.notes}` : ''}
`).join('')}

### SYNTHÈSE FINANCIÈRE :
- Coût total : ${totalCost > 0 ? totalCost.toLocaleString() + ' k€' : 'Non renseigné'}
- Valeur totale : ${totalValue > 0 ? totalValue.toLocaleString() + ' k€' : 'Non renseignée'}
${marginPct ? `- Marge estimée : ${margin.toLocaleString()} k€ (${marginPct}%)` : ''}
- Forces : ${strengths.join(', ') || 'Aucune identifiée'}
- Faiblesses : ${weaknesses.join(', ') || 'Aucune identifiée'}
- Opportunités : ${opps.join(', ') || 'Aucune identifiée'}

---

Génère une analyse stratégique approfondie de la Chaîne de Valeur. Réponds UNIQUEMENT en JSON valide :

{
  "synthese": "3-5 phrases sur la configuration actuelle de la chaîne : où se crée et se détruit la valeur, les déséquilibres, le positionnement concurrentiel et la trajectoire recommandée.",

  "activites": [
    {
      "key": "clé exacte (inbound|operations|outbound|marketing|service|infra|hrm|tech|procurement)",
      "diagnostic": "2-3 phrases spécifiques au contexte : performance actuelle, causes, conséquences sur la chaîne globale.",
      "action": "Action prioritaire concrète et mesurable (max 10 mots)",
      "impact": "high|medium|low"
    }
  ],

  "createurs_valeur": [
    "Ce qui crée le plus de valeur distinctive dans cette chaîne #1",
    "Créateur de valeur #2",
    "Créateur de valeur #3 si pertinent"
  ],

  "destructeurs_valeur": [
    "Ce qui détruit ou grignote la valeur #1",
    "Destructeur #2",
    "Destructeur #3 si pertinent"
  ],

  "optimisations": [
    {
      "titre": "Titre de l'optimisation",
      "description": "Description détaillée : quelle activité améliorer, comment, gain potentiel.",
      "priorite": "haute|moyenne|faible",
      "activites_concernees": ["key1", "key2"]
    }
  ],

  "avantage_concurrentiel": "Source principale d'avantage concurrentiel (ou son absence) dans cette chaîne.",

  "conclusion": "Phrase mémorable sur la trajectoire stratégique recommandée."
}

RÈGLES :
- Analyser les liens (linkages) entre activités — pas uniquement chaque activité isolément
- Si ratio valeur/coût < 1 pour une activité, c'est critique : le signaler explicitement
- Les faiblesses dans les activités de soutien contaminent toutes les primaires
- Distinguer activités sources d'avantage concurrentiel vs commodités externalisables
- Les optimisations doivent être concrètes, ordonnées par ROI potentiel
- Si peu de données chiffrées, baser l'analyse sur les statuts et notes contextuelles
- Identifier les synergies inexploitées entre activités`

    // ── Call Claude ──────────────────────────────────────────────────────────
    const response = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 2500,
      messages: [{ role: 'user', content: prompt }],
    })

    const rawText = response.content.filter(b => b.type === 'text').map(b => b.text).join('')

    let result
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('Pas de JSON')
      result = JSON.parse(jsonMatch[0])
    } catch {
      result = {
        synthese: rawText.slice(0, 500),
        activites: enriched.map(a => ({
          key:        a.key,
          diagnostic: `${a.label} présente un statut ${a.statusLabel}. ${a.description}`,
          action:     a.status === 'weakness' ? 'Améliorer les processus' : 'Maintenir et optimiser',
          impact:     a.status === 'weakness' ? 'high' : 'medium',
        })),
        createurs_valeur:    strengths.slice(0, 3),
        destructeurs_valeur: weaknesses.slice(0, 3),
        optimisations:       [],
        avantage_concurrentiel: 'Analyse nécessitant des données complémentaires.',
        conclusion:          'Un rééquilibrage de la chaîne de valeur est recommandé.',
      }
    }

    // ── Sanitize keys in activites ──
    if (result.activites) {
      result.activites = result.activites.filter(a => Object.keys(ACTIVITIES_META).includes(a.key))
    }

    return Response.json({
      success: true,
      result,
      stats: { totalCost, totalValue, margin, marginPct },
    })

  } catch (err) {
    console.error('CVP analyse error:', err)
    return Response.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}