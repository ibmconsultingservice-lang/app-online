import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const PLATFORM_GUIDES = {
  linkedin: 'LinkedIn: Hook fort (1-2 lignes) → Corps aéré (3-5 blocs courts) → CTA → 3-5 hashtags professionnels. Max 3000 caractères. Emojis discrets.',
  instagram: 'Instagram: Caption émotionnelle → storytelling → CTA fort → 20-30 hashtags variés. Max 2200 caractères. Emojis généreux.',
  tiktok: 'TikTok: Script vidéo structuré en scènes (Scène 1: hook 3s, Scène 2-4: contenu, Scène finale: CTA). Ton conversationnel et dynamique.',
  twitter: 'Twitter/X: Thread ou tweet unique. Punch en 280 caractères. Hook immédiat. 2-3 hashtags max.',
  facebook: 'Facebook: Texte narratif, storytelling, question engageante en fin. 1-3 hashtags. Emojis modérés.',
}

export async function POST(req) {
  try {
    const { action, form, script, finalPost } = await req.json()

    if (action === 'analyse') {
      const message = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: `Tu es un expert en stratégie de contenu social media.

Analyse ce brief et génère une stratégie de contenu:
- Thème: ${form.theme}
- Audience: ${form.audience}
- Plateforme: ${form.platform}
- Ton souhaité: ${form.tone}
- Lien: ${form.link || 'Aucun'}
- Instructions: ${form.extra || 'Aucune'}

Guide plateforme: ${PLATFORM_GUIDES[form.platform] || ''}

Réponds UNIQUEMENT en JSON valide sans backticks:
{
  "method": "Méthode recommandée (ex: AIDA, PAS, Storytelling) avec explication courte",
  "keywords": ["mot-clé 1", "mot-clé 2", "mot-clé 3", "mot-clé 4", "mot-clé 5"],
  "painPoints": ["point douleur 1 de l'audience", "point douleur 2", "point douleur 3"],
  "hookAngle": "L'angle d'accroche recommandé en une phrase percutante",
  "tone": "Description précise du ton à adopter"
}`
        }]
      })

      const raw = message.content[0]?.text?.trim() || ''
      const clean = raw.replace(/```json|```/g, '').trim()
      const strategy = JSON.parse(clean)
      return NextResponse.json({ strategy })
    }

    if (action === 'script') {
      const platformGuide = PLATFORM_GUIDES[form.platform] || ''
      const isTikTok = form.platform === 'tiktok'

      const message = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2500,
        messages: [{
          role: 'user',
          content: `Tu es un copywriter expert pour ${form.platform}.

Brief:
- Thème: ${form.theme}
- Audience: ${form.audience}
- Ton: ${form.tone}
- Lien: ${form.link || 'Aucun'}
- Instructions: ${form.extra || 'Aucune'}
- Guide: ${platformGuide}

${isTikTok ? `Génère un script vidéo TikTok/Reels structuré avec sections Scène 1 (Hook 3s), Scène 2-3 (Développement), Scène Finale (CTA). Inclus une suggestion musicale.` : `Génère le script structuré selon les meilleures pratiques ${form.platform}.`}

Réponds UNIQUEMENT en JSON valide sans backticks:
{
  "sections": [
    { "title": "Nom de la section (ex: Hook, Corps, CTA)", "content": "Contenu de la section" },
    { "title": "Section 2", "content": "..." }
  ]${isTikTok ? ',\n  "music": "Suggestion de musique tendance"' : ''}
}`
        }]
      })

      const raw = message.content[0]?.text?.trim() || ''
      const clean = raw.replace(/```json|```/g, '').trim()
      const scriptData = JSON.parse(clean)
      return NextResponse.json({ script: scriptData })
    }

    if (action === 'finalise') {
      const scriptText = script?.sections?.map(s => `${s.title}:\n${s.content}`).join('\n\n') || ''

      const message = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2500,
        messages: [{
          role: 'user',
          content: `Tu es un expert en publication social media.

Transforme ce script en post final optimisé pour ${form.platform}:

SCRIPT:
${scriptText}

BRIEF:
- Audience: ${form.audience}
- Ton: ${form.tone}
- Plateforme: ${form.platform}
- Lien: ${form.link || ''}
- Guide: ${PLATFORM_GUIDES[form.platform] || ''}

Génère:
1. Le post final complet avec emojis optimisés (prêt à copier-coller)
2. Les hashtags séparément (10-25 hashtags selon la plateforme)
3. 3 créneaux horaires de publication basés sur l'audience ${form.audience} sur ${form.platform}

Réponds UNIQUEMENT en JSON valide sans backticks:
{
  "post": "Le post final complet avec emojis, sauts de ligne naturels, et sans les hashtags",
  "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3"],
  "schedule": [
    { "day": "Mardi", "time": "08h30", "reason": "Raison basée sur l'audience" },
    { "day": "Mercredi", "time": "12h00", "reason": "Raison courte" },
    { "day": "Jeudi", "time": "17h30", "reason": "Raison courte" }
  ]
}`
        }]
      })

      const raw = message.content[0]?.text?.trim() || ''
      const clean = raw.replace(/```json|```/g, '').trim()
      const result = JSON.parse(clean)
      return NextResponse.json({
        post: result.post,
        hashtags: result.hashtags || [],
        schedule: result.schedule || [],
      })
    }

    return NextResponse.json({ error: 'Action invalide' }, { status: 400 })

  } catch (err) {
    console.error('[generer-post]', err)
    return NextResponse.json({ error: err.message || 'Erreur interne' }, { status: 500 })
  }
}