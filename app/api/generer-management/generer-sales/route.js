import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const uid = () => `ai-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

export async function POST(request) {
  try {
    const body = await request.json()
    const { description, workflowName, projectName, projectTag } = body

    if (!description?.trim()) {
      return Response.json({ error: 'Description commerciale requise' }, { status: 400 })
    }

    const prompt = `Tu es un expert en performance commerciale, maître des frameworks AIDA, BANT et SPIN Selling.

## CONTEXTE COMMERCIAL
${description}
${workflowName ? `Workflow : ${workflowName}` : ''}
${projectName  ? `Projet : ${projectName}` : ''}
${projectTag   ? `Secteur : ${projectTag}` : ''}

## MISSION
Génère un workflow commercial complet et opérationnel adapté à ce contexte.

Réponds UNIQUEMENT en JSON valide avec cette structure exacte :

{
  "context": "Résumé synthétique du contexte commercial en 2 phrases",
  "objectifCommercial": "Objectif commercial principal déduit du contexte",
  "synthese": "Synthèse de 2-3 phrases sur la stratégie commerciale recommandée et la logique des outils choisis",

  "aida": {
    "description": "Description de l'approche funnel adaptée à ce contexte",
    "stages": [
      {
        "name": "Attention",
        "label": "ATTENTION",
        "color": "#6366f1",
        "description": "Description spécifique de l'étape Attention pour ce contexte",
        "volume": 10000,
        "conversionRate": 25,
        "actions": ["Action concrète 1", "Action concrète 2", "Action concrète 3"],
        "kpis": ["KPI 1 mesurable", "KPI 2 mesurable"],
        "channels": ["Canal 1", "Canal 2"]
      },
      {
        "name": "Intérêt",
        "label": "INTÉRÊT",
        "color": "#818cf8",
        "description": "Description spécifique de l'étape Intérêt",
        "volume": 2500,
        "conversionRate": 40,
        "actions": ["Action 1", "Action 2"],
        "kpis": ["KPI 1", "KPI 2"],
        "channels": ["Canal 1"]
      },
      {
        "name": "Désir",
        "label": "DÉSIR",
        "color": "#f59e0b",
        "description": "Description spécifique de l'étape Désir",
        "volume": 1000,
        "conversionRate": 30,
        "actions": ["Action 1", "Action 2"],
        "kpis": ["KPI 1"],
        "channels": []
      },
      {
        "name": "Action",
        "label": "ACTION",
        "color": "#34d399",
        "description": "Description spécifique de l'étape Action / Conversion",
        "volume": 300,
        "conversionRate": 100,
        "actions": ["Action 1", "Action 2"],
        "kpis": ["KPI 1", "KPI 2"],
        "channels": []
      }
    ]
  },

  "bant": {
    "description": "Description de l'approche BANT adaptée au cycle de vente de ce contexte",
    "criteria": {
      "budget": {
        "label": "Budget",
        "description": "Description du critère Budget pour ce secteur/produit spécifique",
        "questions": [
          "Question de qualification budget 1 adaptée au contexte",
          "Question budget 2",
          "Question budget 3"
        ],
        "thresholds": {
          "fort":   "Critère pour score fort (ex: Budget >50K€ disponible cette année)",
          "moyen":  "Critère pour score moyen (ex: Budget à valider avec la direction)",
          "faible": "Critère pour score faible (ex: Pas de budget défini)"
        }
      },
      "authority": {
        "label": "Authority",
        "description": "Description du critère Authority pour ce contexte de vente",
        "questions": ["Question autorité 1", "Question autorité 2", "Question autorité 3"],
        "thresholds": { "fort": "...", "moyen": "...", "faible": "..." }
      },
      "need": {
        "label": "Need",
        "description": "Description du critère Besoin pour ce contexte",
        "questions": ["Question besoin 1", "Question besoin 2", "Question besoin 3"],
        "thresholds": { "fort": "...", "moyen": "...", "faible": "..." }
      },
      "timeline": {
        "label": "Timeline",
        "description": "Description du critère Timeline pour ce cycle de vente",
        "questions": ["Question timeline 1", "Question timeline 2", "Question timeline 3"],
        "thresholds": { "fort": "...", "moyen": "...", "faible": "..." }
      }
    },
    "prospects": [
      {
        "name": "Prénom Nom — Profil type idéal",
        "company": "Nom entreprise type",
        "sector": "Secteur spécifique",
        "notes": "Note contextuelle sur ce type de prospect",
        "nextAction": "Prochaine action recommandée",
        "scores": { "budget": 4, "authority": 5, "need": 5, "timeline": 4 },
        "status": "chaud"
      },
      {
        "name": "Prénom Nom — Profil type tiède",
        "company": "Nom entreprise type",
        "sector": "Secteur",
        "notes": "Note contextuelle",
        "nextAction": "Prochaine action",
        "scores": { "budget": 3, "authority": 2, "need": 4, "timeline": 2 },
        "status": "tiede"
      },
      {
        "name": "Prénom Nom — Profil type froid",
        "company": "Nom entreprise type",
        "sector": "Secteur",
        "notes": "Note contextuelle",
        "nextAction": "Prochaine action",
        "scores": { "budget": 2, "authority": 3, "need": 2, "timeline": 1 },
        "status": "froid"
      }
    ]
  },

  "spin": {
    "description": "Description de l'approche SPIN Selling adaptée à ce type de vente",
    "situation": {
      "objectif": "Objectif des questions Situation dans ce contexte de vente",
      "questions": [
        { "question": "Question Situation 1 contextuelle et spécifique", "objectif": "Objectif de cette question", "conseil": "Conseil d'utilisation pratique" },
        { "question": "Question Situation 2", "objectif": "Objectif", "conseil": "Conseil" },
        { "question": "Question Situation 3", "objectif": "Objectif", "conseil": "Conseil" },
        { "question": "Question Situation 4", "objectif": "Objectif", "conseil": "Conseil" }
      ]
    },
    "probleme": {
      "objectif": "Objectif des questions Problème dans ce contexte",
      "questions": [
        { "question": "Question Problème 1 spécifique au secteur", "objectif": "Objectif", "conseil": "Conseil" },
        { "question": "Question Problème 2", "objectif": "Objectif", "conseil": "Conseil" },
        { "question": "Question Problème 3", "objectif": "Objectif", "conseil": "Conseil" },
        { "question": "Question Problème 4", "objectif": "Objectif", "conseil": "Conseil" }
      ]
    },
    "implication": {
      "objectif": "Objectif des questions Implication",
      "questions": [
        { "question": "Question Implication 1 — amplifier l'impact du problème", "objectif": "Objectif", "conseil": "Conseil" },
        { "question": "Question Implication 2", "objectif": "Objectif", "conseil": "Conseil" },
        { "question": "Question Implication 3", "objectif": "Objectif", "conseil": "Conseil" },
        { "question": "Question Implication 4", "objectif": "Objectif", "conseil": "Conseil" }
      ]
    },
    "needPayoff": {
      "objectif": "Objectif des questions Need-Payoff (faire exprimer la valeur)",
      "questions": [
        { "question": "Question Need-Payoff 1 — faire exprimer les bénéfices", "objectif": "Objectif", "conseil": "Conseil" },
        { "question": "Question Need-Payoff 2", "objectif": "Objectif", "conseil": "Conseil" },
        { "question": "Question Need-Payoff 3", "objectif": "Objectif", "conseil": "Conseil" },
        { "question": "Question Need-Payoff 4", "objectif": "Objectif", "conseil": "Conseil" }
      ]
    }
  }
}

RÈGLES CRITIQUES :
- Le funnel AIDA doit avoir des volumes RÉALISTES et cohérents (chaque étape < étape précédente)
- Les taux de conversion doivent être réalistes pour le secteur décrit (B2B long cycle ≠ B2C e-commerce)
- Les questions SPIN doivent être SPÉCIFIQUES au produit/service/secteur décrit — évite le générique
- Les prospects types doivent avoir des noms/entreprises/secteurs cohérents avec le contexte
- Les scores BANT des prospects doivent être variés (1 chaud, 1 tiède, 1 froid)
- Les status doivent correspondre aux scores : chaud (avg ≥3.5), tiede (avg 2.5-3.4), froid (avg <2.5)
- Toutes les actions et KPIs AIDA doivent être opérationnels et mesurables
- Les seuils BANT doivent être précis avec des valeurs concrètes adaptées au contexte`

    const response = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    })

    const rawText = response.content.filter(b => b.type === 'text').map(b => b.text).join('')

    let result
    try {
      const match = rawText.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('Pas de JSON dans la réponse')
      result = JSON.parse(match[0])
    } catch {
      return Response.json({ error: 'Erreur lors de la génération — veuillez réessayer' }, { status: 500 })
    }

    // ── Inject unique IDs ──────────────────────────────────────────────────────
    if (result.aida?.stages) {
      result.aida.stages = result.aida.stages.map(s => ({ ...s, id: uid() }))
    }
    if (result.bant?.prospects) {
      result.bant.prospects = result.bant.prospects.map(p => ({
        ...p,
        id: uid(),
        // Recalculate status from scores to ensure consistency
        status: (() => {
          const scores = p.scores || {}
          const vals   = Object.values(scores).filter(v => typeof v === 'number')
          const avg    = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
          return avg >= 3.5 ? 'chaud' : avg >= 2.5 ? 'tiede' : 'froid'
        })(),
      }))
    }

    // ── Inject IDs into SPIN questions ────────────────────────────────────────
    for (const cat of ['situation', 'probleme', 'implication', 'needPayoff']) {
      if (result.spin?.[cat]?.questions) {
        result.spin[cat].questions = result.spin[cat].questions.map(q => ({ ...q, id: uid() }))
      }
    }

    return Response.json({ success: true, result })

  } catch (err) {
    console.error('Sales generate error:', err)
    return Response.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}