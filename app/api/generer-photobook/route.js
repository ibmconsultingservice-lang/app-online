import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

// ── Layout templates selon nb de photos par page ──────────────────
const LAYOUT_TYPES = {
  cover:        'cover',        // Page couverture pleine
  full:         'full',         // 1 photo pleine page
  duo_h:        'duo_h',        // 2 photos côte à côte (horizontal)
  duo_v:        'duo_v',        // 2 photos empilées (vertical)
  trio_left:    'trio_left',    // 1 grande à gauche + 2 petites à droite
  trio_right:   'trio_right',   // 2 petites à gauche + 1 grande à droite
  quad:         'quad',         // 4 photos en grille 2x2
  mosaic_5:     'mosaic_5',     // 5 photos mosaïque (1 grande + 4 petites)
  text_spread:  'text_spread',  // Page texte/caption avec accent décoratif
  back:         'back',         // Page de dos / fin
}

// ── Styles visuels disponibles ────────────────────────────────────
const VISUAL_STYLES = {
  editorial:  { label: 'Éditorial', fonts: ['Playfair Display', 'DM Sans'],    accent: '#1a1a2e', bg: '#fafaf8', mood: 'luxueux et intemporel' },
  minimal:    { label: 'Minimaliste', fonts: ['Inter', 'Inter'],               accent: '#222',    bg: '#ffffff', mood: 'épuré et contemporain' },
  warm:       { label: 'Chaleureux', fonts: ['Cormorant Garamond', 'Nunito'], accent: '#8b4513', bg: '#fdf6ee', mood: 'intime et nostalgique' },
  bold:       { label: 'Audacieux', fonts: ['Bebas Neue', 'Roboto'],          accent: '#e63946', bg: '#f1f1f1', mood: 'dynamique et expressif' },
  nordic:     { label: 'Nordique', fonts: ['Raleway', 'Source Serif 4'],       accent: '#4a7c8e', bg: '#f5f5f0', mood: 'serein et naturel' },
  romantic:   { label: 'Romantique', fonts: ['Great Vibes', 'Lato'],          accent: '#c9758a', bg: '#fef9f9', mood: 'poétique et sentimental' },
}

// ── Algorithme d'attribution des layouts selon nb de photos ───────
function planLayouts(photoCount) {
  const layouts = []

  if (photoCount === 0) return layouts

  // Toujours une couverture
  layouts.push({ type: 'cover', photoIndices: [0] })

  let remaining = photoCount - 1
  let idx = 1

  while (remaining > 0) {
    if (remaining === 1) {
      layouts.push({ type: 'full', photoIndices: [idx] })
      idx += 1; remaining -= 1
    } else if (remaining === 2) {
      layouts.push({ type: 'duo_h', photoIndices: [idx, idx+1] })
      idx += 2; remaining -= 2
    } else if (remaining === 3) {
      layouts.push({ type: 'trio_left', photoIndices: [idx, idx+1, idx+2] })
      idx += 3; remaining -= 3
    } else if (remaining === 4) {
      layouts.push({ type: 'quad', photoIndices: [idx, idx+1, idx+2, idx+3] })
      idx += 4; remaining -= 4
    } else if (remaining === 5) {
      layouts.push({ type: 'mosaic_5', photoIndices: [idx, idx+1, idx+2, idx+3, idx+4] })
      idx += 5; remaining -= 5
    } else {
      // Varier les layouts pour les grandes collections
      const spread = Math.floor(Math.random() * 3)
      if (spread === 0 && remaining >= 5) {
        layouts.push({ type: 'mosaic_5', photoIndices: Array.from({length:5}, (_,i)=>idx+i) })
        idx += 5; remaining -= 5
      } else if (spread === 1 && remaining >= 4) {
        layouts.push({ type: 'quad', photoIndices: Array.from({length:4}, (_,i)=>idx+i) })
        idx += 4; remaining -= 4
      } else if (remaining >= 3) {
        // Alterner trio gauche/droite
        const t = layouts.length % 2 === 0 ? 'trio_left' : 'trio_right'
        layouts.push({ type: t, photoIndices: Array.from({length:3}, (_,i)=>idx+i) })
        idx += 3; remaining -= 3
      } else if (remaining >= 2) {
        layouts.push({ type: 'duo_h', photoIndices: [idx, idx+1] })
        idx += 2; remaining -= 2
      } else {
        layouts.push({ type: 'full', photoIndices: [idx] })
        idx += 1; remaining -= 1
      }
    }

    // Intercaler une page texte toutes les 4-5 spreads pour les grands livres
    if (photoCount > 8 && layouts.length % 5 === 0 && remaining > 2) {
      layouts.push({ type: 'text_spread', photoIndices: [] })
    }
  }

  // Toujours une page de fin
  layouts.push({ type: 'back', photoIndices: [] })

  return layouts
}

export async function POST(request) {
  try {
    const formData = await request.formData()

    // Récupérer les métadonnées
    const titre        = formData.get('titre')        || ''
    const evenement    = formData.get('evenement')    || ''
    const date         = formData.get('date')         || ''
    const ambiance     = formData.get('ambiance')     || ''
    const dedicace     = formData.get('dedicace')     || ''
    const styleChoisi  = formData.get('style')        || 'auto'

    // Récupérer et encoder les photos
    const photos = []
    let i = 0
    while (formData.get(`photo_${i}`)) {
      const file = formData.get(`photo_${i}`)
      const buffer = Buffer.from(await file.arrayBuffer())
      const base64 = buffer.toString('base64')
      const mediaType = file.type || 'image/jpeg'
      photos.push({ base64, mediaType, name: file.name })
      i++
    }

    if (photos.length === 0) {
      return Response.json({ error: 'Aucune photo fournie' }, { status: 400 })
    }

    // ── Étape 1 : Analyse des photos par Claude Vision ─────────────
    const visionContent = []

    // Ajouter max 10 photos pour l'analyse (toujours inclure la 1ère)
    const photosToAnalyze = photos.slice(0, Math.min(photos.length, 10))

    photosToAnalyze.forEach((photo, idx) => {
      visionContent.push({
        type: 'image',
        source: { type: 'base64', media_type: photo.mediaType, data: photo.base64 },
      })
      visionContent.push({
        type: 'text',
        text: `[Photo ${idx + 1}/${photos.length}]`,
      })
    })

    const contextInfo = [
      titre      && `Titre souhaité : "${titre}"`,
      evenement  && `Événement : ${evenement}`,
      date       && `Date : ${date}`,
      ambiance   && `Ambiance souhaitée : ${ambiance}`,
      dedicace   && `Dédicace : "${dedicace}"`,
    ].filter(Boolean).join('\n')

    visionContent.push({
      type: 'text',
      text: `Tu es un directeur artistique expert en livres photo éditoriaux.
Analyse ces ${photos.length} photo(s) et génère un design de PhotoBook complet.

${contextInfo ? `CONTEXTE FOURNI PAR L'UTILISATEUR:\n${contextInfo}\n` : ''}
STYLE VISUEL PRÉFÉRÉ: ${styleChoisi === 'auto' ? 'Choisis le plus adapté au contenu' : styleChoisi}

Réponds UNIQUEMENT en JSON valide avec cette structure exacte:

{
  "analyse": {
    "theme": "description du thème principal (ex: voyage en montagne, mariage, bébé, famille)",
    "ambiance": "description de l'ambiance (ex: nostalgique, joyeuse, romantique, aventureuse)",
    "couleursDominantes": ["#hex1", "#hex2", "#hex3"],
    "style": "un de: editorial|minimal|warm|bold|nordic|romantic",
    "saison": "printemps|été|automne|hiver|indéfini"
  },
  "livre": {
    "titre": "titre du livre poétique et percutant (max 6 mots)",
    "sousTitre": "sous-titre élégant (max 12 mots)",
    "dedicace": "dédicace courte et touchante (max 20 mots)",
    "palette": {
      "fond": "#hex",
      "accent": "#hex",
      "texte": "#hex",
      "texteSecondaire": "#hex",
      "couvertureFond": "#hex",
      "couvertureTexte": "#hex"
    },
    "typographie": {
      "titreFont": "nom exact Google Font pour titres",
      "corpsFont": "nom exact Google Font pour corps de texte"
    }
  },
  "pages": [
    {
      "type": "cover|full|duo_h|duo_v|trio_left|trio_right|quad|mosaic_5|text_spread|back",
      "photoIndices": [0, 1, ...],
      "titre": "titre de la page (optionnel)",
      "caption": "légende narrative courte et belle (max 20 mots)",
      "accent": "mot ou phrase décorative courte (max 3 mots)"
    }
  ]
}

RÈGLES POUR LES PAGES:
- Photo 0 = couverture obligatoire (type "cover")
- Utilise TOUS les indices de 0 à ${photos.length - 1}
- Varie les layouts selon l'impact visuel des photos
- Les photos de groupe → quad ou mosaic_5
- Les photos paysage → duo_h ou full  
- Les portraits → full ou trio_left/right
- Dernière page → type "back" sans photo
- Génère ${photos.length > 8 ? 'des pages text_spread entre les spreads' : 'pas de text_spread si moins de 8 photos'}
- Chaque caption doit être poétique, personnelle, narrative
- Total photos dans les pages = ${photos.length}`,
    })

    const analysisResponse = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: visionContent }],
    })

    // Parser le JSON de réponse
    let bookDesign
    try {
      const rawText = analysisResponse.content
        .filter(b => b.type === 'text')
        .map(b => b.text)
        .join('')
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('Pas de JSON trouvé dans la réponse')
      bookDesign = JSON.parse(jsonMatch[0])
    } catch (parseErr) {
      // Fallback si parsing échoue
      const fallbackLayouts = planLayouts(photos.length)
      bookDesign = {
        analyse: {
          theme: 'Souvenirs précieux',
          ambiance: 'Chaleureux et intime',
          couleursDominantes: ['#8b6914', '#d4a853', '#f5f0e8'],
          style: 'warm',
          saison: 'indéfini',
        },
        livre: {
          titre: titre || 'Ces moments qui durent',
          sousTitre: 'Un livre de souvenirs immortalisés',
          dedicace: dedicace || 'À ceux qui rendent chaque instant précieux.',
          palette: {
            fond: '#fdf6ee',
            accent: '#8b4513',
            texte: '#1a1008',
            texteSecondaire: '#6b4226',
            couvertureFond: '#1a1008',
            couvertureTexte: '#fdf6ee',
          },
          typographie: {
            titreFont: 'Cormorant Garamond',
            corpsFont: 'Nunito',
          },
        },
        pages: fallbackLayouts.map(l => ({
          ...l,
          titre: '',
          caption: 'Un moment gravé dans le temps.',
          accent: 'Souvenir',
        })),
      }
    }

    // S'assurer que les données photos sont incluses dans la réponse
    return Response.json({
      success: true,
      design: bookDesign,
      photos: photos.map(p => ({
        base64: p.base64,
        mediaType: p.mediaType,
        name: p.name,
      })),
      metadata: { titre, evenement, date, ambiance, dedicace, photoCount: photos.length },
    })

  } catch (err) {
    console.error('Erreur génération PhotoBook:', err)
    return Response.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}