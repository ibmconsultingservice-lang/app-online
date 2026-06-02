import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(request) {
  try {
    const { rows, columns, fileName, language, userPrompt } = await request.json()

    if (!rows || !columns) {
      return Response.json({ error: 'Données manquantes (rows/columns).' }, { status: 400 })
    }

    // ── Build structured data preview ──────────────────────────────────────
    const dataPreview = `
Fichier : ${fileName || 'données.csv'}
Colonnes (${columns.length}) : ${columns.join(', ')}
Aperçu des 10 premières lignes :
${rows.map((row, i) => `  Ligne ${i + 1}: ${JSON.stringify(row)}`).join('\n')}
    `.trim()

    // ── Language-specific instructions ─────────────────────────────────────
    const langInstructions = {
      python: `
Tu es un expert data analyst Python (pandas, numpy, matplotlib, seaborn, plotly).
Génère une analyse complète avec du vrai code Python exécutable.
Pour CHAQUE analyse, structure-la EXACTEMENT ainsi :

### TITRE: [Nom de l'analyse]
### OBJECTIF: [Ce que cette analyse cherche à découvrir]
### DÉMARCHE: [Explication de l'approche méthodologique]
### CODE:
\`\`\`python
# [Code Python complet et exécutable]
\`\`\`
---

Génère minimum 4 analyses distinctes couvrant : exploration des données, statistiques descriptives, visualisations, et insights métier.

À la fin, ajoute une section :
### GUIDE D'INSTALLATION:
Liste les bibliothèques pip à installer et leur version recommandée.
      `,
      sql: `
Tu es un expert data analyst SQL (compatible PostgreSQL, MySQL, SQLite).
Génère une analyse complète avec du vrai code SQL exécutable.
Suppose que le fichier est chargé dans une table nommée \`data_table\`.
Pour CHAQUE analyse, structure-la EXACTEMENT ainsi :

### TITRE: [Nom de l'analyse]
### OBJECTIF: [Ce que cette analyse cherche à découvrir]
### DÉMARCHE: [Explication de l'approche méthodologique]
### CODE:
\`\`\`sql
-- [Code SQL complet et exécutable]
\`\`\`
---

Génère minimum 4 analyses distinctes couvrant : exploration de schéma, agrégations, jointures potentielles, et requêtes analytiques avancées.

À la fin, ajoute une section :
### GUIDE D'INSTALLATION:
Liste les SGBD compatibles, outils recommandés (DBeaver, pgAdmin, etc.) et comment importer le fichier CSV.
      `,
      dax: `
Tu es un expert data analyst DAX (Power BI, Excel Power Pivot).
Génère une analyse complète avec du vrai code DAX exécutable.
Pour CHAQUE analyse, structure-la EXACTEMENT ainsi :

### TITRE: [Nom de l'analyse]
### OBJECTIF: [Ce que cette analyse cherche à découvrir]
### DÉMARCHE: [Explication de l'approche méthodologique]
### CODE:
\`\`\`dax
-- [Mesure ou colonne calculée DAX complète]
\`\`\`
---

Génère minimum 4 analyses distinctes couvrant : mesures de base, KPIs, analyses temporelles si applicable, et mesures avancées avec CALCULATE/FILTER.

À la fin, ajoute une section :
### GUIDE D'INSTALLATION:
Explique comment importer le fichier dans Power BI Desktop, créer le modèle de données et utiliser les mesures DAX.
      `,
    }

    const systemPrompt = langInstructions[language] || langInstructions.python

    const userMessage = userPrompt?.trim()
      ? `Voici les données à analyser :\n\n${dataPreview}\n\nDemande spécifique de l'utilisateur : ${userPrompt}\n\nGénère l'analyse en respectant exactement la structure demandée.`
      : `Voici les données à analyser :\n\n${dataPreview}\n\nGénère une analyse complète et pertinente en respectant exactement la structure demandée. Identifie les patterns, anomalies et insights les plus importants.`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })

    const result = response.content[0]?.text || ''

    return Response.json({ result, language })

  } catch (err) {
    console.error('[DataAnalysis API]', err)
    return Response.json(
      { error: err.message || 'Erreur lors de la génération.' },
      { status: 500 }
    )
  }
}
