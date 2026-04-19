import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request) {
  try {
    const body = await request.json()
    const { description, dataPreview, fileName, dashboardType, colorTheme, language } = body

    const systemPrompt = `Tu es un expert en développement de dashboards HTML/CSS/JavaScript et en analyse de données financières.
Tu génères des fichiers HTML autonomes, complets et professionnels qui fonctionnent en double-cliquant dessus.
RÈGLE ABSOLUE : Tu réponds UNIQUEMENT avec le code HTML complet. Aucun texte avant ou après. Pas de markdown. Pas de backticks.`

    const userPrompt = `Génère un fichier HTML autonome complet pour un dashboard de type "${dashboardType || 'Finance Analyser'}".

DESCRIPTION DU PROJET :
${description}

${dataPreview ? `APERÇU DES DONNÉES FOURNIES (premières lignes) :
${dataPreview}

Analyse ces données pour détecter automatiquement :
- Les colonnes clés (Date, Montant, Catégorie, Libellé, etc.)
- Le format des dates
- La devise utilisée
- Le type de données (finances personnelles, TPE, trading, RH, ventes, etc.)` : ''}

FICHIER SOURCE : ${fileName || 'Aucun fichier fourni - crée un dashboard avec données de démonstration'}

EXIGENCES TECHNIQUES OBLIGATOIRES :
1. Fichier HTML UNIQUE et autonome (tout inclus : CSS + JS)
2. CDN autorisés UNIQUEMENT : Chart.js, PapaParse, Tailwind CSS, lucide-icons
3. Zone d'upload CSV/Excel/JSON visible et fonctionnelle
4. Traitement 100% local dans le navigateur (zéro serveur)
5. Langue de l'interface : ${language || 'Français'}
6. Thème : ${colorTheme || 'dark'} professionnel style Fintech

COMPOSANTS OBLIGATOIRES DU DASHBOARD :
- Header avec titre, date et bouton d'export PNG/PDF
- 4 cartes KPI animées (valeurs clés selon le type de données)
- 2 graphiques Chart.js minimum (évolution temporelle + répartition)
- Tableau de données avec recherche et pagination
- Section "Analyse IA" avec insights automatiques et détection d'anomalies
- Fonction prédictive simple basée sur les tendances des données
- Bouton "Rafraîchir l'analyse" qui recalcule tout

STYLE DESIGN :
- Thème ${colorTheme === 'light' ? 'clair et épuré style SaaS moderne' : 'sombre #0f172a style Fintech premium'}
- Animations CSS smooth sur les KPI cards
- Graphiques colorés avec gradients
- Responsive mobile/desktop
- Police Inter ou system-ui

Si aucune donnée n'est fournie, génère des données de démonstration réalistes et cohérentes avec le type de dashboard demandé.

COMMENCE DIRECTEMENT PAR <!DOCTYPE html>`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    })

    let html = message.content[0].text.trim()

    // Strip any accidental markdown
    html = html.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim()

    if (!html.toLowerCase().startsWith('<!doctype html') && !html.toLowerCase().startsWith('<html')) {
      throw new Error('La génération n\'a pas produit un fichier HTML valide')
    }

    return NextResponse.json({ html, fileName: `dashboard-${Date.now()}.html` })

  } catch (error) {
    console.error('DashboardAI error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}