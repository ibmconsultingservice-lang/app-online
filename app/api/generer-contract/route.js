import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const CONTRACT_LABELS = {
  cdi:         'Contrat de Travail à Durée Indéterminée (CDI)',
  cdd:         'Contrat de Travail à Durée Déterminée (CDD)',
  bail_hab:    'Contrat de Bail d\'Habitation',
  bail_com:    'Bail Commercial (OHADA)',
  vente:       'Contrat de Vente',
  prestation:  'Contrat de Prestation de Services',
  stage:       'Convention de Stage',
  nda:         'Accord de Confidentialité (NDA)',
  pret:        'Contrat de Prêt / Reconnaissance de Dette',
  decharge:    'Décharge de Responsabilité',
  partenariat: 'Contrat de Partenariat',
  mandat:      'Contrat de Mandat (Procuration)',
}

const LEGAL_CONTEXT = {
  cdi:         'Droit du travail sénégalais (Code du Travail), mention de la convention collective applicable si précisée.',
  cdd:         'Droit du travail sénégalais, motif légal du CDD obligatoire, durée maximale légale à préciser.',
  bail_hab:    'Loi sénégalaise sur les baux d\'habitation, mention du dépôt de garantie et état des lieux.',
  bail_com:    'Acte Uniforme OHADA sur les baux commerciaux, droit au renouvellement, pas de déspécialisation.',
  vente:       'Code des Obligations Civiles et Commerciales du Sénégal (COCC), garantie légale et transfert de propriété.',
  prestation:  'COCC, obligations de moyens vs résultat, propriété intellectuelle si applicable.',
  stage:       'Loi sénégalaise sur les stages en entreprise, gratification si durée > 3 mois.',
  nda:         'Protection des informations confidentielles, durée de l\'obligation de confidentialité.',
  pret:        'COCC, taux d\'intérêt légal au Sénégal, reconnaissance de dette valable comme titre exécutoire.',
  decharge:    'Limites légales des clauses d\'exonération de responsabilité, dommages corporels exclus.',
  partenariat: 'COCC, distinction avec le contrat de société, pas de personnalité morale commune.',
  mandat:      'COCC art. 413 et suivants, étendue et limites du mandat, obligations du mandataire.',
}

export async function POST(request) {
  try {
    const { prompt, contractType } = await request.json()

    if (!prompt?.trim()) {
      return Response.json({ error: 'Prompt manquant.' }, { status: 400 })
    }

    const label   = CONTRACT_LABELS[contractType]  || 'Contrat Général'
    const context = LEGAL_CONTEXT[contractType]    || 'Droit civil sénégalais applicable.'

    const systemPrompt = `Tu es un juriste expert en droit sénégalais et OHADA, spécialisé dans la rédaction de contrats professionnels.
Tu dois rédiger un "${label}" complet et juridiquement solide en français, basé sur la description fournie.

Contexte juridique applicable : ${context}

IMPORTANT : Réponds UNIQUEMENT avec un objet JSON valide. Aucun markdown, aucun backtick, aucun texte avant ou après.

Structure JSON exacte à retourner :
{
  "contract": {
    "title": "Titre officiel du contrat en majuscules",
    "city": "Ville de signature",
    "date": "Date au format : Dakar, le [date]",
    "partyAName": "Nom complet ou raison sociale de la Partie A",
    "partyATitle": "Qualité ou fonction de la Partie A",
    "partyAAddress": "Adresse complète de la Partie A",
    "partyBName": "Nom complet ou raison sociale de la Partie B",
    "partyBTitle": "Qualité ou fonction de la Partie B",
    "partyBAddress": "Adresse complète de la Partie B",
    "objet": "Description précise et juridiquement formelle de l'objet du contrat (2-3 paragraphes)",
    "duree": "Durée, date d'entrée en vigueur, période d'essai ou de préavis si applicable (2-3 paragraphes)",
    "clauses": "Obligations détaillées de chaque partie, droits et devoirs réciproques — minimum 4 clauses numérotées séparées par des sauts de ligne \\n\\n",
    "specifics": "Dispositions spécifiques au type de contrat : rémunération/loyer/prix, modalités de paiement, conditions particulières, clauses de confidentialité si applicable — minimum 3 clauses numérotées",
    "resiliation": "Modalités et motifs de résiliation, préavis requis, indemnités éventuelles, force majeure (2-3 paragraphes)",
    "litiges": "Juridiction compétente (tribunaux de Dakar sauf indication contraire), droit applicable, recours à la médiation ou arbitrage CCJA/CCIAMA si souhaité",
    "signatureA": "Prénom Nom, Qualité — Partie A",
    "signatureB": "Prénom Nom, Qualité — Partie B",
    "signatureCity": "Ville",
    "signatureDate": "Date complète"
  }
}

Règles rédactionnelles :
- Utilise un langage juridique formel mais lisible
- Les clauses doivent être numérotées avec des sauts de ligne entre elles
- Inclus des placeholders entre crochets [comme ceci] pour les informations non précisées
- Le contenu doit être substantiel : pas de clauses vides ou génériques
- Adapte scrupuleusement le contenu au type de contrat "${label}" et au contexte juridique sénégalais/OHADA
- Pour les montants, utilise FCFA comme devise par défaut si non précisé`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2500,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Rédige un ${label} avec les informations suivantes : ${prompt}`
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
      console.error('JSON parse error. Raw:', rawText)
      return Response.json({ error: 'Réponse IA invalide. Veuillez réessayer.' }, { status: 500 })
    }

    if (!parsed.contract) {
      return Response.json({ error: 'Structure de réponse incorrecte.' }, { status: 500 })
    }

    return Response.json({ contract: parsed.contract })

  } catch (err) {
    console.error('Contract generation error:', err)
    return Response.json({ error: 'Erreur interne du serveur.' }, { status: 500 })
  }
}