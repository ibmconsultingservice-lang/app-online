import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const SECTION_LABELS = {
  customer_jobs:    'Tâches Clients (Customer Jobs)',
  pains:            'Douleurs Clients (Pains)',
  gains:            'Bénéfices Désirés (Gains)',
  products_services:'Produits & Services',
  pain_relievers:   'Analgésiques (Pain Relievers)',
  gain_creators:    'Créateurs de Gains (Gain Creators)',
}

const formatSection = (items = []) =>
  items.length === 0
    ? '  (vide)'
    : items.map((item, i) =>
        `  ${i+1}. [${item.priority?.toUpperCase()||'MEDIUM'} – ${item.importance||3}/5] ${item.text}${item.notes ? ` — ${item.notes}` : ''}`
      ).join('\n')

export async function POST(request) {
  try {
    const body = await request.json()
    const { canvasName, context, segment, canvas, projectName, projectTag } = body

    const totalItems = Object.values(canvas || {}).reduce((s, arr) => s + (arr?.length || 0), 0)
    if (totalItems === 0) {
      return Response.json({ error: 'Canvas vide — ajoutez des éléments d\'abord' }, { status: 400 })
    }

    const ctx = [
      projectName && `Entreprise : ${projectName}`,
      projectTag  && `Secteur : ${projectTag}`,
      context     && `Contexte : ${context}`,
      segment     && `Segment client : ${segment}`,
    ].filter(Boolean).join('\n')

    // Compute basic stats
    const sections = Object.entries(canvas || {})
    const highPriorityItems = sections.flatMap(([k, arr]) =>
      (arr||[]).filter(i => i.priority === 'high').map(i => `${SECTION_LABELS[k]}: "${i.text}"`)
    )
    const emptySections = sections.filter(([, arr]) => !arr?.length).map(([k]) => SECTION_LABELS[k])

    // Fit computation: count pain_relievers vs pains, gain_creators vs gains
    const painsCount    = (canvas.pains || []).length
    const relieversCount = (canvas.pain_relievers || []).length
    const gainsCount    = (canvas.gains || []).length
    const creatorsCount = (canvas.gain_creators || []).length

    const prompt = `Tu es un expert en stratégie marketing, spécialiste du Value Proposition Canvas (Osterwalder).

${ctx ? `## CONTEXTE\n${ctx}\n` : ''}

## ANALYSE CVP : ${canvasName}

### PROFIL CLIENT :

**Tâches Clients (${(canvas.customer_jobs||[]).length} items)**
${formatSection(canvas.customer_jobs)}

**Douleurs (${painsCount} items)**
${formatSection(canvas.pains)}

**Bénéfices Désirés (${gainsCount} items)**
${formatSection(canvas.gains)}

### CARTE DE VALEUR :

**Produits & Services (${(canvas.products_services||[]).length} items)**
${formatSection(canvas.products_services)}

**Analgésiques (${relieversCount} items — pour ${painsCount} douleurs)**
${formatSection(canvas.pain_relievers)}

**Créateurs de Gains (${creatorsCount} items — pour ${gainsCount} bénéfices)**
${formatSection(canvas.gain_creators)}

### Indicateurs de couverture :
- Douleurs couvertes : ${relieversCount}/${painsCount} ${relieversCount < painsCount ? '⚠ ÉCART' : '✓'}
- Gains couverts : ${creatorsCount}/${gainsCount} ${creatorsCount < gainsCount ? '⚠ ÉCART' : '✓'}
${emptySections.length > 0 ? `- Sections vides : ${emptySections.join(', ')}` : '- Toutes sections remplies ✓'}
${highPriorityItems.length > 0 ? `\n### Items haute priorité :\n${highPriorityItems.map(i=>`- ${i}`).join('\n')}` : ''}

---

Génère une analyse stratégique CVP complète. Réponds UNIQUEMENT en JSON valide :

{
  "fit_score": 72,
  "fit_label": "Bon fit | Fit partiel | Fit faible | Fit critique",
  "synthese": "3-4 phrases sur la qualité de l'adéquation proposition/profil client : alignement, forces, failles, risques de désalignement.",

  "adéquation": {
    "pains_couverts": [
      { "pain": "texte exact de la douleur", "reliever": "texte du pain reliever correspondant ou null", "couvert": true }
    ],
    "gains_couverts": [
      { "gain": "texte exact du gain", "creator": "texte du gain creator correspondant ou null", "couvert": false }
    ]
  },

  "forces": [
    "Force distinctive de la proposition de valeur #1",
    "Force #2",
    "Force #3 (si pertinent)"
  ],

  "gaps": [
    { "type": "pain_non_couvert|gain_non_créé|job_non_adressé|survaleur", "description": "Description précise du gap", "impact": "critique|élevé|modéré" }
  ],

  "jobs_analysis": [
    { "job": "texte exact du job", "adresse": true, "commentaire": "Comment la proposition adresse ce job — ou pourquoi elle ne le fait pas" }
  ],

  "sections": [
    { "key": "customer_jobs|pains|gains|products_services|pain_relievers|gain_creators", "score": 75, "commentaire": "Évaluation courte de la qualité/pertinence de cette section" }
  ],

  "recommandations": [
    { "priorite": "haute|moyenne|faible", "action": "Action stratégique concrète et mesurable", "rationale": "Justification basée sur l'analyse" }
  ],

  "differentiateurs": [
    "Ce qui rend cette proposition vraiment unique vs la concurrence #1",
    "Différenciateur #2 (si identifiable)"
  ],

  "conclusion": "Verdict stratégique d'une phrase sur la trajectoire recommandée pour renforcer le fit valeur/client."
}

RÈGLES :
- fit_score : 0-100 basé sur la couverture réelle des pains/gains + qualité des items
- Analyser TOUTES les correspondances pains ↔ pain_relievers et gains ↔ gain_creators
- Si une section est vide, le noter comme gap critique
- Les recommandations doivent être ordonnées par impact
- Identifier explicitement les gaps de couverture (pains non soulagés, gains non créés)
- sections[] : couvrir les 6 sections avec un score 0-100`

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
      result.fit_score = Math.min(100, Math.max(0, parseInt(result.fit_score) || 60))
    } catch {
      result = {
        fit_score: 50,
        fit_label: 'Fit partiel',
        synthese: rawText.slice(0, 400),
        adéquation: { pains_couverts: [], gains_couverts: [] },
        forces: [], gaps: [], jobs_analysis: [], sections: [],
        recommandations: [{ priorite:'haute', action:'Compléter l\'analyse CVP', rationale:'Données insuffisantes' }],
        differentiateurs: [],
        conclusion: 'Analyse partielle — veuillez réessayer.',
      }
    }

    return Response.json({ success: true, result })

  } catch (err) {
    console.error('CVP analyse error:', err)
    return Response.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}