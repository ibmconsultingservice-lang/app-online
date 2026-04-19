import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

// ── Parse CSV to readable text ──────────────────────────────────
function parseCSV(text) {
  const lines = text.split('\n').filter(l => l.trim())
  return lines.slice(0, 50).map(l => l.replace(/,/g, ' | ')).join('\n')
}

export async function POST(request) {
  try {
    const formData  = await request.formData()
    const file      = formData.get('file')
    const manualData = formData.get('manualData') || ''
    const variablesRaw = formData.get('variables') || '{}'

    let variables = {}
    try { variables = JSON.parse(variablesRaw) } catch {}

    let financialDataText = ''

    // ── Read file if provided ──────────────────────────────────
    if (file && file.size > 0) {
      const fileName = file.name.toLowerCase()

      if (fileName.endsWith('.csv')) {
        const text = await file.text()
        financialDataText = `Fichier CSV importé :\n${parseCSV(text)}`
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        // For Excel files: read as base64 and pass to Claude as binary reference
        // Since we can't parse Excel server-side without a library,
        // we extract what we can and let Claude work with the context
        const arrayBuffer = await file.arrayBuffer()
        const bytes = new Uint8Array(arrayBuffer)

        // Extract readable strings from the binary (basic approach)
        let extractedText = ''
        let currentStr = ''
        for (let i = 0; i < Math.min(bytes.length, 50000); i++) {
          const c = bytes[i]
          if (c >= 32 && c < 127) {
            currentStr += String.fromCharCode(c)
          } else {
            if (currentStr.length > 3) {
              extractedText += currentStr + ' '
            }
            currentStr = ''
          }
        }
        financialDataText = `Fichier Excel importé (${file.name}) - Contenu extrait :\n${extractedText.slice(0, 3000)}`
      }
    }

    // ── Combine data sources ───────────────────────────────────
    const allData = [
      financialDataText ? financialDataText : '',
      manualData ? `\nDonnées saisies manuellement :\n${manualData}` : ''
    ].filter(Boolean).join('\n\n')

    if (!allData.trim()) {
      return Response.json({ error: 'Aucune donnée financière fournie.' }, { status: 400 })
    }

    const systemPrompt = `Tu es un analyste financier expert de niveau CFO, spécialisé dans les PME africaines et sénégalaises.
Tu analyses des données financières brutes et génères un rapport d'analyse complet, structuré et exploitable.

VARIABLES D'ANALYSE FOURNIES PAR L'UTILISATEUR :
- Taux de croissance attendu : ${variables.growthRate || 10}%
- Réduction des coûts opérationnels : ${variables.costReduction || 5}%
- Taux d'imposition (IS) : ${variables.taxRate || 30}%
- Taux d'actualisation (WACC) : ${variables.discountRate || 10}%
- Taux d'inflation : ${variables.inflationRate || 3}%

IMPORTANT : Réponds UNIQUEMENT avec un objet JSON valide. Aucun markdown, aucun texte avant ou après.

Structure JSON exacte à retourner :
{
  "analysis": {
    "companyName": "Nom de l'entreprise ou 'Analyse Financière' si non précisé",
    "reportDate": "Date du rapport en format français long",
    "healthScore": 65,
    "summary": "Synthèse exécutive de 3-5 phrases couvrant la situation financière globale, les points forts, les points de vigilance et la recommandation principale",
    
    "kpis": {
      "revenue": "Chiffre d'affaires formaté (ex: 45,5M FCFA)",
      "revenueTrend": 12,
      "netMargin": "Marge nette formatée (ex: 14,3%)",
      "netMarginTrend": 2,
      "ebitda": "EBITDA formaté (ex: 8,2M FCFA)",
      "ebitdaTrend": 8,
      "bfr": "BFR en jours (ex: 42 jours)",
      "bfrTrend": -5
    },
    
    "revenueChart": [
      { "label": "T1", "value": 11000000 },
      { "label": "T2", "value": 12500000 },
      { "label": "T3", "value": 10800000 },
      { "label": "T4", "value": 11200000 }
    ],
    
    "marginChart": [
      { "label": "Brute", "value": 29 },
      { "label": "Opéra.", "value": 18 },
      { "label": "Nette", "value": 14 },
      { "label": "EBITDA", "value": 22 }
    ],
    
    "performance": [
      {
        "metric": "Ratio de Liquidité Générale",
        "description": "Actifs courants / Passifs courants",
        "value": "1.8x",
        "status": "good"
      },
      {
        "metric": "Rentabilité des Capitaux (ROE)",
        "description": "Résultat net / Capitaux propres",
        "value": "18,4%",
        "status": "good"
      },
      {
        "metric": "Taux d'Endettement",
        "description": "Dettes financières / EBITDA",
        "value": "2.1x",
        "status": "warning"
      },
      {
        "metric": "Délai de Recouvrement Clients",
        "description": "Créances clients / CA × 365",
        "value": "38 jours",
        "status": "good"
      },
      {
        "metric": "Couverture des Intérêts",
        "description": "EBIT / Charges financières",
        "value": "4.2x",
        "status": "good"
      },
      {
        "metric": "Rotation des Stocks",
        "description": "CA / Stocks moyens",
        "value": "6.8x",
        "status": "good"
      }
    ],
    
    "alerts": [
      {
        "type": "warning",
        "message": "Message d'alerte basé sur les données réelles"
      },
      {
        "type": "info",
        "message": "Information importante sur la structure financière"
      }
    ],
    
    "recommendations": [
      "Recommandation stratégique 1 avec action concrète",
      "Recommandation stratégique 2 avec action concrète",
      "Recommandation stratégique 3 avec action concrète",
      "Recommandation stratégique 4 avec action concrète"
    ],
    
    "projections": [
      {
        "label": "Chiffre d'Affaires",
        "values": ["47,7M FCFA", "50,6M FCFA", "53,6M FCFA"]
      },
      {
        "label": "Résultat Net",
        "values": ["6,4M FCFA", "7,2M FCFA", "8,1M FCFA"]
      },
      {
        "label": "EBITDA",
        "values": ["9,1M FCFA", "10,3M FCFA", "11,5M FCFA"]
      },
      {
        "label": "Marge Nette",
        "values": ["13,4%", "14,2%", "15,1%"]
      },
      {
        "label": "Free Cash Flow",
        "values": ["4,2M FCFA", "5,1M FCFA", "6,3M FCFA"]
      }
    ],
    
    "projectionChart": [
      { "label": "An 1", "value": 6400000 },
      { "label": "An 2", "value": 7200000 },
      { "label": "An 3", "value": 8100000 }
    ]
  }
}

Règles importantes :
- Analyse PRÉCISÉMENT les données fournies — ne génère pas de chiffres inventés sans base
- Si les données sont insuffisantes pour calculer un ratio, mets une valeur estimée avec [est.] en suffixe
- Le healthScore (0-100) doit refléter objectivement la santé financière : >70 = sain, 40-70 = vigilance, <40 = critique
- Les projections doivent intégrer les variables fournies par l'utilisateur (taux de croissance, réduction coûts, IS)
- Les montants en FCFA doivent être formatés (ex: 45,2M FCFA ou 450 000 FCFA)
- Les alertes doivent être pertinentes et basées sur les données réelles
- Les recommandations doivent être actionnables et adaptées au contexte africain/sénégalais`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2500,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Analyse ces données financières et génère le rapport complet :\n\n${allData}`
        }
      ]
    })

    const rawText = message.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('')

    const clean = rawText
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/gi, '')
      .trim()

    let parsed
    try {
      parsed = JSON.parse(clean)
    } catch {
      console.error('JSON parse error. Raw response:', rawText.slice(0, 500))
      return Response.json({ error: 'Réponse IA invalide. Réessayez.' }, { status: 500 })
    }

    if (!parsed.analysis) {
      return Response.json({ error: 'Structure de réponse incorrecte.' }, { status: 500 })
    }

    return Response.json({ analysis: parsed.analysis })

  } catch (err) {
    console.error('FinanceAI generation error:', err)
    return Response.json({ error: 'Erreur interne du serveur.' }, { status: 500 })
  }
}
