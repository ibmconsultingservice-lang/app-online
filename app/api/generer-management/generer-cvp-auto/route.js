import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const ACTIVITIES_META = {
  inbound:     { label: 'Logistique interne',      type: 'primary',  description: 'Réception, stockage et distribution des intrants' },
  operations:  { label: 'Production / Opérations', type: 'primary',  description: 'Transformation des intrants en produits/services finis' },
  outbound:    { label: 'Logistique externe',       type: 'primary',  description: 'Collecte, stockage et distribution aux clients' },
  marketing:   { label: 'Marketing & Ventes',       type: 'primary',  description: 'Moyens pour que les clients puissent acheter le produit' },
  service:     { label: 'Services après-vente',     type: 'primary',  description: 'Maintien ou amélioration de la valeur du produit' },
  infra:       { label: 'Infrastructure',            type: 'support', description: 'Direction générale, finance, juridique, qualité' },
  hrm:         { label: 'Gestion des RH',            type: 'support', description: 'Recrutement, formation, rémunération, motivation' },
  tech:        { label: 'Développement technologique', type: 'support', description: 'R&D, innovation, amélioration des procédés' },
  procurement: { label: 'Approvisionnement',         type: 'support', description: 'Achats de ressources utilisées dans la chaîne' },
}

const VALID_STATUSES = ['strength', 'neutral', 'weakness', 'opportunity']
const VALID_TASKS = {
  inbound:     ['Gestion des stocks','Transport entrant','Contrôle qualité','Planification','Relations fournisseurs'],
  operations:  ['Fabrication','Assemblage','Tests qualité','Maintenance','Gestion capacité'],
  outbound:    ['Expédition','Gestion commandes','Entrepôts','Livraison','Retours'],
  marketing:   ['Publicité','Force de vente','Pricing','CRM','Études marché'],
  service:     ['SAV','Installation','Formation','Support','Garantie'],
  infra:       ['Management','Finance','Juridique','Qualité','Planification'],
  hrm:         ['Recrutement','Formation','Paie','Culture','Performance'],
  tech:        ['R&D produit','Automatisation','IT','Brevets','Veille techno'],
  procurement: ['Négociation achats','Sourcing','Éval. fournisseurs','Contrats','Audit'],
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { analysisName, context, sector, projectName, projectTag } = body

    if (!context?.trim()) {
      return Response.json({ error: 'Contexte requis pour la génération automatique' }, { status: 400 })
    }

    const contextLines = [
      projectName && `Organisation : ${projectName}`,
      projectTag  && `Secteur fourni : ${projectTag}`,
      sector      && sector !== projectTag && `Secteur déclaré : ${sector}`,
    ].filter(Boolean).join('\n')

    // ── Prompt ──────────────────────────────────────────────────────────────
    const prompt = `Tu es un expert en stratégie d'entreprise et en Chaîne de Valeur de Michael Porter.

${contextLines ? `## CONTEXTE ORGANISATION\n${contextLines}\n` : ''}

## DESCRIPTION DE L'ACTIVITÉ À ANALYSER
Analyse : ${analysisName}
Contexte : ${context}

---

À partir de cette description, génère automatiquement une Chaîne de Valeur complète et réaliste.
Pour chaque activité, évalue son état actuel, son importance stratégique et donne des notes contextuelles.

Réponds UNIQUEMENT en JSON valide avec cette structure exacte :

{
  "activities": {
    "inbound": {
      "cost": 0,
      "value": 0,
      "status": "strength|neutral|weakness|opportunity",
      "notes": "Observation personnalisée sur cette activité dans le contexte décrit (1-2 phrases max)",
      "aiNotes": "Analyse stratégique courte de cette activité dans le contexte de l'entreprise (1-2 phrases)",
      "tasks": ["tâche1", "tâche2"]
    },
    "operations": { "cost": 0, "value": 0, "status": "...", "notes": "...", "aiNotes": "...", "tasks": [] },
    "outbound":   { "cost": 0, "value": 0, "status": "...", "notes": "...", "aiNotes": "...", "tasks": [] },
    "marketing":  { "cost": 0, "value": 0, "status": "...", "notes": "...", "aiNotes": "...", "tasks": [] },
    "service":    { "cost": 0, "value": 0, "status": "...", "notes": "...", "aiNotes": "...", "tasks": [] },
    "infra":      { "cost": 0, "value": 0, "status": "...", "notes": "...", "aiNotes": "...", "tasks": [] },
    "hrm":        { "cost": 0, "value": 0, "status": "...", "notes": "...", "aiNotes": "...", "tasks": [] },
    "tech":       { "cost": 0, "value": 0, "status": "...", "notes": "...", "aiNotes": "...", "tasks": [] },
    "procurement":{ "cost": 0, "value": 0, "status": "...", "notes": "...", "aiNotes": "...", "tasks": [] }
  },

  "result": {
    "synthese": "Paragraphe de 3-5 phrases sur la configuration de la chaîne de valeur, les forces, les points d'amélioration et les leviers de création de valeur prioritaires.",

    "activites": [
      {
        "key": "clé exacte",
        "diagnostic": "Analyse de 2-3 phrases sur cette activité dans ce contexte spécifique",
        "action": "Action concrète prioritaire (max 10 mots)",
        "impact": "high|medium|low"
      }
    ],

    "createurs_valeur": ["Activité ou pratique créatrice de valeur #1", "Créateur #2", "Créateur #3"],
    "destructeurs_valeur": ["Point de friction ou destructeur de valeur #1", "Destructeur #2"],

    "optimisations": [
      {
        "titre": "Optimisation recommandée",
        "description": "Description détaillée avec gain potentiel estimé",
        "priorite": "haute|moyenne|faible",
        "activites_concernees": ["key1", "key2"]
      }
    ],

    "avantage_concurrentiel": "Phrase sur la source d'avantage concurrentiel principal identifiée.",
    "conclusion": "Phrase de conclusion stratégique percutante."
  }
}

RÈGLES STRICTES :
1. "cost" et "value" : laisse à 0 si impossible à estimer ; NE JAMAIS inventer des chiffres précis
2. "status" : UNIQUEMENT "strength", "neutral", "weakness" ou "opportunity"
3. "tasks" : sélectionne 2-3 tâches pertinentes parmi ces options pour chaque activité :
   - inbound: Gestion des stocks, Transport entrant, Contrôle qualité, Planification, Relations fournisseurs
   - operations: Fabrication, Assemblage, Tests qualité, Maintenance, Gestion capacité
   - outbound: Expédition, Gestion commandes, Entrepôts, Livraison, Retours
   - marketing: Publicité, Force de vente, Pricing, CRM, Études marché
   - service: SAV, Installation, Formation, Support, Garantie
   - infra: Management, Finance, Juridique, Qualité, Planification
   - hrm: Recrutement, Formation, Paie, Culture, Performance
   - tech: R&D produit, Automatisation, IT, Brevets, Veille techno
   - procurement: Négociation achats, Sourcing, Éval. fournisseurs, Contrats, Audit
4. Les "aiNotes" doivent être spécifiques au contexte décrit, pas génériques
5. Identifie les activités qui sont clairement des avantages concurrentiels vs celles qui sont des faiblesses
6. Pour une activité de service/numérique : "inbound" et "outbound" peuvent être adaptés au contexte digital`

    // ── Call Claude ──────────────────────────────────────────────────────────
    const response = await client.messages.create({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
    })

    const rawText = response.content.filter(b => b.type === 'text').map(b => b.text).join('')

    let parsed
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('Pas de JSON')
      parsed = JSON.parse(jsonMatch[0])
    } catch {
      // Fallback: return default activities with error info
      return Response.json({
        success: false,
        error: 'Impossible de parser la réponse IA — tentez de relancer',
        generatedActivities: Object.fromEntries(
          Object.keys(ACTIVITIES_META).map(k => [k, { cost: 0, value: 0, status: 'neutral', notes: '', aiNotes: '', tasks: [] }])
        ),
        result: null,
      })
    }

    // ── Sanitize activities ──
    const generatedActivities = {}
    for (const [key] of Object.entries(ACTIVITIES_META)) {
      const raw = parsed.activities?.[key] || {}
      const validTasks = (raw.tasks || []).filter(t => VALID_TASKS[key]?.includes(t))
      generatedActivities[key] = {
        cost:     typeof raw.cost  === 'number' ? raw.cost  : 0,
        value:    typeof raw.value === 'number' ? raw.value : 0,
        status:   VALID_STATUSES.includes(raw.status) ? raw.status : 'neutral',
        notes:    typeof raw.notes   === 'string' ? raw.notes.slice(0, 300)   : '',
        aiNotes:  typeof raw.aiNotes === 'string' ? raw.aiNotes.slice(0, 400) : '',
        tasks:    validTasks.slice(0, 4),
      }
    }

    // ── Sanitize result ──
    const result = parsed.result || {}
    const sanitizedResult = {
      synthese:              result.synthese              || '',
      avantage_concurrentiel: result.avantage_concurrentiel || '',
      conclusion:            result.conclusion            || '',
      activites:  (result.activites  || []).map(a => ({
        key:        a.key        || '',
        diagnostic: a.diagnostic || '',
        action:     a.action     || '',
        impact:     ['high','medium','low'].includes(a.impact) ? a.impact : 'medium',
      })),
      createurs_valeur:   (result.createurs_valeur   || []).slice(0, 5),
      destructeurs_valeur: (result.destructeurs_valeur || []).slice(0, 5),
      optimisations: (result.optimisations || []).map(o => ({
        titre:               o.titre               || '',
        description:         o.description         || '',
        priorite:            ['haute','moyenne','faible'].includes(o.priorite) ? o.priorite : 'moyenne',
        activites_concernees: (o.activites_concernees || []).filter(k => Object.keys(ACTIVITIES_META).includes(k)),
      })),
    }

    return Response.json({
      success:              true,
      generatedActivities,
      result: sanitizedResult,
    })

  } catch (err) {
    console.error('CVP auto-generate error:', err)
    return Response.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}