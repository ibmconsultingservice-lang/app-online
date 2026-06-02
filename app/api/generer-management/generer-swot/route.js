import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2,7)}`

// ── TOWS types ────────────────────────────────────────────────
const TOWS_TYPES = {
  SO: { label:'Forces × Opportunités',    strategy:'Exploiter vos forces pour saisir les opportunités',   icon:'↗', color:'#22d3a5' },
  WO: { label:'Faiblesses × Opportunités',strategy:'Combler vos faiblesses pour saisir les opportunités', icon:'↑', color:'#60a5fa' },
  ST: { label:'Forces × Menaces',         strategy:'Utiliser vos forces pour contrer les menaces',        icon:'⊡', color:'#f59e0b' },
  WT: { label:'Faiblesses × Menaces',     strategy:'Minimiser faiblesses et éviter les menaces',          icon:'↙', color:'#f87171' },
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { mode, analysisName, context, objective, items, projectName, projectTag } = body

    // ═══════════════════════════════════════════════════
    // MODE 1 — AUTO GENERATE: IA crée les éléments SWOT
    // ═══════════════════════════════════════════════════
    if (mode === 'generate') {
      if (!context?.trim()) {
        return Response.json({ error: 'Contexte requis pour la génération automatique' }, { status: 400 })
      }

      const prompt = `Tu es un consultant stratégique expert en analyse SWOT.
À partir du contexte fourni, génère une analyse SWOT complète et réaliste.

## CONTEXTE
${projectName ? `Entreprise/Projet : ${projectName}` : ''}
${projectTag   ? `Secteur : ${projectTag}` : ''}
Analyse : ${analysisName || 'SWOT Analysis'}
Description : ${context}
${objective ? `Objectif : ${objective}` : ''}

Génère exactement ce JSON (sans markdown, sans backticks) :
{
  "items": {
    "strengths": [
      { "text": "Force concrète et spécifique 1", "priority": "high", "impact": 5, "notes": "Explication courte" },
      { "text": "Force concrète 2", "priority": "high", "impact": 4, "notes": "" },
      { "text": "Force 3", "priority": "medium", "impact": 3, "notes": "" },
      { "text": "Force 4", "priority": "medium", "impact": 3, "notes": "" },
      { "text": "Force 5", "priority": "low", "impact": 2, "notes": "" }
    ],
    "weaknesses": [
      { "text": "Faiblesse concrète 1", "priority": "high", "impact": 4, "notes": "Impact potentiel" },
      { "text": "Faiblesse 2", "priority": "high", "impact": 4, "notes": "" },
      { "text": "Faiblesse 3", "priority": "medium", "impact": 3, "notes": "" },
      { "text": "Faiblesse 4", "priority": "low", "impact": 2, "notes": "" }
    ],
    "opportunities": [
      { "text": "Opportunité de marché 1", "priority": "high", "impact": 5, "notes": "Fenêtre temporelle" },
      { "text": "Opportunité 2", "priority": "high", "impact": 4, "notes": "" },
      { "text": "Opportunité 3", "priority": "medium", "impact": 3, "notes": "" },
      { "text": "Opportunité 4", "priority": "medium", "impact": 3, "notes": "" }
    ],
    "threats": [
      { "text": "Menace externe 1", "priority": "high", "impact": 4, "notes": "Probabilité d'occurrence" },
      { "text": "Menace 2", "priority": "medium", "impact": 3, "notes": "" },
      { "text": "Menace 3", "priority": "medium", "impact": 3, "notes": "" },
      { "text": "Menace 4", "priority": "low", "impact": 2, "notes": "" }
    ]
  },
  "diagnostic": "Paragraphe de 4-6 phrases sur l'état stratégique général basé sur ce contexte spécifique.",
  "strategies": [
    { "type": "SO", "titre": "Titre court percutant", "description": "2-3 phrases sur comment exploiter forces + opportunités" },
    { "type": "WO", "titre": "Titre court percutant", "description": "2-3 phrases sur comment corriger faiblesses via opportunités" },
    { "type": "ST", "titre": "Titre court percutant", "description": "2-3 phrases sur comment utiliser forces contre menaces" },
    { "type": "WT", "titre": "Titre court percutant", "description": "2-3 phrases sur comment minimiser faiblesses face aux menaces" }
  ],
  "priorites": [
    "Action #1 concrète et mesurable avec horizon temporel",
    "Action #2",
    "Action #3",
    "Action #4",
    "Action #5"
  ],
  "risques": [
    "Risque critique #1 avec impact potentiel",
    "Risque #2",
    "Risque #3"
  ],
  "conclusion": "Phrase de synthèse mémorable sur la trajectoire recommandée.",
  "healthScore": 72
}

RÈGLES :
- Chaque élément SWOT doit être SPÉCIFIQUE au contexte fourni (pas générique)
- priority: "high" | "medium" | "low"
- impact: 1-5
- 4-6 forces, 3-5 faiblesses, 3-5 opportunités, 3-5 menaces
- Les 4 stratégies TOWS doivent croiser des éléments SPÉCIFIQUES listés
- healthScore entre 0-100 reflétant l'état stratégique`

      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 3500,
        messages: [{ role:'user', content: prompt }],
      })

      const rawText = response.content.filter(b => b.type==='text').map(b => b.text).join('')
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('Réponse IA invalide')

      const result = JSON.parse(jsonMatch[0])

      // Add IDs to each item
      const itemsWithIds = {}
      for (const [quadrant, arr] of Object.entries(result.items || {})) {
        itemsWithIds[quadrant] = (arr || []).map(item => ({ ...item, id: uid() }))
      }

      return Response.json({
        success: true,
        mode: 'generate',
        items: itemsWithIds,
        analysis: {
          diagnostic:  result.diagnostic,
          strategies:  result.strategies,
          priorites:   result.priorites,
          risques:     result.risques,
          conclusion:  result.conclusion,
          healthScore: result.healthScore || 70,
        }
      })
    }

    // ═══════════════════════════════════════════════════
    // MODE 2 — ANALYSE: IA analyse les éléments existants
    // ═══════════════════════════════════════════════════
    if (mode === 'analyse') {
      const totalItems = Object.values(items || {}).reduce((s, arr) => s + arr.length, 0)
      if (totalItems === 0) {
        return Response.json({ error: 'Aucun élément SWOT à analyser' }, { status: 400 })
      }

      const formatSection = (key, label) => {
        const arr = items[key] || []
        if (arr.length === 0) return `### ${label}\nAucun élément.`
        return `### ${label} (${arr.length})\n` + arr.map((item, i) =>
          `  ${i+1}. ${item.text}${item.priority==='high' ? ' [PRIORITÉ HAUTE]' : ''} — Impact: ${item.impact}/5${item.notes ? ` — ${item.notes}` : ''}`
        ).join('\n')
      }

      const highPrio = Object.entries(items || {}).flatMap(([k, arr]) =>
        arr.filter(i => i.priority==='high').map(i => `"${i.text}"`)
      )

      const contextInfo = [
        projectName  && `Entreprise : ${projectName}`,
        projectTag   && `Secteur : ${projectTag}`,
        context      && `Contexte : ${context}`,
        objective    && `Objectif : ${objective}`,
      ].filter(Boolean).join('\n')

      const prompt = `Tu es un consultant stratégique expert en analyse SWOT et matrices TOWS.
Analyse en profondeur cette matrice SWOT et fournis des recommandations actionnables.

## CONTEXTE
${contextInfo || 'Non renseigné'}
Analyse : "${analysisName}"
Total éléments : ${totalItems}
${highPrio.length > 0 ? `Éléments haute priorité : ${highPrio.join(', ')}` : ''}

## MATRICE SWOT
${formatSection('strengths',     'FORCES')}
${formatSection('weaknesses',    'FAIBLESSES')}
${formatSection('opportunities', 'OPPORTUNITÉS')}
${formatSection('threats',       'MENACES')}

Génère exactement ce JSON (sans markdown, sans backticks) :
{
  "diagnostic": "Paragraphe de 5-7 phrases. Évalue l'équilibre forces/faiblesses, les tensions clés, les paradoxes si présents. Sois précis et contextuel.",
  "strategies": [
    { "type": "SO", "titre": "Titre court percutant max 8 mots", "description": "2-3 phrases croisant des éléments SPÉCIFIQUES de ta liste" },
    { "type": "WO", "titre": "...", "description": "..." },
    { "type": "ST", "titre": "...", "description": "..." },
    { "type": "WT", "titre": "...", "description": "..." }
  ],
  "priorites": [
    "Action #1 : concrète, mesurable, avec horizon temporel si possible",
    "Action #2",
    "Action #3",
    "Action #4",
    "Action #5"
  ],
  "risques": [
    "Risque #1 : menace amplifiée par une faiblesse",
    "Risque #2",
    "Risque #3"
  ],
  "conclusion": "Phrase de synthèse stratégique mémorable.",
  "healthScore": 65,
  "suggestions": [
    "Suggestion d'amélioration pour compléter la matrice",
    "Élément manquant qui renforcerait l'analyse"
  ]
}`

      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2500,
        messages: [{ role:'user', content: prompt }],
      })

      const rawText = response.content.filter(b => b.type==='text').map(b => b.text).join('')
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('Réponse IA invalide')

      let result = JSON.parse(jsonMatch[0])

      // Ensure 4 TOWS
      const existingTypes = (result.strategies || []).map(s => s.type)
      for (const type of ['SO','WO','ST','WT']) {
        if (!existingTypes.includes(type)) {
          result.strategies = result.strategies || []
          result.strategies.push({ type, titre:`Stratégie ${type}`, description: TOWS_TYPES[type].strategy })
        }
      }
      result.strategies = result.strategies
        .filter(s => ['SO','WO','ST','WT'].includes(s.type))
        .sort((a,b) => ['SO','WO','ST','WT'].indexOf(a.type) - ['SO','WO','ST','WT'].indexOf(b.type))

      return Response.json({ success: true, mode: 'analyse', analysis: result })
    }

    return Response.json({ error: 'Mode invalide (generate|analyse)' }, { status: 400 })

  } catch (err) {
    console.error('SWOT API error:', err)
    return Response.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}